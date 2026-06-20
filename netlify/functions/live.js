// GET /api/live — live group-stage match status straight from ESPN, on every
// request, bypassing Redis/cron entirely. The cron (refresh.py) only caches
// *finished* results (see scraper.fetch_group_stage_results), since it can
// be unreliable by several minutes — fine for standings, not for a live
// clock. This endpoint exists so the live score/clock/status can be as
// fresh as however often the frontend polls it, independent of the cron.

const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const GROUP_STAGE_WINDOW = "20260610-20260701";

// Mirrors bot/scraper.py's NAME_FROM_ESPN — same 5 teams ESPN names
// differently than the rest of the app does.
const NAME_FROM_ESPN = {
  "Curaçao": "Curacao",
  "Czechia": "Czech Republic",
  "Congo DR": "DR Congo",
  "Türkiye": "Turkey",
  "United States": "USA",
};
const teamName = (espnName) => NAME_FROM_ESPN[espnName] || espnName;

function statusFrom(type) {
  if (type.completed || type.state === "post") return "ft";
  if (type.name === "STATUS_HALFTIME") return "ht";
  if (type.state === "in") return "live";
  if (type.state === "pre") return "ns";
  return "unknown";
}

export async function handler() {
  try {
    const res = await fetch(`${SCOREBOARD_URL}?dates=${GROUP_STAGE_WINDOW}`);
    const data = await res.json();
    const live = [];

    for (const event of data.events || []) {
      const comp = event.competitions[0];
      const note = comp.altGameNote || "";
      const m = note.match(/Group ([A-L])\b/);
      if (!m) continue; // knockout-stage placeholder, not group stage

      const homeC = comp.competitors.find((c) => c.homeAway === "home");
      const awayC = comp.competitors.find((c) => c.homeAway === "away");
      const statusType = comp.status.type;
      const status = statusFrom(statusType);
      if (status !== "live" && status !== "ht") continue;

      live.push({
        home: teamName(homeC.team.displayName),
        away: teamName(awayC.team.displayName),
        home_score: parseInt(homeC.score, 10),
        away_score: parseInt(awayC.score, 10),
        status,
        minute: status === "live" ? comp.status.displayClock : statusType.description,
        group: m[1],
        fetched_at: Date.now(),
      });
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ live_matches: live }),
    };
  } catch (err) {
    console.error("live.js error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal error" }) };
  }
}
