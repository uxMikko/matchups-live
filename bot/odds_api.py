"""
Real bookmaker odds via The Odds API (the-odds-api.com), eventually
replacing the Elo-based placeholder in forecast._match_probs(). Budget is
fixed and small (500 credits for the whole tournament) - see odds_state.py
for the call-scheduling/credit-rationing logic; this module is just the
HTTP fetch and the odds-to-probability math.

1 credit per call here: cost = len(regions) * len(markets), and we always
request exactly one region ("eu") and one market ("h2h") - confirmed via a
real test call (32 events returned, 1 credit consumed).
"""
from __future__ import annotations
import logging
import os

import httpx

log = logging.getLogger("odds_api")

ODDS_API_KEY = os.getenv("ODDS_API_KEY", "")
ODDS_API_URL = "https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/"

# The Odds API's team names that differ from our internal ones (see
# scraper.ESPN_NAME for the equivalent ESPN-side mapping). Confirmed by
# diffing a real response's team names against engine.py's full 48-team
# list - these were the only two mismatches.
ODDS_API_NAME_FIXUP = {
    "Bosnia & Herzegovina": "Bosnia-Herzegovina",
    "Curaçao": "Curacao",
}


def _normalize(name: str) -> str:
    return ODDS_API_NAME_FIXUP.get(name, name)


def _int_or_none(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _implied_probs(home_espn: str, away_espn: str, bookmaker: dict) -> dict | None:
    """De-vigged implied win/draw/loss probabilities from one bookmaker's
    h2h market: invert each decimal price to a raw probability, then
    normalize so the three sum to 1 (removes the bookmaker's overround)."""
    market = next((m for m in bookmaker.get("markets", []) if m["key"] == "h2h"), None)
    if not market:
        return None
    prices = {o["name"]: o["price"] for o in market["outcomes"]}
    if home_espn not in prices or away_espn not in prices or "Draw" not in prices:
        return None
    raw = {k: 1 / v for k, v in prices.items()}
    total = sum(raw.values())
    return {
        "p_home": raw[home_espn] / total,
        "p_draw": raw["Draw"] / total,
        "p_away": raw[away_espn] / total,
    }


# The Odds API splits Unibet into separate per-country-license bookmaker
# keys even within one region; Betsson is a single key. Confirmed against
# The Odds API's own bookmaker documentation (not guessed) - if they add or
# rename a licensed entity this'll just silently stop matching it rather
# than break, since the .get(..., []) lookups below degrade gracefully.
TRACKED_BOOKMAKERS = {
    "unibet": {"unibet_fr", "unibet_it", "unibet_nl", "unibet_se", "unibet_uk", "unibet"},
    "betsson": {"betsson"},
}


def _decimal_prices(home_espn: str, away_espn: str, bookmaker: dict) -> dict | None:
    """Raw decimal h2h prices for one named bookmaker, unmodified (no
    de-vig) - this is what actually gets displayed next to that
    bookmaker's name, as opposed to _implied_probs' normalized figure
    which only feeds our own forecast math."""
    market = next((m for m in bookmaker.get("markets", []) if m["key"] == "h2h"), None)
    if not market:
        return None
    prices = {o["name"]: o["price"] for o in market["outcomes"]}
    if home_espn not in prices or away_espn not in prices or "Draw" not in prices:
        return None
    return {"home": prices[home_espn], "draw": prices["Draw"], "away": prices[away_espn]}


def _tracked_bookmaker_odds(home_espn: str, away_espn: str, bookmakers: list[dict]) -> dict:
    """{"unibet": {...}, "betsson": {...}} - only for whichever of the two
    actually priced this specific fixture (sparse: most matches won't have
    both, many will have neither until closer to kickoff)."""
    out = {}
    for label, keys in TRACKED_BOOKMAKERS.items():
        for bm in bookmakers:
            if bm.get("key") in keys:
                prices = _decimal_prices(home_espn, away_espn, bm)
                if prices:
                    out[label] = prices
                    break
    return out


async def fetch_odds() -> tuple[list[dict], dict]:
    """One call covers every live+upcoming event for the whole sport, so
    this never needs to be called per-match. Returns (matchups, meta):
      matchups: [{"home", "away", "p_home", "p_draw", "p_away",
        "bookmaker_odds"}, ...] with our internal team names. p_home/
        p_draw/p_away are de-vigged and averaged across every bookmaker
        the-odds-api returned, for our own forecast math. bookmaker_odds
        is the named-operator decimal prices for display (see
        _tracked_bookmaker_odds) - empty for most matches.
      meta: {"requests_remaining": int|None, "requests_used": int|None}
        parsed from response headers, for odds_state.py's credit ledger.
    """
    if not ODDS_API_KEY:
        log.warning("ODDS_API_KEY not set, skipping odds fetch")
        return [], {"requests_remaining": None, "requests_used": None}

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                ODDS_API_URL,
                params={
                    "apiKey": ODDS_API_KEY,
                    "regions": "eu",
                    "markets": "h2h",
                    "oddsFormat": "decimal",
                },
                timeout=15,
            )
            r.raise_for_status()
            events = r.json()
            meta = {
                "requests_remaining": _int_or_none(r.headers.get("x-requests-remaining")),
                "requests_used": _int_or_none(r.headers.get("x-requests-used")),
            }
    except Exception as e:
        # A failed call (network blip, budget exhausted, bad key) must not
        # crash the whole refresh cycle, and must not be mistaken by the
        # caller for a call that actually spent a credit.
        log.warning(f"Odds API call failed: {e}")
        return [], {"requests_remaining": None, "requests_used": None}

    matchups = []
    for event in events:
        home_espn, away_espn = event["home_team"], event["away_team"]
        bookmakers = event.get("bookmakers", [])
        per_bookmaker = []
        for bm in bookmakers:
            probs = _implied_probs(home_espn, away_espn, bm)
            if probs:
                per_bookmaker.append(probs)
        if not per_bookmaker:
            continue
        n = len(per_bookmaker)
        matchups.append({
            "home": _normalize(home_espn),
            "away": _normalize(away_espn),
            "p_home": sum(p["p_home"] for p in per_bookmaker) / n,
            "p_draw": sum(p["p_draw"] for p in per_bookmaker) / n,
            "p_away": sum(p["p_away"] for p in per_bookmaker) / n,
            # Sparse - {} for most matches until Unibet/Betsson actually
            # price that specific fixture. Same call, zero extra credits.
            "bookmaker_odds": _tracked_bookmaker_odds(home_espn, away_espn, bookmakers),
        })
    return matchups, meta
