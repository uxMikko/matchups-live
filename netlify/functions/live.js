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

// A finished match still gets returned (as status "ft") for a while after
// the final whistle, so the frontend doesn't make it vanish instantly —
// it keeps showing the final score until either a new match goes live or
// this window passes. ~200min covers full match + stoppage + a real
// post-match window even for a match that ran long.
const FT_DISPLAY_WINDOW_MS = 200 * 60 * 1000;

export async function handler() {
  try {
    const res = await fetch(`${SCOREBOARD_URL}?dates=${GROUP_STAGE_WINDOW}`);
    const data = await res.json();
    const live = [];
    const all = [];

    for (const event of data.events || []) {
      const comp = event.competitions[0];
      const note = comp.altGameNote || "";
      const m = note.match(/Group ([A-L])\b/);
      if (!m) continue; // knockout-stage placeholder, not group stage

      const homeC = comp.competitors.find((c) => c.homeAway === "home");
      const awayC = comp.competitors.find((c) => c.homeAway === "away");
      const statusType = comp.status.type;
      const status = statusFrom(statusType);

      // Every group-stage match (any status) goes into `all` — this backs
      // the "today's games" day-strip, which shows finished/live/upcoming
      // together. `live` stays scoped to live/ht/recent-ft only, since
      // that's what the standings live-overlay and ticker logic need.
      all.push({
        home: teamName(homeC.team.displayName),
        away: teamName(awayC.team.displayName),
        home_score: status === "ns" ? null : parseInt(homeC.score, 10),
        away_score: status === "ns" ? null : parseInt(awayC.score, 10),
        status,
        minute: status === "live" ? comp.status.displayClock : statusType.description,
        group: m[1],
        kickoff: comp.date,
      });

      if (status !== "live" && status !== "ht" && status !== "ft") continue;
      if (status === "ft" && Date.now() - new Date(comp.date).getTime() > FT_DISPLAY_WINDOW_MS) continue;

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

    // Real official match numbers (1-72) aren't exposed by ESPN, so they're
    // derived the same way R32's 73-88 were verified: chronological order
    // across the whole group stage. Stable across requests since it's a
    // fixed, known kickoff schedule.
    all.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
    all.forEach((m, i) => { m.number = i + 1; });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // CDN-cached for 20s so concurrent visitors share one ESPN call
        // (and one function invocation) instead of each triggering their
        // own — "no-store" here is what blew through Netlify's free-tier
        // usage limits and got the site paused.
        "Cache-Control": "public, max-age=20",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ live_matches: live, all_matches: all }),
    };
  } catch (err) {
    console.error("live.js error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal error" }) };
  }
}
