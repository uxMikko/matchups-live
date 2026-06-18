// GET /api/state — returns all live state in one call
// Reads 5 Redis keys from Upstash, returns combined JSON.

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

  const keys = ["standings", "bracket", "live_matches", "thirds_race", "last_updated"];

  try {
    const [standings, bracket, live_matches, thirds_race, last_updated] =
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
        last_updated: last_updated || null,
      }),
    };
  } catch (err) {
    console.error("state.js error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal error" }) };
  }
}
