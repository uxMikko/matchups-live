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

// Official FIFA group-stage match numbers (1-72), from FIFA's own published
// match schedule PDF (FWC26 Match Schedule_v17_10042026_EN) — NOT derivable
// from chronological kickoff order (verified against the PDF: e.g. Curaçao
// v Ecuador is match 34, which kicks off *before* match 36 Tunisia v Japan
// despite both happening the same day — the numbering follows FIFA's fixed
// schedule slot, not pure time order). Keyed by group + both team names
// sorted, so lookup doesn't care which side ESPN lists as home/away.
const GROUP_MATCH_NUMBER = {};
function registerMatchNumber(number, group, teamA, teamB) {
  const key = `${group}|${[teamA, teamB].sort().join("|")}`;
  GROUP_MATCH_NUMBER[key] = number;
}
[
  [1, "A", "Mexico", "South Africa"], [2, "A", "South Korea", "Czech Republic"],
  [3, "B", "Canada", "Bosnia-Herzegovina"], [4, "D", "USA", "Paraguay"],
  [5, "C", "Haiti", "Scotland"], [6, "D", "Australia", "Turkey"],
  [7, "C", "Brazil", "Morocco"], [8, "B", "Qatar", "Switzerland"],
  [9, "E", "Ivory Coast", "Ecuador"], [10, "E", "Germany", "Curacao"],
  [11, "F", "Netherlands", "Japan"], [12, "F", "Sweden", "Tunisia"],
  [13, "H", "Saudi Arabia", "Uruguay"], [14, "H", "Spain", "Cape Verde"],
  [15, "G", "Iran", "New Zealand"], [16, "G", "Belgium", "Egypt"],
  [17, "I", "France", "Senegal"], [18, "I", "Iraq", "Norway"],
  [19, "J", "Argentina", "Algeria"], [20, "J", "Austria", "Jordan"],
  [21, "L", "Ghana", "Panama"], [22, "L", "England", "Croatia"],
  [23, "K", "Portugal", "DR Congo"], [24, "K", "Uzbekistan", "Colombia"],
  [25, "A", "Czech Republic", "South Africa"], [26, "B", "Switzerland", "Bosnia-Herzegovina"],
  [27, "B", "Canada", "Qatar"], [28, "A", "Mexico", "South Korea"],
  [29, "C", "Brazil", "Haiti"], [30, "C", "Scotland", "Morocco"],
  [31, "D", "Turkey", "Paraguay"], [32, "D", "USA", "Australia"],
  [33, "E", "Germany", "Ivory Coast"], [34, "E", "Ecuador", "Curacao"],
  [35, "F", "Netherlands", "Sweden"], [36, "F", "Tunisia", "Japan"],
  [37, "H", "Uruguay", "Cape Verde"], [38, "H", "Spain", "Saudi Arabia"],
  [39, "G", "Belgium", "Iran"], [40, "G", "New Zealand", "Egypt"],
  [41, "I", "Norway", "Senegal"], [42, "I", "France", "Iraq"],
  [43, "J", "Argentina", "Austria"], [44, "J", "Jordan", "Algeria"],
  [45, "L", "England", "Ghana"], [46, "L", "Panama", "Croatia"],
  [47, "K", "Portugal", "Uzbekistan"], [48, "K", "Colombia", "DR Congo"],
  [49, "C", "Scotland", "Brazil"], [50, "C", "Morocco", "Haiti"],
  [51, "B", "Switzerland", "Canada"], [52, "B", "Bosnia-Herzegovina", "Qatar"],
  [53, "A", "Czech Republic", "Mexico"], [54, "A", "South Africa", "South Korea"],
  [55, "E", "Curacao", "Ivory Coast"], [56, "E", "Ecuador", "Germany"],
  [57, "F", "Japan", "Sweden"], [58, "F", "Tunisia", "Netherlands"],
  [59, "D", "Turkey", "USA"], [60, "D", "Paraguay", "Australia"],
  [61, "I", "Norway", "France"], [62, "I", "Senegal", "Iraq"],
  [63, "G", "Egypt", "Iran"], [64, "G", "New Zealand", "Belgium"],
  [65, "H", "Cape Verde", "Saudi Arabia"], [66, "H", "Uruguay", "Spain"],
  [67, "L", "Panama", "England"], [68, "L", "Croatia", "Ghana"],
  [69, "J", "Algeria", "Austria"], [70, "J", "Jordan", "Argentina"],
  [71, "K", "Colombia", "Portugal"], [72, "K", "DR Congo", "Uzbekistan"],
].forEach(([number, group, teamA, teamB]) => registerMatchNumber(number, group, teamA, teamB));

function statusFrom(type) {
  if (type.completed || type.state === "post") return "ft";
  if (type.name === "STATUS_HALFTIME") return "ht";
  if (type.state === "in") return "live";
  if (type.state === "pre") return "ns";
  return "unknown";
}

// ESPN's "in progress" state covers more than just normal play - a
// suspended/delayed match (weather, crowd trouble, etc.) is still
// state "in" but its clock has actually stopped, frozen at whatever
// minute play paused on. Showing that frozen minute as if it were a
// live, ticking clock looks like a bug (a match stuck forever in 45+3'
// stoppage with no indication anything's wrong) - so for these, show
// ESPN's own description ("Delayed") instead, same as halftime/full-time
// already do.
const PAUSED_IN_PROGRESS_NAMES = new Set(["STATUS_DELAYED", "STATUS_SUSPENDED", "STATUS_POSTPONED"]);
function clockIsRunning(status, type) {
  return status === "live" && !PAUSED_IN_PROGRESS_NAMES.has(type.name);
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
      const homeName = teamName(homeC.team.displayName);
      const awayName = teamName(awayC.team.displayName);
      const numberKey = `${m[1]}|${[homeName, awayName].sort().join("|")}`;

      // Every group-stage match (any status) goes into `all` — this backs
      // the "today's games" day-strip, which shows finished/live/upcoming
      // together. `live` stays scoped to live/ht/recent-ft only, since
      // that's what the standings live-overlay and ticker logic need.
      all.push({
        number: GROUP_MATCH_NUMBER[numberKey] ?? null,
        home: homeName,
        away: awayName,
        home_score: status === "ns" ? null : parseInt(homeC.score, 10),
        away_score: status === "ns" ? null : parseInt(awayC.score, 10),
        status,
        minute: clockIsRunning(status, statusType) ? comp.status.displayClock : statusType.description,
        group: m[1],
        kickoff: comp.date,
      });

      if (status !== "live" && status !== "ht" && status !== "ft") continue;
      if (status === "ft" && Date.now() - new Date(comp.date).getTime() > FT_DISPLAY_WINDOW_MS) continue;

      live.push({
        home: homeName,
        away: awayName,
        home_score: parseInt(homeC.score, 10),
        away_score: parseInt(awayC.score, 10),
        status,
        minute: clockIsRunning(status, statusType) ? comp.status.displayClock : statusType.description,
        group: m[1],
        fetched_at: Date.now(),
      });
    }

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
