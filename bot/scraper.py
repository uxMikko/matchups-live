"""
ESPN scoreboard API client.

Replaces the old Playwright/Google-search scraper, which got blocked by
Google's bot detection and, worse, would parse garbage numbers off the
resulting CAPTCHA page as if they were a real score. ESPN's scoreboard
endpoint is unofficial (no published docs/SLA) but returns real structured
data with no browser, no auth, and no CAPTCHA wall.
"""
import asyncio
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

import httpx

log = logging.getLogger("scraper")

SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"
USER_AGENT = "matchups-live/1.0 (+https://matchups.live)"
PARIS = ZoneInfo("Europe/Paris")

# Covers the full 2026 World Cup group stage with margin on both ends.
GROUP_STAGE_WINDOW = "20260610-20260701"

# Our internal team names that don't match ESPN's display names exactly.
ESPN_NAME = {
    "Curacao": "Curaçao",
    "Czech Republic": "Czechia",
    "DR Congo": "Congo DR",
    "Turkey": "Türkiye",
    "USA": "United States",
}
NAME_FROM_ESPN = {v: k for k, v in ESPN_NAME.items()}


@dataclass
class MatchScore:
    home_score: Optional[int]
    away_score: Optional[int]
    minute: Optional[str]
    status: str  # "ns" | "live" | "ht" | "ft" | "unknown"


def _utc_date_str(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y%m%d")


async def _fetch_scoreboard(date_range: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            SCOREBOARD_URL,
            params={"dates": date_range},
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        r.raise_for_status()
        return r.json()


async def _find_event(home: str, away: str, kickoff: datetime) -> Optional[dict]:
    """Find the ESPN event for this match. Queries a 3-day window (one day
    either side of the kickoff's UTC date) rather than trusting a single-day
    lookup: ESPN's `dates` filter buckets events by US Eastern Time, not UTC,
    so a kickoff between 00:00-04:00 UTC can land under the *previous*
    calendar day. The actual match is then identified by team name, not by
    the date filter."""
    start = _utc_date_str(kickoff - timedelta(days=1))
    end = _utc_date_str(kickoff + timedelta(days=1))
    try:
        data = await _fetch_scoreboard(f"{start}-{end}")
    except Exception as e:
        log.warning(f"ESPN scoreboard fetch failed ({home} vs {away}): {e}")
        return None

    wanted = {ESPN_NAME.get(home, home), ESPN_NAME.get(away, away)}
    for event in data.get("events", []):
        comp = event["competitions"][0]
        names = {c["team"]["displayName"] for c in comp["competitors"]}
        if wanted <= names:
            return event
    return None


def _status_from_espn(status_type: dict) -> str:
    state = status_type.get("state")
    if status_type.get("completed") or state == "post":
        return "ft"
    if status_type.get("name") == "STATUS_HALFTIME":
        return "ht"
    if state == "in":
        return "live"
    if state == "pre":
        return "ns"
    return "unknown"


def _score_from_event(event: dict) -> MatchScore:
    comp = event["competitions"][0]
    home = next(c for c in comp["competitors"] if c["homeAway"] == "home")
    away = next(c for c in comp["competitors"] if c["homeAway"] == "away")
    status_type = comp["status"]["type"]
    status = _status_from_espn(status_type)

    # Before kickoff ESPN reports score "0" as a placeholder, not a real result.
    if status == "ns":
        home_score = away_score = None
    else:
        home_score = int(home["score"])
        away_score = int(away["score"])

    return MatchScore(
        home_score=home_score,
        away_score=away_score,
        minute=comp["status"].get("displayClock"),
        status=status,
    )


async def scrape_match(home: str, away: str, kickoff: datetime) -> Optional[MatchScore]:
    """Fetch the current score/status for a match from ESPN's scoreboard."""
    event = await _find_event(home, away, kickoff)
    if event is None:
        return None
    return _score_from_event(event)


async def wait_for_fulltime(home: str, away: str, kickoff: datetime, kickoff_plus: int = 100) -> MatchScore:
    """
    Poll every 30s starting at kickoff+<kickoff_plus> minutes until ESPN
    reports the match complete (status.type.completed). Safety cutoff at
    kickoff+150min.
    """
    log.info(f"Waiting for FT: {home} vs {away}")
    last_score: Optional[MatchScore] = None
    polls = 0
    max_polls = max(0, 150 - kickoff_plus) * 2  # 2 polls/min

    while polls < max_polls:
        await asyncio.sleep(30)
        polls += 1
        score = await scrape_match(home, away, kickoff)
        if not score:
            continue

        log.info(f"  {home} {score.home_score}-{score.away_score} {away} [{score.status}] {score.minute or ''}")
        last_score = score

        if score.status == "ft":
            log.info(f"FT confirmed: {home} {score.home_score}-{score.away_score} {away}")
            return score

    log.warning(f"Safety cutoff for {home} vs {away}")
    return last_score or MatchScore(0, 0, "150+", "ft")


async def fetch_group_stage_matches() -> list[dict]:
    """
    Fetch the real group-stage fixture list from ESPN — teams, kickoff times,
    and group letter (parsed from each event's altGameNote, e.g. "FIFA World
    Cup, Group C") — rather than hand-maintaining it, which drifted from the
    real schedule. Matchday number isn't exposed directly by the API, so it's
    derived by sorting each group's 6 matches chronologically and chunking
    them into 3 rounds of 2; this is reliable because round-robin group play
    structurally clusters each round close together with days of gap between
    rounds.
    """
    data = await _fetch_scoreboard(GROUP_STAGE_WINDOW)

    by_group: dict[str, list[dict]] = {}
    for event in data.get("events", []):
        comp = event["competitions"][0]
        note = comp.get("altGameNote", "")
        m = re.search(r"Group ([A-L])\b", note)
        if not m:
            continue  # knockout-stage placeholder fixture, not group stage
        group = m.group(1)

        home = next(c for c in comp["competitors"] if c["homeAway"] == "home")
        away = next(c for c in comp["competitors"] if c["homeAway"] == "away")
        kickoff_utc = datetime.fromisoformat(comp["date"].replace("Z", "+00:00"))

        by_group.setdefault(group, []).append({
            "kickoff": kickoff_utc.astimezone(PARIS),
            "home": NAME_FROM_ESPN.get(home["team"]["displayName"], home["team"]["displayName"]),
            "away": NAME_FROM_ESPN.get(away["team"]["displayName"], away["team"]["displayName"]),
        })

    matches = []
    for group, group_matches in by_group.items():
        if len(group_matches) != 6:
            log.warning(f"Group {group}: found {len(group_matches)} matches (expected 6)")
        group_matches.sort(key=lambda gm: gm["kickoff"])
        for i, gm in enumerate(group_matches):
            matches.append({
                "dt": gm["kickoff"].strftime("%Y-%m-%d %H:%M"),
                "home": gm["home"],
                "away": gm["away"],
                "group": group,
                "md": i // 2 + 1,
            })

    matches.sort(key=lambda m: m["dt"])
    return matches


STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings"


async def fetch_group_ranks() -> dict[str, int]:
    """
    Fetch ESPN's own official within-group rank (1-4) per team. Used as the
    final tiebreaker instead of an approximate static FIFA-ranking table:
    when two teams are level on points/GD/GF/head-to-head, the real deciding
    factor (fair play points, or literally a FIFA drawing of lots) isn't
    something we can compute ourselves, but ESPN's standings already reflect
    the real resolved outcome.
    """
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                STANDINGS_URL,
                params={"season": 2026},
                headers={"User-Agent": USER_AGENT},
                timeout=10,
            )
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        log.warning(f"ESPN standings fetch failed: {e}")
        return {}

    ranks: dict[str, int] = {}
    for group in data.get("children", []):
        for entry in group.get("standings", {}).get("entries", []):
            name = entry["team"]["displayName"]
            rank = next((s.get("value") for s in entry["stats"] if s["name"] == "rank"), None)
            if rank is not None:
                ranks[NAME_FROM_ESPN.get(name, name)] = int(rank)
    return ranks
