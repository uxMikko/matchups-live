"""
Match scheduler. Knows the exact kickoff times (GMT+2).
Sleeps until 2min before each match, activates scraper, waits for FT, updates Redis.
Handles simultaneous matchday 3 pairs with concurrent coroutines.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

import aiosqlite
import engine
import redis_client as rc
import scraper

log = logging.getLogger("scheduler")

PARIS = ZoneInfo("Europe/Paris")  # GMT+2 during tournament

# Full match schedule — datetime strings are GMT+2 (Europe/Paris)
MATCHES = [
    # MATCHDAY 1
    {"dt": "2026-06-17 19:00", "home": "Portugal",          "away": "DR Congo",          "group": "K", "md": 1},
    {"dt": "2026-06-17 22:00", "home": "England",            "away": "Croatia",            "group": "L", "md": 1},
    {"dt": "2026-06-18 01:00", "home": "Ghana",              "away": "Panama",             "group": "L", "md": 1},
    {"dt": "2026-06-18 04:00", "home": "Uzbekistan",         "away": "Colombia",           "group": "K", "md": 1},
    {"dt": "2026-06-18 18:00", "home": "Czech Republic",     "away": "South Africa",       "group": "A", "md": 1},
    {"dt": "2026-06-18 21:00", "home": "Switzerland",        "away": "Bosnia-Herzegovina", "group": "B", "md": 1},
    {"dt": "2026-06-19 00:00", "home": "Canada",             "away": "Qatar",              "group": "B", "md": 1},
    {"dt": "2026-06-19 03:00", "home": "Mexico",             "away": "South Korea",        "group": "A", "md": 1},
    {"dt": "2026-06-19 21:00", "home": "USA",                "away": "Australia",          "group": "D", "md": 1},
    {"dt": "2026-06-20 00:00", "home": "Scotland",           "away": "Morocco",            "group": "C", "md": 1},
    {"dt": "2026-06-20 02:30", "home": "Brazil",             "away": "Haiti",              "group": "C", "md": 1},
    {"dt": "2026-06-20 05:00", "home": "Turkey",             "away": "Paraguay",           "group": "D", "md": 1},
    {"dt": "2026-06-20 19:00", "home": "Netherlands",        "away": "Sweden",             "group": "F", "md": 1},
    {"dt": "2026-06-20 22:00", "home": "Germany",            "away": "Ivory Coast",        "group": "E", "md": 1},
    {"dt": "2026-06-21 02:00", "home": "Ecuador",            "away": "Curacao",            "group": "E", "md": 1},
    {"dt": "2026-06-21 06:00", "home": "Tunisia",            "away": "Japan",              "group": "F", "md": 1},
    {"dt": "2026-06-21 18:00", "home": "Spain",              "away": "Saudi Arabia",       "group": "H", "md": 1},
    {"dt": "2026-06-21 21:00", "home": "Belgium",            "away": "Iran",               "group": "G", "md": 1},
    {"dt": "2026-06-22 00:00", "home": "Uruguay",            "away": "Cape Verde",         "group": "H", "md": 1},
    {"dt": "2026-06-22 03:00", "home": "New Zealand",        "away": "Egypt",              "group": "G", "md": 1},
    {"dt": "2026-06-22 19:00", "home": "Argentina",          "away": "Austria",            "group": "J", "md": 1},
    {"dt": "2026-06-22 23:00", "home": "France",             "away": "Iraq",               "group": "I", "md": 1},
    {"dt": "2026-06-23 02:00", "home": "Norway",             "away": "Senegal",            "group": "I", "md": 1},
    {"dt": "2026-06-23 05:00", "home": "Jordan",             "away": "Algeria",            "group": "J", "md": 1},
    # MATCHDAY 2
    {"dt": "2026-06-23 19:00", "home": "Portugal",           "away": "Uzbekistan",         "group": "K", "md": 2},
    {"dt": "2026-06-23 22:00", "home": "England",            "away": "Ghana",              "group": "L", "md": 2},
    {"dt": "2026-06-24 01:00", "home": "Panama",             "away": "Croatia",            "group": "L", "md": 2},
    {"dt": "2026-06-24 04:00", "home": "Colombia",           "away": "DR Congo",           "group": "K", "md": 2},
    # MATCHDAY 3 — simultaneous pairs
    {"dt": "2026-06-24 21:00", "home": "Bosnia-Herzegovina", "away": "Qatar",              "group": "B", "md": 3},
    {"dt": "2026-06-24 21:00", "home": "Switzerland",        "away": "Canada",             "group": "B", "md": 3},
    {"dt": "2026-06-25 00:00", "home": "Morocco",            "away": "Haiti",              "group": "C", "md": 3},
    {"dt": "2026-06-25 00:00", "home": "Scotland",           "away": "Brazil",             "group": "C", "md": 3},
    {"dt": "2026-06-25 03:00", "home": "Czech Republic",     "away": "Mexico",             "group": "A", "md": 3},
    {"dt": "2026-06-25 03:00", "home": "South Africa",       "away": "South Korea",        "group": "A", "md": 3},
    {"dt": "2026-06-25 22:00", "home": "Curacao",            "away": "Ivory Coast",        "group": "E", "md": 3},
    {"dt": "2026-06-25 22:00", "home": "Ecuador",            "away": "Germany",            "group": "E", "md": 3},
    {"dt": "2026-06-26 01:00", "home": "Japan",              "away": "Sweden",             "group": "F", "md": 3},
    {"dt": "2026-06-26 01:00", "home": "Tunisia",            "away": "Netherlands",        "group": "F", "md": 3},
    {"dt": "2026-06-26 04:00", "home": "Paraguay",           "away": "Australia",          "group": "D", "md": 3},
    {"dt": "2026-06-26 04:00", "home": "Turkey",             "away": "USA",                "group": "D", "md": 3},
    {"dt": "2026-06-26 21:00", "home": "Norway",             "away": "France",             "group": "I", "md": 3},
    {"dt": "2026-06-26 21:00", "home": "Senegal",            "away": "Iraq",               "group": "I", "md": 3},
    {"dt": "2026-06-27 02:00", "home": "Cape Verde",         "away": "Saudi Arabia",       "group": "H", "md": 3},
    {"dt": "2026-06-27 02:00", "home": "Uruguay",            "away": "Spain",              "group": "H", "md": 3},
    {"dt": "2026-06-27 05:00", "home": "Egypt",              "away": "Iran",               "group": "G", "md": 3},
    {"dt": "2026-06-27 05:00", "home": "New Zealand",        "away": "Belgium",            "group": "G", "md": 3},
    {"dt": "2026-06-27 23:00", "home": "Croatia",            "away": "Ghana",              "group": "L", "md": 3},
    {"dt": "2026-06-27 23:00", "home": "Panama",             "away": "England",            "group": "L", "md": 3},
    {"dt": "2026-06-28 01:30", "home": "Colombia",           "away": "Portugal",           "group": "K", "md": 3},
    {"dt": "2026-06-28 01:30", "home": "DR Congo",           "away": "Uzbekistan",         "group": "K", "md": 3},
    {"dt": "2026-06-28 04:00", "home": "Algeria",            "away": "Austria",            "group": "J", "md": 3},
    {"dt": "2026-06-28 04:00", "home": "Jordan",             "away": "Argentina",          "group": "J", "md": 3},
]


def kickoff_dt(match: dict) -> datetime:
    """Parse kickoff datetime in Europe/Paris tz."""
    return datetime.strptime(match["dt"], "%Y-%m-%d %H:%M").replace(tzinfo=PARIS)


def match_id(m: dict) -> str:
    return f"{m['home'].replace(' ','_')}_vs_{m['away'].replace(' ','_')}"


async def handle_match_window(match: dict, db_path: str):
    """
    Scrape a single match from kickoff until FT confirmed.
    On goal or FT: recompute state, push to Redis.
    """
    home, away = match["home"], match["away"]
    log.info(f"Window open: {home} vs {away}")

    # Initial poll to confirm started
    await asyncio.sleep(60)
    score = await scraper.scrape_match(home, away)
    if score:
        await _on_score(match, score, db_path)

    # Poll every 30s looking for goals
    last_score = (score.home_score, score.away_score) if score else (None, None)
    elapsed = 60

    while elapsed < 105:  # minimum match duration
        await asyncio.sleep(30)
        elapsed += 0.5
        score = await scraper.scrape_match(home, away)
        if score:
            current = (score.home_score, score.away_score)
            if current != last_score:
                log.info(f"Goal! {home} {current[0]}-{current[1]} {away}")
                await _on_score(match, score, db_path)
                last_score = current

    # Now poll actively for FT
    final = await scraper.wait_for_fulltime(home, away, kickoff_plus=105)
    if final:
        await _on_match_finished(match, final, db_path)


async def _on_score(match: dict, score, db_path: str):
    """Update live_matches in Redis with current score."""
    live = {
        "home": match["home"],
        "away": match["away"],
        "home_score": score.home_score,
        "away_score": score.away_score,
        "minute": score.minute,
        "status": score.status,
        "group": match["group"],
        "flag_home": engine.FLAG_EMOJIS.get(match["home"], "🏳"),
        "flag_away": engine.FLAG_EMOJIS.get(match["away"], "🏳"),
    }
    await rc.redis_set("live_matches", [live])

    # Re-project bracket with current (possibly partial) score as a result
    if score.home_score is not None:
        await _push_full_state(db_path, live_match=live)


async def _on_match_finished(match: dict, score, db_path: str):
    """Persist result to DB, recompute full state, push to Redis."""
    log.info(f"FT: {match['home']} {score.home_score}-{score.away_score} {match['away']}")
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
            INSERT OR REPLACE INTO results
              (match_id, home, away, group_letter, matchday, home_score, away_score)
            VALUES (?,?,?,?,?,?,?)
        """, (match_id(match), match["home"], match["away"], match["group"],
              match["md"], score.home_score, score.away_score))
        await db.commit()

    await _push_full_state(db_path, live_match=None)
    # Clear live strip
    await rc.redis_set("live_matches", [])


async def _push_full_state(db_path: str, live_match=None):
    results = await _load_results(db_path)
    state = engine.compute_state(results)
    live = [live_match] if live_match else []
    await rc.push_state(
        state["standings"],
        state["bracket"],
        live,
        state["thirds_race"],
    )


async def _load_results(db_path: str) -> list[dict]:
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM results") as cur:
            return [dict(r) for r in await cur.fetchall()]


async def run_schedule(db_path: str):
    """Main scheduling loop — runs until last match ends."""
    now = datetime.now(PARIS)
    log.info(f"Scheduler started. Current time (Paris): {now.strftime('%Y-%m-%d %H:%M')}")

    # Group matches by kickoff time for simultaneous handling
    by_kickoff: dict[str, list[dict]] = {}
    for m in MATCHES:
        by_kickoff.setdefault(m["dt"], []).append(m)

    for dt_str, matches_at_time in sorted(by_kickoff.items()):
        ko = kickoff_dt(matches_at_time[0])
        wake_time = ko - timedelta(minutes=2)
        now = datetime.now(PARIS)

        if ko < now - timedelta(minutes=150):
            log.debug(f"Skipping past match: {dt_str}")
            continue

        if wake_time > now:
            sleep_secs = (wake_time - now).total_seconds()
            log.info(f"Sleeping {sleep_secs/60:.1f}min until {dt_str} window")
            await asyncio.sleep(sleep_secs)

        log.info(f"Activating window for {len(matches_at_time)} match(es) at {dt_str}")
        tasks = [handle_match_window(m, db_path) for m in matches_at_time]
        await asyncio.gather(*tasks)

    log.info("All matches complete. Scheduler done.")
