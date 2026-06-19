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

MATCHES: list[dict] = []  # populated by load_matches() at startup


async def load_matches():
    """Fetch the real group-stage fixture list from ESPN instead of hand-
    maintaining it (which drifted from reality). Must be called once before
    backfill_completed() or run_schedule() are used."""
    global MATCHES
    MATCHES = await scraper.fetch_group_stage_matches()
    log.info(f"Loaded {len(MATCHES)} group-stage matches from ESPN")


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
    kickoff = kickoff_dt(match)
    log.info(f"Window open: {home} vs {away}")

    # Initial poll to confirm started
    await asyncio.sleep(60)
    score = await scraper.scrape_match(home, away, kickoff)
    if score:
        await _on_score(match, score, db_path)

    # Poll every 30s looking for goals
    last_score = (score.home_score, score.away_score) if score else (None, None)
    elapsed = 60

    while elapsed < 105:  # minimum match duration
        await asyncio.sleep(30)
        elapsed += 0.5
        score = await scraper.scrape_match(home, away, kickoff)
        if score:
            current = (score.home_score, score.away_score)
            if current != last_score:
                log.info(f"Goal! {home} {current[0]}-{current[1]} {away}")
                await _on_score(match, score, db_path)
                last_score = current

    # Now poll actively for FT
    final = await scraper.wait_for_fulltime(home, away, kickoff, kickoff_plus=105)
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
