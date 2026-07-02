"""
One-shot state refresh, meant to be run periodically (e.g. a GitHub Actions
cron job) rather than as an always-on process. Pulls the current schedule
and every match's result/status from ESPN in a couple of API calls, computes
standings/bracket/thirds-race, and pushes the result to Redis. Stateless by
design — there's nothing to persist between runs, since ESPN itself is the
source of truth for scores.
"""
import asyncio
import logging
import os
import sys

from dotenv import load_dotenv

load_dotenv()

for var in ("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"):
    if not os.getenv(var):
        print(f"ERROR: {var} not set.", file=sys.stderr)
        sys.exit(1)

import elo
import engine
import forecast
import odds_state
import redis_client as rc
import scraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("refresh")


async def main():
    results, live_matches = await scraper.fetch_group_stage_results()
    matches = await scraper.fetch_group_stage_matches()
    r32_kickoffs = await scraper.fetch_r32_kickoffs()
    engine.OFFICIAL_RANKS = await scraper.fetch_group_ranks()
    forecast.ELO_RATINGS = await elo.fetch_elo_ratings()
    forecast.REAL_ODDS = await odds_state.load_real_odds()
    tournament_probs = await odds_state.load_tournament_probs()
    forecast.TOURNAMENT_PROBS = tournament_probs

    # Fetch yellow+red card totals for every finished match and merge into
    # results so the engine can apply the TCS tiebreaker (pts→GD→GF→TCS→rank).
    card_counts = await scraper.fetch_card_counts([
        {"event_id": r["event_id"], "home_espn": r["home_espn"], "away_espn": r["away_espn"]}
        for r in results
    ])
    for r in results:
        cards = card_counts.get(r.get("event_id"), {})
        r["home_yellow"] = cards.get("home_yellow", 0)
        r["away_yellow"] = cards.get("away_yellow", 0)
        r["home_red"] = cards.get("home_red", 0)
        r["away_red"] = cards.get("away_red", 0)

    ko_results = await scraper.fetch_knockout_results()
    state = engine.compute_state(results, matches, r32_kickoffs, ko_results)

    # Decide whether this cycle is worth an Odds API credit (see
    # odds_state.py for the full trigger model/budget logic), and if it
    # spent one, reload REAL_ODDS and recompute state so this cycle's
    # standings/bracket already reflect it instead of waiting one cycle.
    red_cards = await scraper.fetch_red_card_counts([
        {"event_id": m["event_id"], "home_espn": m["home_espn"], "away_espn": m["away_espn"]}
        for m in live_matches
    ])
    spent_credit = await odds_state.maybe_update_odds(
        results, live_matches, matches, red_cards, state["standings"],
    )
    if spent_credit:
        forecast.REAL_ODDS = await odds_state.load_real_odds()
        tournament_probs = await odds_state.load_tournament_probs()
        forecast.TOURNAMENT_PROBS = tournament_probs
        state = engine.compute_state(results, matches, r32_kickoffs, ko_results)

    predicted = engine.compute_predicted_state(results, matches, r32_kickoffs, ko_results)
    fixture_probs = forecast.remaining_fixture_probs(results, matches)
    await rc.push_state(
        state["standings"],
        state["bracket"],
        live_matches,
        state["thirds_race"],
        predicted["standings"],
        predicted["bracket"],
        predicted["thirds_race"],
        fixture_probs,
        forecast.ELO_RATINGS,
        forecast.REAL_ODDS,
        tournament_probs,
    )
    log.info(f"Refreshed: {len(results)} results loaded, {len(live_matches)} live now")


if __name__ == "__main__":
    asyncio.run(main())
