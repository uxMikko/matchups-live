"""Upstash Redis REST client using httpx (no SDK)."""
import json
import os
import httpx

UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL", "")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

_HEADERS = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}


async def redis_set(key: str, value) -> bool:
    if not UPSTASH_URL:
        return False
    serialized = json.dumps(value)
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                UPSTASH_URL,
                headers=_HEADERS,
                json=["SET", key, serialized],
                timeout=8,
            )
            return r.status_code == 200 and r.json().get("result") == "OK"
    except Exception as e:
        print(f"[redis_set] {key}: {e}")
        return False


async def redis_get(key: str):
    if not UPSTASH_URL:
        return None
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{UPSTASH_URL}/get/{key}",
                headers=_HEADERS,
                timeout=8,
            )
            data = r.json()
            raw = data.get("result")
            if raw is None:
                return None
            try:
                return json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                return raw
    except Exception as e:
        print(f"[redis_get] {key}: {e}")
        return None


async def redis_mget(keys: list[str]) -> dict:
    """Fetch multiple keys, return {key: value}."""
    results = {}
    # Upstash free tier: individual GETs are fine given our low volume
    for key in keys:
        results[key] = await redis_get(key)
    return results


async def push_state(
    standings, bracket, live_matches, thirds_race,
    predicted_standings, predicted_bracket, predicted_thirds_race,
    fixture_probs, elo_ratings, real_odds,
):
    """Write all 11 Redis keys atomically-ish."""
    import time
    await redis_set("standings", standings)
    await redis_set("bracket", bracket)
    await redis_set("live_matches", live_matches)
    await redis_set("thirds_race", thirds_race)
    await redis_set("predicted_standings", predicted_standings)
    await redis_set("predicted_bracket", predicted_bracket)
    await redis_set("predicted_thirds_race", predicted_thirds_race)
    await redis_set("fixture_probs", fixture_probs)
    await redis_set("elo_ratings", elo_ratings)
    await redis_set("real_odds", real_odds)
    await redis_set("last_updated", int(time.time()))
