"""
Startup + orchestrator.
1. Init DB
2. Fetch completed results from ESPN's scoreboard
3. Run engine on known results, push baseline to Redis
4. Hand off to scheduler
"""
import asyncio
import logging
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

import aiosqlite
from dotenv import load_dotenv

load_dotenv()

# Validate env
for var in ("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"):
    if not os.getenv(var):
        print(f"ERROR: {var} not set. Copy .env.example to .env.", file=sys.stderr)
        sys.exit(1)

import engine
import redis_client as rc
import scheduler
import scraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("main")

DB_PATH = os.path.join(os.path.dirname(__file__), "scores.db")
PARIS = ZoneInfo("Europe/Paris")

SCHEMA = """
CREATE TABLE IF NOT EXISTS results (
    match_id TEXT PRIMARY KEY,
    home TEXT NOT NULL,
    away TEXT NOT NULL,
    group_letter TEXT NOT NULL,
    matchday INTEGER NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    scraped_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()


async def backfill_completed():
    """Fetch results from ESPN's scoreboard for all already-completed matches."""
    now = datetime.now(PARIS)
    completed = [
        m for m in scheduler.MATCHES
        if scheduler.kickoff_dt(m).timestamp() < now.timestamp() - 7200  # ended >2h ago
    ]
    log.info(f"Backfilling {len(completed)} completed matches…")

    async with aiosqlite.connect(DB_PATH) as db:
        for m in completed:
            mid = scheduler.match_id(m)
            async with db.execute("SELECT match_id FROM results WHERE match_id=?", (mid,)) as cur:
                if await cur.fetchone():
                    continue  # Already have this result

            log.info(f"  Fetching: {m['home']} vs {m['away']}")
            score = await scraper.scrape_match(m["home"], m["away"], scheduler.kickoff_dt(m))
            if score and score.home_score is not None:
                await db.execute("""
                    INSERT OR REPLACE INTO results
                      (match_id, home, away, group_letter, matchday, home_score, away_score)
                    VALUES (?,?,?,?,?,?,?)
                """, (mid, m["home"], m["away"], m["group"], m["md"],
                      score.home_score, score.away_score))
                log.info(f"    → {m['home']} {score.home_score}-{score.away_score} {m['away']}")
            else:
                log.warning(f"    → No result found for {m['home']} vs {m['away']}")
            await asyncio.sleep(0.5)
        await db.commit()


async def push_baseline():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM results") as cur:
            results = [dict(r) for r in await cur.fetchall()]

    # Map DB columns to engine format
    engine_results = [
        {
            "home": r["home"],
            "away": r["away"],
            "group": r["group_letter"],
            "home_score": r["home_score"],
            "away_score": r["away_score"],
        }
        for r in results
    ]

    engine.OFFICIAL_RANKS = await scraper.fetch_group_ranks()
    state = engine.compute_state(engine_results)
    await rc.push_state(
        state["standings"],
        state["bracket"],
        [],  # no live matches at startup
        state["thirds_race"],
    )
    log.info(f"Baseline pushed. {len(results)} results loaded.")


async def main():
    log.info("=== matchups.live bot starting ===")
    await init_db()
    await scheduler.load_matches()
    await backfill_completed()
    await push_baseline()
    await scheduler.run_schedule(DB_PATH)


if __name__ == "__main__":
    asyncio.run(main())
