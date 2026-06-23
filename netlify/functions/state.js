// GET /api/state — returns all live state in one call
// Reads 10 Redis keys from Upstash, returns combined JSON.

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function rget(key) {
  const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const json = await res.json();
  const raw = json.result;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

export async function handler() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return { statusCode: 503, body: JSON.stringify({ error: "Redis not configured" }) };
  }

  const keys = ["standings", "bracket", "live_matches", "thirds_race", "predicted_standings", "predicted_bracket", "predicted_thirds_race", "fixture_probs", "elo_ratings", "real_odds", "last_updated"];

  try {
    const [standings, bracket, live_matches, thirds_race, predicted_standings, predicted_bracket, predicted_thirds_race, fixture_probs, elo_ratings, real_odds, last_updated] =
      await Promise.all(keys.map(rget));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=15",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        standings: standings || {},
        bracket: bracket || [],
        live_matches: live_matches || [],
        thirds_race: thirds_race || [],
        predicted_standings: predicted_standings || {},
        predicted_bracket: predicted_bracket || [],
        predicted_thirds_race: predicted_thirds_race || [],
        fixture_probs: fixture_probs || [],
        elo_ratings: elo_ratings || {},
        real_odds: real_odds || {},
        last_updated: last_updated || null,
      }),
    };
  } catch (err) {
    console.error("state.js error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal error" }) };
  }
}
