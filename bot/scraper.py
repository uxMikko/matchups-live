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


# ESPN's "in progress" state covers more than just normal play - a
# suspended/delayed match (weather, crowd trouble, etc.) is still state
# "in" but its clock has actually stopped, frozen at whatever minute play
# paused on. Showing that frozen minute as if it were a live, ticking
# clock looks like a bug (a match stuck forever in 45+3' stoppage with no
# indication anything's wrong) - so for these, show ESPN's own description
# ("Delayed") instead, same as halftime/full-time already do. Mirrors
# netlify/functions/live.js's clockIsRunning().
_PAUSED_IN_PROGRESS_NAMES = {"STATUS_DELAYED", "STATUS_SUSPENDED", "STATUS_POSTPONED"}


def _clock_is_running(status: str, status_type: dict) -> bool:
    return status == "live" and status_type.get("name") not in _PAUSED_IN_PROGRESS_NAMES


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

    # The clock freezes rather than disappearing once play has stopped (e.g.
    # "45'+5'" sits there through halftime, "90'+8'" through full-time), so
    # show ESPN's status description instead of the stale clock whenever the
    # match isn't actually being played right now.
    if _clock_is_running(status, status_type):
        minute = comp["status"].get("displayClock")
    else:
        minute = status_type.get("description")

    return MatchScore(
        home_score=home_score,
        away_score=away_score,
        minute=minute,
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


# R32 kickoff times (UTC) — fixed by FIFA schedule, no need to scrape.
R32_KICKOFFS: dict[str, str] = {
    "R1": "2026-06-28T19:00Z",
    "R2": "2026-06-29T17:00Z",
    "RE": "2026-06-29T20:30Z",
    "R3": "2026-06-30T01:00Z",
    "R6": "2026-06-30T17:00Z",
    "RI": "2026-06-30T21:00Z",
    "RA": "2026-07-01T01:00Z",
    "RL": "2026-07-01T16:00Z",
    "RG": "2026-07-01T20:00Z",
    "RD": "2026-07-02T00:00Z",
    "R4": "2026-07-02T19:00Z",
    "R7": "2026-07-02T23:00Z",
    "RB": "2026-07-03T03:00Z",
    "R8": "2026-07-03T18:00Z",
    "R5": "2026-07-03T22:00Z",
    "RK": "2026-07-04T01:30Z",
}


async def fetch_r32_kickoffs() -> dict[str, str]:
    """{slot: kickoff ISO datetime (UTC)} for each of the 16 R32 slots."""
    return R32_KICKOFFS


KNOCKOUT_WINDOW = "20260628-20260720"


async def fetch_knockout_results() -> dict[str, dict]:
    """{sorted_team_key: {home, away, home_score, away_score, status}} for
    every completed knockout match (R32 through Final). Keyed by
    "|".join(sorted([home, away])) so callers can look up by team pair
    without knowing the FIFA match number (which ESPN doesn't expose).
    Only status=="ft" entries are included — in-progress scores are skipped
    so a partial scoreline mid-match doesn't lock in prematurely."""
    data = await _fetch_scoreboard(KNOCKOUT_WINDOW)
    results: dict[str, dict] = {}
    for event in data.get("events", []):
        comp = event["competitions"][0]
        note = comp.get("altGameNote", "")
        if "Group" in note:
            continue  # group stage event in the window
        if not any(k in note for k in ("Round of", "Quarterfinal", "Semifinal", "Final")):
            continue
        status_type = comp["status"]["type"]
        if not (status_type.get("completed") or status_type.get("state") == "post"):
            continue  # not finished yet
        home_c = next((c for c in comp["competitors"] if c["homeAway"] == "home"), None)
        away_c = next((c for c in comp["competitors"] if c["homeAway"] == "away"), None)
        if not home_c or not away_c:
            continue
        home = NAME_FROM_ESPN.get(home_c["team"]["displayName"], home_c["team"]["displayName"])
        away = NAME_FROM_ESPN.get(away_c["team"]["displayName"], away_c["team"]["displayName"])
        key = "|".join(sorted([home, away]))
        results[key] = {
            "home": home, "away": away,
            "home_score": int(home_c["score"]),
            "away_score": int(away_c["score"]),
            "status": "ft",
        }
    return results


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


async def fetch_group_stage_results() -> tuple[list[dict], list[dict]]:
    """
    Single-pass fetch of every group-stage match's current result, in one
    ESPN call rather than one call per match (which is what scrape_match()
    does per-match and is too chatty for a periodic batch job). Returns
    (results, live_matches): results is every *finished* match only —
    standings/bracket are cached and refreshed on a slow cron, so they must
    only reflect settled results, never a live partial score (the frontend
    overlays live_matches onto the cached standings itself, fetched directly
    from a separate fast per-request endpoint — see netlify/functions/live.js
    — so there's no double-counting between the two paths). live_matches is
    every match currently being played, in the shape redis_client.push_state()
    expects.
    """
    data = await _fetch_scoreboard(GROUP_STAGE_WINDOW)

    results = []
    live_matches = []
    for event in data.get("events", []):
        comp = event["competitions"][0]
        note = comp.get("altGameNote", "")
        m = re.search(r"Group ([A-L])\b", note)
        if not m:
            continue  # knockout-stage placeholder fixture, not group stage
        group = m.group(1)

        home_c = next(c for c in comp["competitors"] if c["homeAway"] == "home")
        away_c = next(c for c in comp["competitors"] if c["homeAway"] == "away")
        home = NAME_FROM_ESPN.get(home_c["team"]["displayName"], home_c["team"]["displayName"])
        away = NAME_FROM_ESPN.get(away_c["team"]["displayName"], away_c["team"]["displayName"])

        score = _score_from_event(event)
        if score.home_score is None:
            continue  # not started yet

        if score.status == "ft":
            results.append({
                "home": home, "away": away, "group": group,
                "home_score": score.home_score, "away_score": score.away_score,
                "event_id": event["id"],
                "home_espn": home_c["team"]["displayName"],
                "away_espn": away_c["team"]["displayName"],
            })
        elif score.status in ("live", "ht"):
            live_matches.append({
                "home": home, "away": away,
                "home_score": score.home_score, "away_score": score.away_score,
                "minute": score.minute, "status": score.status, "group": group,
                # Needed by odds_state.py to poll per-match card data and
                # diff snapshots across cron cycles - not used by the
                # frontend (live.js is its own separate fast-poll path).
                "event_id": event["id"],
                "home_espn": home_c["team"]["displayName"],
                "away_espn": away_c["team"]["displayName"],
            })

    return results, live_matches


SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary"


async def fetch_red_card_counts(live_events: list[dict]) -> dict[str, dict[str, int]]:
    """{event_id: {"home": n, "away": n}} red card counts (straight reds +
    VAR red-card upgrades) for each given live match. live_events:
    [{"event_id", "home_espn", "away_espn"}, ...] - the ESPN display names
    are needed because the summary endpoint's keyEvents identify the
    carded team by displayName, not home/away side.

    Uses ESPN's per-event summary endpoint, since the bulk scoreboard
    endpoint used everywhere else doesn't carry card data - one extra ESPN
    call per live match per cron cycle. ESPN's API is free/unofficial, so
    this doesn't touch the Odds API credit budget."""
    counts: dict[str, dict[str, int]] = {}
    if not live_events:
        return counts
    async with httpx.AsyncClient() as client:
        for ev in live_events:
            try:
                r = await client.get(
                    SUMMARY_URL,
                    params={"event": ev["event_id"]},
                    headers={"User-Agent": USER_AGENT},
                    timeout=10,
                )
                r.raise_for_status()
                data = r.json()
            except Exception as e:
                log.warning(f"ESPN summary fetch failed (event {ev['event_id']}): {e}")
                continue
            home_n = away_n = 0
            for key_event in data.get("keyEvents", []) or []:
                etype = (key_event.get("type") or {}).get("type", "")
                if "red-card" not in etype:
                    continue
                team_name = (key_event.get("team") or {}).get("displayName")
                if team_name == ev["home_espn"]:
                    home_n += 1
                elif team_name == ev["away_espn"]:
                    away_n += 1
            counts[ev["event_id"]] = {"home": home_n, "away": away_n}
    return counts


async def fetch_card_counts(events: list[dict]) -> dict[str, dict]:
    """{event_id: {"home_yellow": n, "away_yellow": n, "home_red": n, "away_red": n}}
    for each event (finished or live). Uses the summary endpoint's boxscore
    statistics, which carry aggregate totals rather than per-event keyEvents
    (more reliable for yellow cards). Fetches concurrently.
    events: [{"event_id", "home_espn", "away_espn"}, ...]"""
    if not events:
        return {}

    async def _fetch_one(client: httpx.AsyncClient, ev: dict) -> tuple[str, dict]:
        try:
            r = await client.get(
                SUMMARY_URL,
                params={"event": ev["event_id"]},
                headers={"User-Agent": USER_AGENT},
                timeout=10,
            )
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            log.warning(f"ESPN summary fetch failed (event {ev['event_id']}): {e}")
            return ev["event_id"], {}

        result: dict[str, int] = {"home_yellow": 0, "away_yellow": 0, "home_red": 0, "away_red": 0}
        for team in (data.get("boxscore") or {}).get("teams", []) or []:
            side = "home" if team.get("homeAway") == "home" else "away"
            # ESPN sets value=null for card stats; displayValue has the real count.
            # Other stats may have float displayValues so round to int.
            def _stat(s):
                v = s.get("value")
                if v is not None:
                    return int(v)
                try:
                    return int(float(s.get("displayValue") or 0))
                except (ValueError, TypeError):
                    return 0
            stats = {s["name"]: _stat(s) for s in team.get("statistics", []) or []}
            result[f"{side}_yellow"] = stats.get("yellowCards", stats.get("foulsYellow", 0))
            result[f"{side}_red"] = stats.get("redCards", 0)
        return ev["event_id"], result

    async with httpx.AsyncClient() as client:
        pairs = await asyncio.gather(*[_fetch_one(client, ev) for ev in events])
    return dict(pairs)
