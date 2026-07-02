"""
Manages the Odds API credit budget (500 for the whole tournament) and
decides, once per refresh.py cron cycle, whether this cycle is worth
spending one of those credits on. Persists everything needed for that
decision in Redis, since refresh.py itself is stateless across runs:

  odds:credits_remaining   int, mirrors the API's x-requests-remaining
                            header after the most recent call
  odds:matchups            {sorted "TeamA|TeamB" key: {home, away, p_home,
                            p_draw, p_away, fetched_at}} - the actual odds,
                            loaded into forecast.REAL_ODDS by refresh.py
  odds:snapshot            {match_key: {status, home_score, away_score,
                            red_home, red_away}} - last-seen state per
                            match, for diffing (goal/red-card/finish
                            detection across cron cycles)
  odds:last_schedule_date  "YYYY-MM-DD" - last date the once-per-day
                            schedule trigger fired

Trigger model (priority order, first match wins - at most one Odds API
call per cron cycle):
  1. post-match  - any match's status just flipped to "ft"
  2. schedule    - within SCHEDULE_LEAD_HOURS of the day's first remaining
                   kickoff, once per day
  3. red-card    - new red card on a still bracket-relevant live match
  4. goal        - new goal on a still bracket-relevant live match

Triggers 3-4 are skipped once spending a credit would dip below the
safety-valve reserve (see _reserve()) - schedule/post-match calls are
never skipped, since those are what keeps every fixture's odds from going
stale even if nothing else fires.
"""
from __future__ import annotations
import logging
from datetime import datetime, timedelta

import engine
import odds_api
import redis_client as rc
import scraper

log = logging.getLogger("odds_state")

INITIAL_CREDITS = 500
SCHEDULE_LEAD_HOURS = 2
SETTLED_LOW, SETTLED_HIGH = 0.001, 0.999

# Worst case, every remaining match needs its own post-match credit -
# 1.2 leaves a little headroom for schedule-trigger calls on top of that.
RESERVE_PER_REMAINING_MATCH = 1.2

# `matches`/`results` only ever cover the group stage (knockout-stage live
# scraping isn't built yet), so once the group stage is over there's no
# direct count of remaining knockout matches. Falls back to this flat
# worst-case total (R32 16 + R16 8 + QF 4 + SF 2 + 3rd/Final 2 = 32) rather
# than treating "0 known remaining" as "nothing left to protect credits
# for" - intentionally conservative, gets less precise (but never unsafe)
# as the knockout rounds progress.
TOTAL_KNOCKOUT_MATCHES = 32


def _match_key(home: str, away: str) -> str:
    return "|".join(sorted([home, away]))


async def load_tournament_probs() -> dict[str, float]:
    """{team_name: implied_tournament_win_probability} from the outrights market."""
    return await rc.redis_get("odds:tournament_probs") or {}


async def load_real_odds() -> dict[str, dict]:
    """{sorted-pair-key: {"home", "away", "p_home", "p_draw", "p_away",
    "fetched_at"}} for forecast.REAL_ODDS - reads straight from Redis, no
    API call."""
    return await rc.redis_get("odds:matchups") or {}


async def _get_credits_remaining() -> int:
    val = await rc.redis_get("odds:credits_remaining")
    return val if isinstance(val, int) else INITIAL_CREDITS


def _is_settled(prob: float) -> bool:
    return prob < SETTLED_LOW or prob > SETTLED_HIGH


def _bracket_relevant(m: dict, standings: dict) -> bool:
    """A group-stage match is worth a credit only if at least one of its
    teams' advance-to-R32 probability isn't already pinned near 0 or 1 -
    once both are settled, this specific result can't move the bracket.
    Matches with no "group" tag (knockout stage, once that's wired in) are
    always relevant: single-elimination has no dead rubbers."""
    group = m.get("group")
    if not group:
        return True
    rows = {r["name"]: r["prob"] for r in standings.get(group, [])}
    home_settled = _is_settled(rows.get(m["home"], 0.5))
    away_settled = _is_settled(rows.get(m["away"], 0.5))
    return not (home_settled and away_settled)


# Once a live match's own win probability is this lopsided (~5.0 decimal
# odds for the trailing side), another goal in the *same* match is unlikely
# to flip who wins it - not worth another credit just to refine an already
# one-sided in-play price. Doesn't apply to the schedule/post-match
# triggers, only to the discretionary goal/red-card ones.
MATCH_DECIDED_PROB = 0.80


def _match_already_decided(m: dict, real_odds: dict) -> bool:
    """True if we already have live odds for this match showing one side
    at/above MATCH_DECIDED_PROB. Falls back to "not decided" (so the goal
    still counts) if we don't have odds for this match yet at all - no
    odds means no basis to skip."""
    odds = real_odds.get(_match_key(m["home"], m["away"]))
    if not odds:
        return False
    return max(odds.get("p_home", 0), odds.get("p_away", 0)) >= MATCH_DECIDED_PROB


def _remaining_match_count(matches: list[dict], results: list[dict]) -> int:
    played = {(r["home"], r["away"]) for r in results}
    remaining_group = sum(1 for m in matches if (m["home"], m["away"]) not in played)
    return remaining_group if remaining_group > 0 else TOTAL_KNOCKOUT_MATCHES


def _reserve(matches: list[dict], results: list[dict]) -> float:
    return _remaining_match_count(matches, results) * RESERVE_PER_REMAINING_MATCH


def _build_snapshot(results: list[dict], live_matches: list[dict], red_cards: dict) -> dict:
    snap = {}
    for r in results:
        snap[_match_key(r["home"], r["away"])] = {
            "status": "ft",
            "home_score": r["home_score"], "away_score": r["away_score"],
            "red_home": 0, "red_away": 0,
        }
    for m in live_matches:
        rcounts = red_cards.get(m.get("event_id"), {"home": 0, "away": 0})
        snap[_match_key(m["home"], m["away"])] = {
            "status": m["status"],
            "home_score": m["home_score"], "away_score": m["away_score"],
            "red_home": rcounts.get("home", 0), "red_away": rcounts.get("away", 0),
        }
    return snap


def _detect_post_match(old: dict, new: dict) -> bool:
    return any(
        new_state["status"] == "ft" and old.get(key, {}).get("status") != "ft"
        for key, new_state in new.items()
    )


def _detect_goal_or_card(
    old: dict, new: dict, live_matches: list[dict], standings: dict, real_odds: dict
) -> tuple[bool, bool]:
    """(goal_happened, red_card_happened) - each only True if it happened
    on a still bracket-relevant match that also isn't already a near-lock
    per the live odds we already have (see _match_already_decided)."""
    by_pair = {_match_key(m["home"], m["away"]): m for m in live_matches}
    goal = red_card = False
    for key, new_state in new.items():
        if new_state["status"] not in ("live", "ht"):
            continue
        m = by_pair.get(key)
        if not m or not _bracket_relevant(m, standings) or _match_already_decided(m, real_odds):
            continue
        old_state = old.get(key, {})
        if (new_state["home_score"], new_state["away_score"]) != (
            old_state.get("home_score"), old_state.get("away_score"),
        ):
            goal = True
        if (new_state["red_home"], new_state["red_away"]) != (
            old_state.get("red_home", 0), old_state.get("red_away", 0),
        ):
            red_card = True
    return goal, red_card


async def _schedule_trigger_due(matches: list[dict], results: list[dict], now: datetime) -> bool:
    """Fires once per calendar date, as soon as we're within
    SCHEDULE_LEAD_HOURS of that date's first not-yet-finished kickoff.
    When no group stage matches remain (knockout stage) still fires once
    per day so knockout round odds stay fresh."""
    played = {(r["home"], r["away"]) for r in results}
    upcoming = [m for m in matches if (m["home"], m["away"]) not in played]

    if not upcoming:
        # Group stage complete: refresh once per day for knockout odds.
        today = now.date().isoformat()
        last_date = await rc.redis_get("odds:last_schedule_date")
        return last_date != today

    kickoffs = [
        datetime.strptime(m["dt"], "%Y-%m-%d %H:%M").replace(tzinfo=scraper.PARIS)
        for m in upcoming
    ]
    next_kickoff = min(kickoffs)
    if next_kickoff - now > timedelta(hours=SCHEDULE_LEAD_HOURS):
        return False  # too early - not within the lead window yet
    if now > next_kickoff:
        return False  # already kicked off - post-match trigger covers from here

    last_date = await rc.redis_get("odds:last_schedule_date")
    return last_date != next_kickoff.date().isoformat()


async def maybe_update_odds(
    results: list[dict],
    live_matches: list[dict],
    matches: list[dict],
    red_cards: dict,
    standings: dict,
    now: datetime | None = None,
) -> bool:
    """Runs once per refresh.py cron cycle. Returns True if a credit was
    spent (caller should reload forecast.REAL_ODDS and recompute state)."""
    now = now or datetime.now(scraper.PARIS)

    old_snapshot = await rc.redis_get("odds:snapshot") or {}
    new_snapshot = _build_snapshot(results, live_matches, red_cards)
    await rc.redis_set("odds:snapshot", new_snapshot)

    credits = await _get_credits_remaining()
    if credits <= 0:
        log.warning("Odds API budget exhausted - skipping")
        return False

    reason = None
    if _detect_post_match(old_snapshot, new_snapshot):
        reason = "post-match"
    elif await _schedule_trigger_due(matches, results, now):
        reason = "schedule"
    elif credits - 1 >= _reserve(matches, results):
        real_odds = await load_real_odds()
        goal, red_card = _detect_goal_or_card(old_snapshot, new_snapshot, live_matches, standings, real_odds)
        if red_card:
            reason = "red-card"
        elif goal:
            reason = "goal"

    if reason is None:
        return False

    log.info(f"Odds API call triggered: {reason} ({credits} credits remaining)")
    new_matchups, meta = await odds_api.fetch_odds()

    remaining = meta.get("requests_remaining")
    if remaining is not None:
        await rc.redis_set("odds:credits_remaining", remaining)
    elif new_matchups:
        # Call succeeded (we got data back) but the header was missing for
        # some reason - still update the ledger from what we know locally.
        await rc.redis_set("odds:credits_remaining", credits - 1)
    else:
        # No key configured, or the call failed outright (see
        # odds_api.fetch_odds' exception handling) - nothing was actually
        # spent, so don't touch the ledger and don't report a spend.
        return False

    if not new_matchups:
        return False

    stored = await rc.redis_get("odds:matchups") or {}
    fetched_at = now.isoformat()
    for mu in new_matchups:
        stored[_match_key(mu["home"], mu["away"])] = {**mu, "fetched_at": fetched_at}
    await rc.redis_set("odds:matchups", stored)

    if reason == "schedule":
        played = {(r["home"], r["away"]) for r in results}
        upcoming = [m for m in matches if (m["home"], m["away"]) not in played]
        if upcoming:
            next_date = min(
                datetime.strptime(m["dt"], "%Y-%m-%d %H:%M").replace(tzinfo=scraper.PARIS)
                for m in upcoming
            ).date().isoformat()
        else:
            next_date = now.date().isoformat()
        await rc.redis_set("odds:last_schedule_date", next_date)

        # Also refresh tournament outright odds once per day (costs 1 more
        # credit on schedule triggers; goal/red-card triggers skip this).
        outright_probs, out_meta = await odds_api.fetch_outrights()
        if outright_probs:
            await rc.redis_set("odds:tournament_probs", outright_probs)
            # Update credit ledger to reflect the second call.
            out_remaining = out_meta.get("requests_remaining")
            if out_remaining is not None:
                await rc.redis_set("odds:credits_remaining", out_remaining)

    return True
