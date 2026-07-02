const TEAM_CODES = {
  "Mexico":"mx", "South Korea":"kr", "South Africa":"za", "Czech Republic":"cz",
  "Canada":"ca", "Switzerland":"ch", "Qatar":"qa", "Bosnia-Herzegovina":"ba",
  "Brazil":"br", "Morocco":"ma", "Haiti":"ht", "Scotland":"gb-sct",
  "USA":"us", "Paraguay":"py", "Australia":"au", "Turkey":"tr",
  "Germany":"de", "Curacao":"cw", "Ivory Coast":"ci", "Ecuador":"ec",
  "Netherlands":"nl", "Japan":"jp", "Sweden":"se", "Tunisia":"tn",
  "Belgium":"be", "Egypt":"eg", "Iran":"ir", "New Zealand":"nz",
  "Spain":"es", "Cape Verde":"cv", "Saudi Arabia":"sa", "Uruguay":"uy",
  "France":"fr", "Senegal":"sn", "Norway":"no", "Iraq":"iq",
  "Argentina":"ar", "Algeria":"dz", "Austria":"at", "Jordan":"jo",
  "Portugal":"pt", "DR Congo":"cd", "Uzbekistan":"uz", "Colombia":"co",
  "England":"gb-eng", "Croatia":"hr", "Ghana":"gh", "Panama":"pa",
};
function flagImg(team) {
  const code = TEAM_CODES[team];
  if (!code) return `<span class="flag-img" style="display:inline-block;background:#ddd"></span>`;
  return `<img class="flag-img" src="/flags/${code}.svg" alt="">`;
}

// ── I18N ──────────────────────────────────────────────────────────────────────
// LANG is set on `window` by a small inline script in each HTML file before
// this one loads (index.html sets nothing -> defaults to "en"; es/index.html
// sets window.LANG = "es") - one shared app.js, no per-language duplication
// of any of the logic above or below this block. Backend-supplied strings
// (engine.py's "1st Group A"-style placeholder labels for not-yet-resolved
// bracket slots) are NOT covered here - that's a Python-side change, out of
// scope for this frontend-only pass.
const LANG = (typeof window !== "undefined" && window.LANG) || "en";
const I18N = {
  en: {
    odds_badge: "Odds", bet_at: "Bet at",
    bookie_home: "Home", bookie_draw: "Draw", bookie_away: "Away",
    odds_unavailable: "Odds for this match aren't available right now.",
    kicking_off: "Kicking off", countdown_in: "in",
    finished: "Finished", group_label: "Group", tbd: "TBD",
    round_r32: "Round of 32", round_r16: "Round of 16", round_qf: "Quarterfinals",
    round_sf: "Semifinals", round_final: "Final",
    round_r16_singular: "Round of 16", round_qf_singular: "Quarterfinal",
    round_sf_singular: "Semifinal", round_bronze_singular: "Bronze Final",
    round_qf_abbr: "QF", round_sf_abbr: "SF",
    updating_badge: "UPDATING", mp: "MP", gd: "GD", pts: "Pts", prob: "Prob",
    col_grp: "Grp", col_w: "W", col_d: "D", col_l: "L", col_gf: "GF", col_ga: "GA", col_tcs: "TCS",
    updated_just_now: "Updated just now", refresh_now: "Refresh now",
    match_label: "Match", thirds_race_short: "3rd-Place Race", thirds_race: "Third-Place Race",
    thirds_race_odds: "Odds-Based Third-Place Race", live_now: "Live now",
    tie_note: "Tied — who wins on penalties?",
  },
  es: {
    odds_badge: "Cuotas", bet_at: "Apostar en",
    bookie_home: "Local", bookie_draw: "Empate", bookie_away: "Visitante",
    odds_unavailable: "Las cuotas de este partido no están disponibles por ahora.",
    kicking_off: "Comienza ya", countdown_in: "en",
    finished: "Finalizado", group_label: "Grupo", tbd: "Por definir",
    round_r32: "Dieciseisavos", round_r16: "Octavos", round_qf: "Cuartos",
    round_sf: "Semifinales", round_final: "Final",
    round_r16_singular: "Octavos de Final", round_qf_singular: "Cuarto de Final",
    round_sf_singular: "Semifinal", round_bronze_singular: "Tercer Puesto",
    round_qf_abbr: "CF", round_sf_abbr: "SF",
    updating_badge: "ACTUALIZANDO", mp: "PJ", gd: "DG", pts: "Pts", prob: "Prob",
    col_grp: "Gr.", col_w: "G", col_d: "E", col_l: "P", col_gf: "GF", col_ga: "GC", col_tcs: "TCS",
    updated_just_now: "Actualizado justo ahora", refresh_now: "Actualizar ahora",
    match_label: "Partido", thirds_race_short: "Terceros Lugares", thirds_race: "Carrera por el Tercer Lugar",
    thirds_race_odds: "Terceros Lugares Proyectados", live_now: "En vivo",
    tie_note: "Empate — ¿quién gana en penales?",
  },
};
function tr(key) {
  return (I18N[LANG] && I18N[LANG][key]) ?? I18N.en[key] ?? key;
}
function trPredictMatchup(roundName) {
  return LANG === "es" ? `Predice este partido de ${roundName}` : `Predict this ${roundName} matchup`;
}
function trPredictionCleared(matchNum, reason) {
  const reasonText = reason === "group"
    ? (LANG === "es" ? "los resultados de grupo cambiaron quién juega" : "group results changed who's playing")
    : (LANG === "es" ? "resultados anteriores cambiaron quién juega" : "earlier results changed who's playing");
  return LANG === "es"
    ? `La predicción del partido ${matchNum} se borró — ${reasonText}.`
    : `Match ${matchNum}'s prediction was cleared — ${reasonText}.`;
}

// Display-only Spanish team names, keyed by the same canonical English name
// TEAM_CODES uses for flag lookup - that key never changes with language,
// only what's shown as text does.
const TEAM_NAMES_ES = {
  "Mexico": "México", "South Korea": "Corea del Sur", "South Africa": "Sudáfrica",
  "Czech Republic": "República Checa", "Canada": "Canadá", "Switzerland": "Suiza",
  "Qatar": "Catar", "Bosnia-Herzegovina": "Bosnia y Herzegovina", "Brazil": "Brasil",
  "Morocco": "Marruecos", "Haiti": "Haití", "Scotland": "Escocia", "USA": "Estados Unidos",
  "Paraguay": "Paraguay", "Australia": "Australia", "Turkey": "Turquía",
  "Germany": "Alemania", "Curacao": "Curazao", "Ivory Coast": "Costa de Marfil",
  "Ecuador": "Ecuador", "Netherlands": "Países Bajos", "Japan": "Japón",
  "Sweden": "Suecia", "Tunisia": "Túnez", "Belgium": "Bélgica", "Egypt": "Egipto",
  "Iran": "Irán", "New Zealand": "Nueva Zelanda", "Spain": "España",
  "Cape Verde": "Cabo Verde", "Saudi Arabia": "Arabia Saudita", "Uruguay": "Uruguay",
  "France": "Francia", "Senegal": "Senegal", "Norway": "Noruega", "Iraq": "Irak",
  "Argentina": "Argentina", "Algeria": "Argelia", "Austria": "Austria",
  "Jordan": "Jordania", "Portugal": "Portugal", "DR Congo": "RD Congo",
  "Uzbekistan": "Uzbekistán", "Colombia": "Colombia", "England": "Inglaterra",
  "Croatia": "Croacia", "Ghana": "Ghana", "Panama": "Panamá",
};
function tn(name) {
  if (!name || LANG !== "es") return name;
  return TEAM_NAMES_ES[name] || name;
}

let prevBracket = null;
let prevPositions = {};
const updatedSlots = new Set();

// cron-cached, finished-matches-only state (standings/bracket/thirds) —
// refreshed slowly since it only changes when a match actually ends.
let cachedState = {
  standings: {}, bracket: [], thirds_race: [],
  predicted_standings: {}, predicted_bracket: [], predicted_thirds_race: [],
  last_updated: null,
};

// fetched directly from ESPN on every poll, bypassing the cron entirely —
// this is what makes the live score/clock feel actually live.
let liveMatches = [];
let allMatches = []; // every group-stage match (any status) — backs the today's-games strip
let knockoutLiveData = []; // raw knockout live/score data from the live endpoint (keyed by match number)
let allKnockoutMatches = []; // built knockout strip entries (derived from bracket + knockoutLiveData)
const liveTickers = {}; // matchKey -> {baseMinute, fetchedAtMs, status, label}

// ── ODDS / BETTING CONTENT GATING ───────────────────────────────────────────
// Affiliate odds content is opt-IN by country, not opt-out: empty until
// explicitly populated once real affiliate-program market clearance is
// known, so a visitor from an unrecognized/unchecked country never sees it
// by accident. Geo comes from Netlify's own edge geolocation (see
// netlify/functions/geo.js) - fetched once per page load, not per card.
const ODDS_ALLOWED_COUNTRIES = [];
let visitorCountry = null;
let visitorCountryLoaded = false;
async function fetchVisitorGeo() {
  try {
    const res = await fetch("/api/geo");
    const data = await res.json();
    visitorCountry = data.country || null;
  } catch (e) {
    visitorCountry = null;
  } finally {
    visitorCountryLoaded = true;
    renderAll();
  }
}
function oddsGeoAllowed() {
  return ODDS_ALLOWED_COUNTRIES.includes(visitorCountry);
}

// Separate gate from geo, and deliberately not combined into one check:
// oddsGeoAllowed() controls whether a neutral "Odds" badge (no figures,
// no bookmaker names) appears at all; this controls what happens when
// it's clicked - confirmed once per browser (localStorage) and persists,
// so actual odds/bookmaker content only ever renders after this is true.
const BETTING_AGE_KEY = "bettingAgeConfirmed";
function bettingAgeConfirmed() {
  return localStorage.getItem(BETTING_AGE_KEY) === "yes";
}

// bot/odds_api.py's bookmaker_odds is keyed by its own home/away
// orientation (whichever side The Odds API called home) - re-orient to
// match whatever home/away this specific call site is using before
// handing it back, so callers never have to think about that.
function realOddsFor(home, away) {
  const entry = (cachedState.real_odds || {})[[home, away].sort().join("|")];
  const bm = entry?.bookmaker_odds;
  if (!bm || Object.keys(bm).length === 0) return null;
  const flip = entry.home !== home;
  const reorient = o => !o ? null : flip ? { home: o.away, draw: o.draw, away: o.home } : o;
  return { unibet: reorient(bm.unibet), betsson: reorient(bm.betsson) };
}
function hasRealOdds(home, away) {
  return !!realOddsFor(home, away);
}

// Pre-confirmation, this is the only "betting content" any visitor sees -
// a plain text label, no odds figures, no bookmaker names - clicking it is
// what triggers the age gate. Returns "" (renders nothing) unless the
// visitor's country is on the allow-list AND real odds actually exist for
// this exact matchup.
function oddsBadgeHtml(home, away) {
  if (!home || !away || !oddsGeoAllowed() || !hasRealOdds(home, away)) return "";
  return `<button type="button" class="odds-badge" data-home="${home}" data-away="${away}">${tr("odds_badge")}</button>`;
}
function wireOddsBadges(container) {
  container.querySelectorAll(".odds-badge").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // cards this sits inside may have their own click handler
      openOddsModal(btn.dataset.home, btn.dataset.away);
    });
  });
}

// Generic "do this once 18+ is confirmed" gate - openOddsModal and the
// futures-bet banner buttons both funnel through this rather than each
// keeping their own pending-action state.
let pendingAgeGateAction = null;
function requireAgeGate(action) {
  if (!bettingAgeConfirmed()) {
    pendingAgeGateAction = action;
    document.getElementById("age-gate-backdrop").style.display = "flex";
    return;
  }
  action();
}
function openOddsModal(home, away) {
  requireAgeGate(() => renderOddsModal(home, away));
}
function bookieOddsRow(name, href, o) {
  return `<div class="bookie-row">
    <div class="bookie-row-top">
      <span class="bookie-name">${name}</span>
      <a class="bookie-link" href="${href}" target="_blank" rel="noopener noreferrer sponsored">${tr("bet_at")} ${name}</a>
    </div>
    <div class="bookie-odds-cells">
      <div class="bookie-odds-cell"><span class="bookie-odds-label">${tr("bookie_home")}</span><span class="bookie-odds-value">${o.home.toFixed(2)}</span></div>
      <div class="bookie-odds-cell"><span class="bookie-odds-label">${tr("bookie_draw")}</span><span class="bookie-odds-value">${o.draw.toFixed(2)}</span></div>
      <div class="bookie-odds-cell"><span class="bookie-odds-label">${tr("bookie_away")}</span><span class="bookie-odds-value">${o.away.toFixed(2)}</span></div>
    </div>
  </div>`;
}
function renderOddsModal(home, away) {
  const odds = realOddsFor(home, away) || {};
  document.getElementById("odds-modal-title").textContent = `${tn(home)} vs ${tn(away)}`;
  const rows = [
    odds.unibet ? bookieOddsRow("Unibet", "https://www.unibet.com", odds.unibet) : "",
    odds.betsson ? bookieOddsRow("Betsson", "https://www.betsson.com", odds.betsson) : "",
  ].filter(Boolean);
  document.getElementById("odds-modal-body").innerHTML = rows.join("")
    || `<p class="odds-modal-empty">${tr("odds_unavailable")}</p>`;
  document.getElementById("odds-modal-backdrop").style.display = "flex";
}
document.getElementById("age-gate-confirm").addEventListener("click", () => {
  localStorage.setItem(BETTING_AGE_KEY, "yes");
  document.getElementById("age-gate-backdrop").style.display = "none";
  const action = pendingAgeGateAction;
  pendingAgeGateAction = null;
  if (action) action();
});
function closeAgeGate() {
  document.getElementById("age-gate-backdrop").style.display = "none";
  pendingAgeGateAction = null;
}
document.getElementById("age-gate-cancel").addEventListener("click", closeAgeGate);
document.getElementById("age-gate-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "age-gate-backdrop") closeAgeGate();
});
document.getElementById("odds-modal-close").addEventListener("click", () => {
  document.getElementById("odds-modal-backdrop").style.display = "none";
});
document.getElementById("odds-modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "odds-modal-backdrop") document.getElementById("odds-modal-backdrop").style.display = "none";
});

// ── MATCHUP INFO MODAL ────────────────────────────────────────────────────────
let _matchupModalData = {};   // matchNum → { kickoff, home, away }
let _matchupOddsMode = "decimal";
let _matchupOpenNum = null;

const _STD_FRACS = [
  [1,10],[1,8],[1,7],[1,6],[1,5],[2,9],[1,4],[2,7],[1,3],[2,5],[4,9],
  [1,2],[8,15],[4,7],[4,6],[8,11],[4,5],[10,11],[1,1],
  [6,5],[5,4],[11,8],[6,4],[13,8],[7,4],[15,8],[2,1],[9,4],[5,2],
  [11,4],[3,1],[10,3],[7,2],[4,1],[9,2],[5,1],[11,2],[6,1],[13,2],
  [7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[14,1],[16,1],[18,1],
  [20,1],[25,1],[33,1],[40,1],[50,1],[66,1],[80,1],[100,1],
];
function _toFractional(dec) {
  const net = dec - 1;
  if (net <= 0) return "—";
  if (net >= 100) return `${Math.round(net)}/1`;
  let best = _STD_FRACS[0], bestErr = Infinity;
  for (const [n, d] of _STD_FRACS) {
    const err = Math.abs(n / d - net);
    if (err < bestErr) { bestErr = err; best = [n, d]; }
  }
  return `${best[0]}/${best[1]}`;
}
function _fmtOdds(dec) {
  return _matchupOddsMode === "fractional" ? _toFractional(dec) : dec.toFixed(2);
}

function openMatchupInfoModal(num) {
  const data = _matchupModalData[num];
  if (!data) return;
  _matchupOpenNum = num;
  let titleText = "";
  if (data.kickoff) {
    const d = new Date(data.kickoff);
    titleText = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
      + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } else {
    titleText = knockoutRoundLabel(num) || `Match ${num}`;
  }
  document.getElementById("matchup-info-title").textContent = titleText;
  _renderMatchupInfoBody();
  document.getElementById("matchup-info-backdrop").style.display = "flex";
}

function _mimFlagHtml(team) {
  const code = TEAM_CODES[team];
  if (!code) return `<span class="mim-flag" style="background:#ddd"></span>`;
  return `<img class="mim-flag" src="/flags/${code}.svg" alt="">`;
}

function _renderMatchupInfoBody() {
  const num = _matchupOpenNum;
  const data = _matchupModalData[num];
  if (!data) return;
  const { kickoff, home, away } = data;
  const hasHome = !!home?.team, hasAway = !!away?.team;

  // Live/result state from allKnockoutMatches (always up-to-date)
  const liveM = allKnockoutMatches.find(x => x.number === num);
  const matchStatus = liveM?.status ?? "ns";
  const homeScore = liveM?.home_score ?? null;
  const awayScore = liveM?.away_score ?? null;
  const isFinished = matchStatus === "ft";
  const isLive = matchStatus === "live" || matchStatus === "ht";

  // Win probabilities: match h2h odds first (p_draw=0 = knockout 2-way market),
  // then tournament outright ratio. No ELO.
  const oddsKey = hasHome && hasAway ? [home.team, away.team].sort().join("|") : null;
  const oddsEntry = oddsKey ? (cachedState.real_odds?.[oddsKey] ?? null) : null;
  const isKnockoutH2h = oddsEntry && (oddsEntry.p_draw ?? 1) < 0.01;
  let pHome = null, pAway = null;
  let probSource = null;
  if (isKnockoutH2h) {
    const flip = oddsEntry.home !== home.team;
    pHome = flip ? oddsEntry.p_away : oddsEntry.p_home;
    pAway = flip ? oddsEntry.p_home : oddsEntry.p_away;
    probSource = "h2h";
  } else {
    const tp = cachedState.tournament_probs || {};
    const tH = hasHome ? tp[home.team] : null;
    const tA = hasAway ? tp[away.team] : null;
    if (tH > 0 && tA > 0) {
      ({ h: pHome, a: pAway } = outrightToMatchProb(tH, tA, num));
      probSource = "outright";
    }
  }
  const pct = (v) => Math.round(v * 100);
  const useOdds = probSource === "h2h";

  let html = "";

  // ── Team header: flag above name above win probability ─────────────────────
  if (hasHome && hasAway) {
    const { cls: hCls } = pHome != null ? matchWinPill(pHome) : { cls: "tier-grey" };
    const { cls: aCls } = pAway != null ? matchWinPill(pAway) : { cls: "tier-grey" };
    html += `<div class="mim-teams">
      <div class="mim-team">
        ${_mimFlagHtml(home.team)}
        <span class="mim-team-name">${tn(home.team)}</span>
        ${pHome != null ? `<span class="mim-team-prob team-prob-pill ${hCls}">${pct(pHome)}%</span>` : ""}
      </div>
      <div class="mim-vs-col">vs</div>
      <div class="mim-team">
        ${_mimFlagHtml(away.team)}
        <span class="mim-team-name">${tn(away.team)}</span>
        ${pAway != null ? `<span class="mim-team-prob team-prob-pill ${aCls}">${pct(pAway)}%</span>` : ""}
      </div>
    </div>`;
  }

  // ── Match state: finished score / live score / kickoff date ───────────────
  if (isFinished && homeScore != null && awayScore != null) {
    const penLine = liveM?.decided_by_pen && liveM?.pen_home != null && liveM?.pen_away != null
      ? `<div class="mim-score-meta">AET · PEN ${liveM.pen_home}–${liveM.pen_away}</div>`
      : `<div class="mim-score-meta">Final</div>`;
    html += `<div class="mim-score-display">
      <div class="mim-score-nums">${homeScore} – ${awayScore}</div>
      ${penLine}
    </div>`;
  } else if (isLive && homeScore != null && awayScore != null) {
    const minLabel = liveM?.minute ? `${liveM.minute}'` : (matchStatus === "ht" ? "HT" : "Live");
    html += `<div class="mim-score-display">
      <div class="mim-score-nums">${homeScore} – ${awayScore}</div>
      <div class="mim-score-meta"><span class="mim-live-dot"></span>${minLabel}</div>
    </div>`;
  }

  // ── Odds / ELO section (skip when finished — result speaks for itself) ────
  if (!isFinished) {
    if (pHome != null) {
      const fairH = 1 / pHome, fairA = 1 / pAway;
      html += `<div class="mim-odds-toggle">
        <button class="mim-toggle-btn${_matchupOddsMode === "decimal" ? " active" : ""}" data-mode="decimal">Decimal</button>
        <button class="mim-toggle-btn${_matchupOddsMode === "fractional" ? " active" : ""}" data-mode="fractional">Fractional</button>
      </div>
      <div class="mim-odds-row">
        <div class="mim-odds-cell">
          <span class="mim-odds-value">${_fmtOdds(fairH)}</span>
        </div>
        <div class="mim-odds-cell">
          <span class="mim-odds-value">${_fmtOdds(fairA)}</span>
        </div>
      </div>`;

      if (probSource === "h2h") {
        html += `<div class="mim-source"><span class="mim-source-icon">ⓘ</span>Market-implied win probabilities averaged across bookmakers and de-vigged. Reflects chance to advance including extra time and penalties.</div>`;
      } else if (probSource === "outright") {
        html += `<div class="mim-source"><span class="mim-source-icon">ⓘ</span>Derived from tournament outright (winner) market odds — ratio of each team's implied probability of winning the tournament.</div>`;
      }
    }
  }

  document.getElementById("matchup-info-body").innerHTML = html;

  document.querySelectorAll(".mim-toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      _matchupOddsMode = btn.dataset.mode;
      _renderMatchupInfoBody();
    });
  });
}

document.getElementById("matchup-info-close").addEventListener("click", () => {
  document.getElementById("matchup-info-backdrop").style.display = "none";
});
document.getElementById("matchup-info-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "matchup-info-backdrop") document.getElementById("matchup-info-backdrop").style.display = "none";
});

// Delegated click handler — wired once; data populated fresh on each render
document.getElementById("predicted-bracket-grid").addEventListener("click", (e) => {
  if (e.target.closest(".odds-badge")) return;
  const card = e.target.closest("[data-match-num]");
  if (!card) return;
  const num = parseInt(card.dataset.matchNum, 10);
  if (!_matchupModalData[num]) return;
  openMatchupInfoModal(num);
});

// Root-domain-only placeholders, same reasoning as the per-match bookie
// links above: no verified, stable deep link to either operator's actual
// World Cup outright-winner market exists yet - swap these for real
// tracking links once the affiliate accounts are approved.
const FUTURES_BOOKIE_LINKS = {
  unibet: "https://www.unibet.com",
  betsson: "https://www.betsson.com",
};
function updateFuturesBanner() {
  document.getElementById("futures-bet-banner").style.display = oddsGeoAllowed() ? "flex" : "none";
}
document.querySelectorAll(".futures-bet-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const href = FUTURES_BOOKIE_LINKS[btn.dataset.bookie];
    requireAgeGate(() => window.open(href, "_blank", "noopener,noreferrer"));
  });
});

function matchKey(m) { return `${m.home}_${m.away}`; }

function parseMinute(label) {
  const m = String(label || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// Ticks the displayed minute forward locally between polls (every poll
// resyncs to ESPN's real value), so the clock never visibly freezes even
// though the live endpoint is only fetched every ~15s. Stoppage time
// ("45'+3'", "90'+6'") isn't extrapolated — there's no way to know how
// much added time the referee will give, so once it appears we just show
// ESPN's own latest value verbatim until the next poll updates it, rather
// than silently dropping the "+X" and free-running the minute past 90.
function tickingMinuteLabel(m) {
  const t = liveTickers[matchKey(m)];
  if (!t || t.status !== "live" || t.baseMinute == null) return m.minute || "–";
  if (t.hasStoppage) return t.rawLabel || m.minute || "–";
  const elapsedMin = Math.floor((Date.now() - t.fetchedAtMs) / 60000);
  return `${t.baseMinute + elapsedMin}'`;
}

// Overlays the live in-progress score onto the cached (finished-matches-
// only) standings and re-sorts just the affected groups, so positions/
// points update immediately rather than waiting for the match to end and
// the cron to catch up. Tiebreaks beyond points/GD/GF (official rank,
// fair play) aren't applied here — acceptable for a transient live
// preview that gets superseded by the real backend computation once the
// match finishes.
function applyLiveOverlay(standings, liveMatches) {
  if (!liveMatches || liveMatches.length === 0) return standings;
  const out = {};
  for (const g of Object.keys(standings)) out[g] = standings[g].map(t => ({ ...t }));

  for (const m of liveMatches) {
    const teams = out[m.group];
    if (!teams) continue;
    const home = teams.find(t => t.name === m.home);
    const away = teams.find(t => t.name === m.away);
    if (!home || !away) continue;

    home.played += 1; away.played += 1;
    home.goals_for += m.home_score; home.goals_against += m.away_score;
    away.goals_for += m.away_score; away.goals_against += m.home_score;
    if (m.home_score > m.away_score) { home.won += 1; away.lost += 1; }
    else if (m.home_score === m.away_score) { home.drawn += 1; away.drawn += 1; }
    else { away.won += 1; home.lost += 1; }
    home.points = home.won * 3 + home.drawn;
    away.points = away.won * 3 + away.drawn;
    home.goal_diff = home.goals_for - home.goals_against;
    away.goal_diff = away.goals_for - away.goals_against;

    out[m.group] = teams.slice().sort((a, b) =>
      b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for
    );
  }
  return out;
}

// ── TODAY'S GAMES ─────────────────────────────────────────────────────────────
let lastTodayFocusKey = null;

// Built manually (not toLocaleString) so the hour always gets a leading
// zero ("02:00", not "2:00") and never flips to a 12-hour AM/PM format
// depending on the viewer's browser locale.
function formatKickoffTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Plain time for a card kicking off today (local calendar day), "Jun 25 -
// 23:00" for anything later — the strip now scrolls across every remaining
// match, not just today's, so a card several days out needs the date or
// its time alone is meaningless.
function formatKickoffTimeOrDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  if (d.toDateString() === new Date().toDateString()) return formatKickoffTime(iso);
  const month = d.toLocaleString(undefined, { month: "short" });
  return `${month} ${d.getDate()} - ${formatKickoffTime(iso)}`;
}

// Hours away ticks in whole minutes (no point churning seconds an hour
// out); under an hour switches to a live MM:SS countdown, since that's
// where a ticking clock actually feels worth watching.
function formatCountdown(iso) {
  const diffMs = new Date(iso) - new Date();
  if (diffMs <= 0) return tr("kicking_off");
  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h >= 1) return `${tr("countdown_in")} ${h}h ${String(m).padStart(2, "0")}m`;
  return `${tr("countdown_in")} ${m}:${String(s).padStart(2, "0")}`;
}

// Shows live games, every match still to come (no matter how far out —
// scrolling further is fine, see formatKickoffTimeOrDate below for how a
// card past today gets dated), and anything finished within the last 24h
// so a just-played result doesn't vanish from the strip immediately.
// Falls back to the single nearest day's matches only once the whole
// tournament's done and there's nothing live/upcoming/recent left at all.
const RECENT_FINISHED_WINDOW_MS = 24 * 60 * 60 * 1000;

function knockoutRoundLabel(num) {
  if (num <= 88)  return tr("round_r32");
  if (num <= 96)  return tr("round_r16");
  if (num <= 100) return tr("round_qf_singular");
  if (num <= 102) return tr("round_sf_singular");
  if (num === 103) return tr("round_bronze_singular");
  return tr("round_final");
}

// Raw tournament outright ratio w_A/(w_A+w_B) inflates strong teams because
// the outright probability already encodes winning n further matches. Taking the
// n-th root converts it back to a single-match probability:
//   w ≈ p_match^n  →  p_match ≈ w^(1/n)
// n = rounds from THIS match to the championship (inclusive).
function outrightToMatchProb(tH, tA, matchNum) {
  const n = matchNum >= 89 && matchNum <= 96 ? 4
          : matchNum >= 97 && matchNum <= 100 ? 3
          : matchNum >= 101 && matchNum <= 102 ? 2
          : 1; // Final, Bronze, or unknown
  const pH = Math.pow(tH, 1 / n);
  const pA = Math.pow(tA, 1 / n);
  return { h: pH / (pH + pA), a: pA / (pH + pA) };
}

// Build strip entries for all known knockout matches. cachedState.bracket
// starts with 16 R32 entries (teams known once the group stage is settled)
// and grows to include R16/QF/SF/Final entries as the engine propagates
// results through the bracket. Live scores/status come from allKnockoutMatches
// (populated by the live endpoint once knockout polling is added).
function buildKnockoutStripEntries() {
  if (!cachedState?.bracket) return [];
  const liveByNum = {};
  for (const m of knockoutLiveData) {
    if (m.number) liveByNum[m.number] = m;
  }
  // Map each match number to the team that appears as home/away in the next
  // round — that team won. Handles ET/penalty results where the score ties.
  // KNOCKOUT_FEEDERS[laterNum] = [feeder0, feeder1]; feeder0 → home, feeder1 → away.
  const laterByNum = {};
  for (const m of cachedState.bracket.slice(16)) {
    if (m.match_number) laterByNum[m.match_number] = m;
  }
  const winnerOf = {};
  for (const [laterStr, feeders] of Object.entries(KNOCKOUT_FEEDERS)) {
    const laterM = laterByNum[parseInt(laterStr)];
    if (!laterM) continue;
    if (feeders[0] != null && laterM.home?.team) winnerOf[feeders[0]] = laterM.home.team;
    if (feeders[1] != null && laterM.away?.team) winnerOf[feeders[1]] = laterM.away.team;
  }

  const entries = [];
  for (const m of cachedState.bracket) {
    if (!m.home?.team || !m.away?.team || !m.match_number) continue;
    const live = liveByNum[m.match_number];
    // Live endpoint is authoritative for in-progress; bracket entry (from Redis/refresh.py)
    // covers concluded matches that have aged out of ESPN's live scoreboard.
    const hs = live?.home_score ?? m.home_score ?? null;
    const as_ = live?.away_score ?? m.away_score ?? null;
    const status = live?.status ?? m.status ?? "ns";
    const decidedByPen = live?.decided_by_pen ?? m.decided_by_pen ?? false;
    const penHome = live?.pen_home ?? m.pen_home ?? null;
    const penAway = live?.pen_away ?? m.pen_away ?? null;
    // winner: from next-round bracket (most reliable), then bracket's own winner
    // field (set by refresh.py for penalty matches), then score comparison.
    let winner = winnerOf[m.match_number] ?? m.winner ?? null;
    if (!winner && status === "ft" && hs != null && as_ != null && hs !== as_) {
      winner = hs > as_ ? m.home.team : m.away.team;
    }
    if (!winner && status === "ft" && decidedByPen) {
      winner = penHome != null && penAway != null
        ? (penHome > penAway ? m.home.team : m.away.team)
        : null;
    }
    entries.push({
      number: m.match_number,
      home: m.home.team,
      away: m.away.team,
      home_score: hs,
      away_score: as_,
      minute: live?.minute ?? null,
      status,
      winner,
      kickoff: m.kickoff ?? KNOCKOUT_KICKOFFS[m.match_number],
      round_label: knockoutRoundLabel(m.match_number),
      decided_by_pen: decidedByPen,
      pen_home: penHome,
      pen_away: penAway,
    });
  }
  return entries;
}

function renderTodayStrip(allMatches) {
  const section = document.getElementById("today-section");
  const container = document.getElementById("today-matches-container");
  if (!allMatches || allMatches.length === 0) {
    section.style.display = "none";
    return;
  }

  const now = new Date();
  let windowMatches = allMatches.filter(m => {
    if (m.status === "live" || m.status === "ht") return true;
    if (m.status === "ft") return (now - new Date(m.kickoff)) <= RECENT_FINISHED_WINDOW_MS;
    return true; // every upcoming match, regardless of how far out
  });

  if (windowMatches.length === 0) {
    let closest = null, bestDist = Infinity;
    for (const m of allMatches) {
      const dist = Math.abs(new Date(m.kickoff) - now);
      if (dist < bestDist) { bestDist = dist; closest = m; }
    }
    if (!closest) {
      section.style.display = "none";
      return;
    }
    const day = new Date(closest.kickoff).toDateString();
    windowMatches = allMatches.filter(m => new Date(m.kickoff).toDateString() === day);
  }

  windowMatches.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  section.style.display = "block";

  // Every upcoming match sharing the *earliest* kickoff gets a live
  // countdown, not just the first one in sort order - two matches often
  // kick off at the exact same time, and both should count down together.
  const nextKickoff = windowMatches.find(m => m.status !== "live" && m.status !== "ht" && m.status !== "ft")?.kickoff;

  container.innerHTML = windowMatches.map(m => {
    const isLive = m.status === "live" || m.status === "ht";
    const isFinished = m.status === "ft";
    const showScore = isLive || isFinished;
    const isNextUpcoming = !isLive && !isFinished && nextKickoff && m.kickoff === nextKickoff;

    // One slot now carries both the status and whatever time is relevant
    // to it - live games show the ticking minute (red), the next upcoming
    // game counts down to kickoff, every other upcoming game shows its
    // kickoff time (dated if it's not today, since the strip now scrolls
    // across every remaining match), finished games just say "Finished"
    // since there's no extra time worth a whole separate row for that.
    const statusLabel = isLive
      ? `<span class="today-status live"><span class="today-live-dot"></span>${tickingMinuteLabel(m)}</span>`
      : isFinished
        ? `<span class="today-status">${tr("finished")}</span>`
        : isNextUpcoming
          ? `<span class="today-status countdown">${formatCountdown(m.kickoff)}</span>`
          : `<span class="today-status">${formatKickoffTimeOrDate(m.kickoff)}</span>`;

    const scoreSpan = (score) => showScore
      ? `<span class="today-team-score${isLive ? " live" : ""}">${score ?? ""}</span>`
      : "";

    return `
    <div class="today-card${isLive ? " live" : ""}${isFinished ? " finished" : ""}" data-number="${m.number}">
      <div class="today-card-top">
        <span class="today-match-num">${m.number}</span>
        <span class="today-group">${m.round_label ?? (tr("group_label") + " " + m.group)}</span>
        ${statusLabel}
      </div>
      <div class="today-team-row">
        ${flagImg(m.home)}
        <span class="today-team-name">${tn(m.home)}</span>
        ${scoreSpan(m.home_score)}
      </div>
      <div class="today-team-row">
        ${flagImg(m.away)}
        <span class="today-team-name">${tn(m.away)}</span>
        ${scoreSpan(m.away_score)}
      </div>
      ${oddsBadgeHtml(m.home, m.away) ? `<div class="today-card-odds">${oddsBadgeHtml(m.home, m.away)}</div>` : ""}
    </div>`;
  }).join("");
  wireOddsBadges(container);

  // Auto-scroll so the live game (or, if none, the next upcoming one) sits
  // at the left edge of the visible strip - finished games scroll off to
  // the left since they're the least important once they're over. Only
  // re-applied when the focus actually changes, so it doesn't fight a
  // user who's manually scrolled elsewhere in the strip.
  const liveIdx = windowMatches.findIndex(m => m.status === "live" || m.status === "ht");
  const upcomingIdx = windowMatches.findIndex(m => m.status !== "ft" && m.status !== "live" && m.status !== "ht");
  const focusIdx = liveIdx !== -1 ? liveIdx : upcomingIdx;
  if (focusIdx !== -1) {
    const focusKey = matchKey(windowMatches[focusIdx]);
    if (focusKey !== lastTodayFocusKey) {
      lastTodayFocusKey = focusKey;
      container.children[focusIdx]?.scrollIntoView({ inline: "start", block: "nearest" });
    }
  }
}

// Runs every second to keep the live minute / countdown text current,
// without rebuilding the cards themselves - rebuilding via innerHTML every
// second was destroying and recreating every flag <img>, which showed up
// as the flags visibly blinking once a second (worst on mobile, where
// image decode/paint is slower). Only the .today-status text node is
// touched here; flags, scores, and everything else are left alone.
function tickTodayStatuses() {
  document.querySelectorAll("#today-matches-container .today-card[data-number]").forEach(card => {
    const num = parseInt(card.dataset.number, 10);
    const m = allMatches.find(x => x.number === num) ?? allKnockoutMatches.find(x => x.number === num);
    if (!m) return;
    const statusEl = card.querySelector(".today-status");
    if (!statusEl) return;
    if (statusEl.classList.contains("live")) {
      statusEl.innerHTML = `<span class="today-live-dot"></span>${tickingMinuteLabel(m)}`;
    } else if (statusEl.classList.contains("countdown")) {
      statusEl.textContent = formatCountdown(m.kickoff);
    }
  });
}

function scrollTodayStrip(dir) {
  const container = document.getElementById("today-matches-container");
  container.scrollBy({ left: dir * (container.clientWidth * 0.8), behavior: "smooth" });
}
document.getElementById("today-arrow-left").addEventListener("click", () => scrollTodayStrip(-1));
document.getElementById("today-arrow-right").addEventListener("click", () => scrollTodayStrip(1));

// ── BRACKET ───────────────────────────────────────────────────────────────────
function detectChanges(newBracket) {
  if (!prevBracket) return;
  const prevMap = Object.fromEntries(prevBracket.map(m => [m.slot, m]));
  for (const match of newBracket) {
    const prev = prevMap[match.slot];
    if (!prev) continue;
    const changed =
      prev.home?.team !== match.home?.team ||
      prev.away?.team !== match.away?.team;
    if (changed) updatedSlots.add(match.slot);
  }
  setTimeout(() => updatedSlots.clear(), 360000); // clear after 6 min
}

// THE canonical tie-card renderer — one component for every "Live Standings"
// bracket card and every TBD/partial slot across all tabs. resultCard() handles
// the separate result-layout (Odds-Based / Lab) and is NOT replaced.
//
// home/away: team objects (with .team, .seed, .prob) or null/undefined for TBD.
// homeFeeder/awayFeeder: feeder match number (e.g. 74) for R16+ slots; the seed
//   slot shows "{feederPrefix}{n}" (e.g. "W74"). Omit for R32 where t.seed
//   already contains the group seed ("1E", "2B", etc).
// showProb: show advancement-probability pills, suppressed at 100% (certain).
// homeScore/awayScore: show the final/live score instead of a pill when set.
// kickoff: explicit ISO date string; falls back to KNOCKOUT_KICKOFFS[num] (R16+)
//   then to nothing. R32 always passes m.kickoff since they're not in that map.
function bracketTieCard(num, home, away, {
  style = "", extraClass = "", attrs = "",
  kickoff = null,
  homeFeeder = null, awayFeeder = null, feederPrefix = "W",
  showProb = false,
  homeScore = null, awayScore = null,
  homeIsLoser = false, awayIsLoser = false,
  isUpdated = false,
  showOddsBadge = false,
  decidedByPen = false, penHome = null, penAway = null,
} = {}) {
  const date = kickoff ?? KNOCKOUT_KICKOFFS[num];
  const hasTbd = !home?.team || !away?.team;
  const classes = ["tie-card", hasTbd ? "tbd-card" : "", extraClass, isUpdated ? "just-updated" : ""]
    .filter(Boolean).join(" ");

  const row = (t, feederNum, score, isLoser, penScore = null) => {
    const seedStr = feederNum != null ? `${feederPrefix}${feederNum}` : (t?.seed ?? "");
    if (!t?.team) {
      return `<div class="tbd-team">
        <span class="seed">${seedStr}</span>
        <span class="flag-placeholder">?</span>
        <span class="name">${tr("tbd")}</span>
      </div>`;
    }
    // For upcoming knockout matches: show win probability from real odds only.
    // Priority: (1) match h2h odds (p_draw=0 = actual knockout 2-way market),
    // (2) tournament outright ratio p_A/(p_A+p_B). No ELO fallback.
    let prob = t.prob || 0;
    if (home?.team && away?.team && score == null) {
      const oddsKey = [home.team, away.team].sort().join("|");
      const oddsEntry = cachedState.real_odds?.[oddsKey];
      if (oddsEntry && (oddsEntry.p_draw ?? 1) < 0.01) {
        const flip = oddsEntry.home !== home.team;
        prob = t.team === home.team
          ? (flip ? oddsEntry.p_away : oddsEntry.p_home)
          : (flip ? oddsEntry.p_home : oddsEntry.p_away);
      } else {
        const tp = cachedState.tournament_probs || {};
        const tH = tp[home.team], tA = tp[away.team];
        if (tH > 0 && tA > 0) {
          const { h: hWin } = outrightToMatchProb(tH, tA, num);
          prob = t.team === home.team ? hWin : 1 - hWin;
        }
      }
    }
    const { pct: probPct, cls: pillCls } = matchWinPill(prob);
    let right = "";
    if (score != null) {
      const penStr = penScore != null ? `<span class="pen-score">(${penScore})</span>` : "";
      right = `<span class="tie-score">${score}${penStr}</span>`;
    } else if (showProb && prob > 0) {
      right = `<span class="team-prob-pill ${pillCls}">${probPct}%</span>`;
    }
    return `<div class="tie-team${isLoser ? " loser" : ""}">
      <span class="seed">${seedStr}</span>
      ${flagImg(t.team)}
      <span class="name">${tn(t.team)}</span>
      ${right}
    </div>`;
  };

  const badge = showOddsBadge && home?.team && away?.team ? oddsBadgeHtml(home.team, away.team) : "";

  return `<div class="${classes}" data-match-num="${num}" style="${style}" ${attrs}>
    <div class="tie-top">
      <span class="match-num">${num}</span>
      ${date ? `<span class="match-date">${formatKickoff(date)}</span>` : ""}
      ${isUpdated ? `<span class="updating-badge">🔴 ${tr("updating_badge")}</span>` : ""}
      ${badge}
    </div>
    ${row(home, homeFeeder, homeScore, homeIsLoser, decidedByPen ? penHome : null)}
    ${row(away, awayFeeder, awayScore, awayIsLoser, decidedByPen ? penAway : null)}
  </div>`;
}

// Shared by the Odds-Based Projection bracket and the Simulator bracket: a
// match number on the left, two stacked team rows on the right, each row's
// right-hand slot showing the seed code ("1F") until a score exists, then
// the score itself - no "vs" divider, no probability pill (neither tab
// claims an exact result, so showing percentages there invites more
// confidence than the number deserves).
//
// isWinner is only meaningful for R16-onward Simulator rows, where both
// teams are already real/projected (R32 still shows its group seed - "1F"
// is useful context there, "W74" on a row that already says "Germany"
// isn't): true draws the green winner badge, false leaves the slot blank,
// undefined (R32, or any row with no winner concept) falls back to the
// seed-code display.
function resultTeamRow(t, score, isWinner, rightLabel = null, prob = null, penScore = null) {
  if (!t || !t.team) {
    return `<div class="result-team">
      <span class="name" style="color:#9aa0ad">${t?.label || tr("tbd")}</span>
      <span class="result-right muted">${t?.seed ?? ""}</span>
    </div>`;
  }
  let right;
  if (score != null) {
    const penStr = penScore != null ? `<span class="pen-score">(${penScore})</span>` : "";
    right = `<span class="result-right scored">${score}${penStr}</span>`;
  } else if (isWinner === true) {
    right = `<span class="winner-badge">W</span>`;
  } else if (isWinner === false) {
    right = "";
  } else if (prob != null && prob > 0) {
    const { pct, cls } = matchWinPill(prob);
    right = `<span class="team-prob-pill ${cls}">${pct}%</span>`;
  } else {
    const label = rightLabel ?? t.seed ?? "";
    right = label ? `<span class="result-right muted">${label}</span>` : "";
  }
  return `<div class="result-team${isWinner === false ? " loser" : ""}">
    ${flagImg(t.team)}
    <span class="name">${tn(t.team)}</span>
    ${right}
  </div>`;
}
function resultCard(num, home, away, { homeScore = null, awayScore = null, homeIsWinner, awayIsWinner, extraClass = "", style = "", attrs = "", homeLabel = null, awayLabel = null, homeProb = null, awayProb = null, showOddsBadge = true, decidedByPen = false, penHome = null, penAway = null } = {}) {
  const badge = showOddsBadge && home?.team && away?.team ? oddsBadgeHtml(home.team, away.team) : "";
  return `<div class="tie-card result-card${extraClass ? " " + extraClass : ""}" style="${style}" ${attrs}>
    <span class="result-num">${num}</span>
    <div class="result-rows">
      ${resultTeamRow(home, homeScore, homeIsWinner, homeLabel, homeProb, decidedByPen ? penHome : null)}
      ${resultTeamRow(away, awayScore, awayIsWinner, awayLabel, awayProb, decidedByPen ? penAway : null)}
    </div>
    ${badge ? `<div class="result-card-odds">${badge}</div>` : ""}
  </div>`;
}

// Browser's own locale + timezone — no timeZone option means it converts
// from the UTC kickoff to whatever local time the viewer's device is set to.
function formatKickoff(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Later rounds (R16/QF/SF/Final) have no real data yet — they depend on
// actual R32 results, so who plays in them is never shown (see
// engine.compute_predicted_state's docstring on why projecting a guess on
// top of a guess isn't worth it). The match's real kickoff time, though,
// is fixed by FIFA's schedule regardless of who qualifies into it - both
// the times and the feeder structure below are read straight off FIFA's
// official Match Schedule PDF (10 April 2026 edition) and cross-checked
// against ESPN's own scoreboard dates for every one of the 16 matches, so
// this isn't a guess the way the team pairing would be.
const KNOCKOUT_FEEDERS = {
  89: [74, 77], 90: [73, 75], 91: [76, 78], 92: [79, 80],
  93: [83, 84], 94: [81, 82], 95: [86, 88], 96: [85, 87],
  97: [89, 90], 98: [93, 94], 99: [91, 92], 100: [95, 96],
  101: [97, 98], 102: [99, 100],
  103: [101, 102], // Bronze Final - fed by the *losers* of 101/102
  104: [101, 102], // Final - fed by the winners of 101/102
};
const KNOCKOUT_KICKOFFS = {
  89: "2026-07-04T21:00Z", 90: "2026-07-04T17:00Z", 91: "2026-07-05T20:00Z", 92: "2026-07-06T00:00Z",
  93: "2026-07-06T19:00Z", 94: "2026-07-07T00:00Z", 95: "2026-07-07T16:00Z", 96: "2026-07-07T20:00Z",
  97: "2026-07-09T20:00Z", 98: "2026-07-10T19:00Z", 99: "2026-07-11T21:00Z", 100: "2026-07-12T01:00Z",
  101: "2026-07-14T19:00Z", 102: "2026-07-15T19:00Z",
  103: "2026-07-18T21:00Z", 104: "2026-07-19T19:00Z",
};

function tbdResultCard(num, style = "", attrs = "") {
  const [a, b] = KNOCKOUT_FEEDERS[num] || [];
  const prefix = num === 103 ? "L" : "W";
  return bracketTieCard(num, null, null, {
    style, attrs, extraClass: "later-round",
    homeFeeder: a, awayFeeder: b, feederPrefix: prefix,
  });
}

function laterRoundCard(num, m, style = "", extraClass = "", extraAttrs = "") {
  const [f1, f2] = KNOCKOUT_FEEDERS[num] || [];
  const prefix = num === 103 ? "L" : "W";
  return bracketTieCard(num, m?.home, m?.away, {
    style, attrs: extraAttrs,
    extraClass: "later-round" + (extraClass ? " " + extraClass : ""),
    homeFeeder: f1, awayFeeder: f2, feederPrefix: prefix,
  });
}

function labTbdCard(num, style = "") {
  const [a, b] = KNOCKOUT_FEEDERS[num] || [];
  const prefix = num === 103 ? "L" : "W";
  const row = (src) => `<div class="tbd-team">
    <span class="result-right muted">${prefix}${src}</span>
    <span class="flag-placeholder">?</span>
    <span class="name">${tr("tbd")}</span>
  </div>`;
  return `<div class="tie-card tbd-card later-round lab-card" data-match-num="${num}" data-number="${num}" style="${style}">
    <div class="tie-top">
      <span class="match-num">${num}</span>
      <span class="match-date">${formatKickoff(KNOCKOUT_KICKOFFS[num])}</span>
    </div>
    ${row(a)}${row(b)}
  </div>`;
}

// Mirrored bracket layout — 9 columns, 8 data rows:
// Col 1: Left R32 (r32[0-7])   Col 9: Right R32 (r32[8-15])
// Col 2: Left R16 (89,90,93,94) Col 8: Right R16 (91,92,95,96)
// Col 3: Left QF  (97,98)       Col 7: Right QF  (99,100)
// Col 4: Left SF  (101)         Col 6: Right SF  (102)
//                 Col 5: Final (104) + Bronze (103)

function drawBracketConnectors(_gridId) { /* connectors removed */ }



// gridId/spinnerId let this render into either the actual-tab bracket or
// the predicted-tab bracket. trackChanges (the "just updated" pulse) and
// showProb (the per-team percentage pill) are both off for the predicted
// tab — that bracket is a single deterministic projection re-rendered
// fresh each poll, not something worth highlighting deltas on, and it has
// no probabilities attached (see engine.compute_predicted_state). resultStyle
// swaps in the seed/score card layout (see resultCard) instead of the
// actual tab's probability-pill layout - on by default exactly when showProb
// is off, since today that's the same tab, but kept as its own flag since
// "no probabilities" and "seed/score layout" are independent decisions.
function renderBracketInto(bracket, gridId, spinnerId, { trackChanges = true, showProb = true, resultStyle = !showProb, showOddsElo = false, requireConfirmed = true } = {}) {
  const grid = document.getElementById(gridId);
  const spinner = document.getElementById(spinnerId);
  if (!bracket || bracket.length === 0) return;

  if (trackChanges) {
    detectChanges(bracket);
    prevBracket = bracket;
  }
  spinner.style.display = "none";
  grid.style.display = "grid";

  const r32 = bracket.slice(0, 16);
  const laterByNumber = {};
  bracket.slice(16).forEach(m => { laterByNumber[m.match_number] = m; });

  const leftR32 = r32.slice(0, 8);
  const rightR32 = r32.slice(8, 16);

  // Teams confirmed as actual knockout winners (won at least one R32+ match).
  // Used to gate real h2h odds on projected later-round slots — bookmakers
  // offer speculative fixtures (Spain vs Portugal QF) before either team has
  // qualified, and we must not use those future-market odds for projection.
  const confirmedWinners = new Set(
    allKnockoutMatches.filter(m => m.winner && m.status === "ft").map(m => m.winner)
  );

  // Win probability for each team: real h2h odds first (de-vigged, p_draw=0
  // to confirm knockout 2-way market), then tournament outright ratio. No ELO.
  // requireBothConfirmed: only use real h2h odds when both teams have actually
  // won their preceding knockout match (prevents speculative fixture usage).
  const matchProb = (m, { requireBothConfirmed = false } = {}) => {
    if (!showOddsElo || !m?.home?.team || !m?.away?.team) return { h: null, a: null };
    const key = [m.home.team, m.away.team].sort().join("|");
    const entry = cachedState.real_odds?.[key];
    // Only use entries where p_draw ≈ 0 — those are knockout 2-way h2h odds.
    // Group-stage 3-way entries (p_draw > 0) are irrelevant for knockout
    // projections and must not leak into later-round cards.
    const isKnockoutOdds = entry && (entry.p_draw ?? 1) < 0.01;
    const bothConfirmed = !requireBothConfirmed ||
      (confirmedWinners.has(m.home.team) && confirmedWinners.has(m.away.team));
    if (isKnockoutOdds && bothConfirmed) {
      const flip = entry.home !== m.home.team;
      return { h: flip ? entry.p_away : entry.p_home, a: flip ? entry.p_home : entry.p_away };
    }
    // Tournament outright odds: P(A beats B) ≈ p_A / (p_A + p_B)
    const tp = cachedState.tournament_probs || {};
    const tH = tp[m.home.team], tA = tp[m.away.team];
    if (tH > 0 && tA > 0) {
      return outrightToMatchProb(tH, tA, m.match_number ?? 0);
    }
    return { h: null, a: null };
  };

  if (resultStyle) _matchupModalData = {};

  // Render a card for a later-round slot, with CSS grid positioning.
  const renderSlot = (num, col, rowStart, rowSpan) => {
    const style = `grid-column:${col};grid-row:${rowStart} / span ${rowSpan}`;
    const m = laterByNumber[num];
    if (resultStyle) _matchupModalData[num] = { kickoff: m?.kickoff ?? KNOCKOUT_KICKOFFS[num], home: m?.home ?? null, away: m?.away ?? null };
    if (m && (m.home?.team || m.away?.team)) {
      if (!m.home?.team || !m.away?.team) return laterRoundCard(num, m, style);
      const slotLive = allKnockoutMatches.find(x => x.number === num);
      const slotHW = slotLive?.winner ? (slotLive.winner === m.home?.team ? true : false) : undefined;
      const slotAW = slotLive?.winner ? (slotLive.winner === m.away?.team ? true : false) : undefined;
      const slotConfirmed = confirmedWinners.has(m.home.team) && confirmedWinners.has(m.away.team);
      const slotProb = matchProb(m, { requireBothConfirmed: requireConfirmed });
      const slotDone = slotLive?.status === "ft";
      if (resultStyle) return resultCard(num, m.home, m.away, { extraClass: `later-round${slotDone ? " finished" : ""}`, style, attrs: `data-match-num="${num}"`, homeProb: slotProb.h, awayProb: slotProb.a, homeIsWinner: slotHW, awayIsWinner: slotAW, homeScore: slotLive?.home_score ?? null, awayScore: slotLive?.away_score ?? null, showOddsBadge: slotConfirmed, decidedByPen: slotLive?.decided_by_pen ?? false, penHome: slotLive?.pen_home ?? null, penAway: slotLive?.pen_away ?? null });
      return bracketTieCard(num, m.home, m.away, { style, extraClass: `later-round${slotDone ? " finished" : ""}`, showProb, homeIsLoser: slotAW === true, awayIsLoser: slotHW === true, decidedByPen: slotLive?.decided_by_pen ?? false, penHome: slotLive?.pen_home ?? null, penAway: slotLive?.pen_away ?? null });
    }
    return tbdResultCard(num, style);
  };

  // cardOnly renders a later-round card without grid positioning (for use inside roundGroup)
  const cardOnly = (num) => {
    const m = laterByNumber[num];
    if (resultStyle) _matchupModalData[num] = { kickoff: m?.kickoff ?? KNOCKOUT_KICKOFFS[num], home: m?.home ?? null, away: m?.away ?? null };
    if (m && (m.home?.team || m.away?.team)) {
      if (!m.home?.team || !m.away?.team) return laterRoundCard(num, m);
      const onlyLive = allKnockoutMatches.find(x => x.number === num);
      const onlyHW = onlyLive?.winner ? (onlyLive.winner === m.home?.team ? true : false) : undefined;
      const onlyAW = onlyLive?.winner ? (onlyLive.winner === m.away?.team ? true : false) : undefined;
      const onlyConfirmed = confirmedWinners.has(m.home.team) && confirmedWinners.has(m.away.team);
      const onlyProb = matchProb(m, { requireBothConfirmed: requireConfirmed });
      const onlyDone = onlyLive?.status === "ft";
      if (resultStyle) return resultCard(num, m.home, m.away, { extraClass: `later-round${onlyDone ? " finished" : ""}`, attrs: `data-match-num="${num}"`, homeProb: onlyProb.h, awayProb: onlyProb.a, homeIsWinner: onlyHW, awayIsWinner: onlyAW, homeScore: onlyLive?.home_score ?? null, awayScore: onlyLive?.away_score ?? null, showOddsBadge: onlyConfirmed, decidedByPen: onlyLive?.decided_by_pen ?? false, penHome: onlyLive?.pen_home ?? null, penAway: onlyLive?.pen_away ?? null });
      return bracketTieCard(num, m.home, m.away, { extraClass: `later-round${onlyDone ? " finished" : ""}`, showProb, homeIsLoser: onlyAW === true, awayIsLoser: onlyHW === true, decidedByPen: onlyLive?.decided_by_pen ?? false, penHome: onlyLive?.pen_home ?? null, penAway: onlyLive?.pen_away ?? null });
    }
    return tbdResultCard(num);
  };

  const roundGroup = (num, col, rowStart, label) =>
    `<div class="bracket-int-group" style="grid-column:${col};grid-row:${rowStart} / span 2">
      <div class="bracket-int-label">${label}</div>
      ${cardOnly(num)}
    </div>`;

  let html = "";

  // Round titles (row 1) — only R32 and R16 columns
  [[1, tr("round_r32")], [2, tr("round_r16")],
   [6, tr("round_r16")], [7, tr("round_r32")]
  ].forEach(([col, label]) => {
    html += `<div class="round-title" style="grid-column:${col};grid-row:1">${label}</div>`;
  });

  // Left R32: col 1, rows 2-9
  leftR32.forEach((m, i) => {
    const isUpdated = trackChanges && updatedSlots.has(m.slot);
    const num = m.match_number ?? i + 73;
    const style = `grid-column:1;grid-row:${i + 2}`;
    const liveM = allKnockoutMatches.find(x => x.number === num);
    const hIsWinner = liveM?.winner ? (liveM.winner === m.home?.team ? true : false) : undefined;
    const aIsWinner = liveM?.winner ? (liveM.winner === m.away?.team ? true : false) : undefined;
    const isFinished = liveM?.status === "ft";
    if (resultStyle) _matchupModalData[num] = { kickoff: m.kickoff, home: m.home, away: m.away };
    if (resultStyle) {
      const r32Prob = matchProb(m);
      html += resultCard(num, m.home, m.away, { extraClass: isFinished ? "finished" : "", style, attrs: `data-match-num="${num}"`, homeProb: r32Prob.h, awayProb: r32Prob.a, homeIsWinner: hIsWinner, awayIsWinner: aIsWinner, homeScore: liveM?.home_score ?? null, awayScore: liveM?.away_score ?? null, decidedByPen: liveM?.decided_by_pen ?? false, penHome: liveM?.pen_home ?? null, penAway: liveM?.pen_away ?? null });
    } else {
      html += bracketTieCard(num, m.home, m.away, {
        style, kickoff: m.kickoff, showProb,
        extraClass: isFinished ? "finished" : "",
        homeScore: liveM?.home_score ?? null,
        awayScore: liveM?.away_score ?? null,
        homeIsLoser: aIsWinner === true,
        awayIsLoser: hIsWinner === true,
        isUpdated, showOddsBadge: true,
        decidedByPen: liveM?.decided_by_pen ?? false,
        penHome: liveM?.pen_home ?? null,
        penAway: liveM?.pen_away ?? null,
      });
    }
  });

  // Right R32: col 7, rows 2-9
  rightR32.forEach((m, i) => {
    const isUpdated = trackChanges && updatedSlots.has(m.slot);
    const num = m.match_number ?? i + 81;
    const style = `grid-column:7;grid-row:${i + 2}`;
    const liveM = allKnockoutMatches.find(x => x.number === num);
    const hIsWinner = liveM?.winner ? (liveM.winner === m.home?.team ? true : false) : undefined;
    const aIsWinner = liveM?.winner ? (liveM.winner === m.away?.team ? true : false) : undefined;
    const isFinished = liveM?.status === "ft";
    if (resultStyle) _matchupModalData[num] = { kickoff: m.kickoff, home: m.home, away: m.away };
    if (resultStyle) {
      const r32Prob = matchProb(m);
      html += resultCard(num, m.home, m.away, { extraClass: isFinished ? "finished" : "", style, attrs: `data-match-num="${num}"`, homeProb: r32Prob.h, awayProb: r32Prob.a, homeIsWinner: hIsWinner, awayIsWinner: aIsWinner, homeScore: liveM?.home_score ?? null, awayScore: liveM?.away_score ?? null, decidedByPen: liveM?.decided_by_pen ?? false, penHome: liveM?.pen_home ?? null, penAway: liveM?.pen_away ?? null });
    } else {
      html += bracketTieCard(num, m.home, m.away, {
        style, kickoff: m.kickoff, showProb,
        extraClass: isFinished ? "finished" : "",
        homeScore: liveM?.home_score ?? null,
        awayScore: liveM?.away_score ?? null,
        homeIsLoser: aIsWinner === true,
        awayIsLoser: hIsWinner === true,
        isUpdated, showOddsBadge: true,
        decidedByPen: liveM?.decided_by_pen ?? false,
        penHome: liveM?.pen_home ?? null,
        penAway: liveM?.pen_away ?? null,
      });
    }
  });

  // Left R16: col 2, rows 2-3 / 4-5 / 6-7 / 8-9
  [89, 90, 93, 94].forEach((num, i) => { html += renderSlot(num, 2, i * 2 + 2, 2); });

  // Left QF+SF: col 3 (integrated groups — QF top, SF middle, QF bottom)
  html += roundGroup(97,  3, 3, `${tr("round_qf_abbr")} 1`);
  html += roundGroup(101, 3, 5, `${tr("round_sf_abbr")} 1`);
  html += roundGroup(98,  3, 7, `${tr("round_qf_abbr")} 2`);

  // Center: col 4 — Final and Bronze
  html += roundGroup(104, 4, 4, tr("round_final"));
  html += roundGroup(103, 4, 6, tr("round_bronze_singular"));

  // Right QF+SF: col 5 (integrated groups)
  html += roundGroup(99,  5, 3, `${tr("round_qf_abbr")} 3`);
  html += roundGroup(102, 5, 5, `${tr("round_sf_abbr")} 2`);
  html += roundGroup(100, 5, 7, `${tr("round_qf_abbr")} 4`);

  // Right R16: col 6, rows 2-3 / 4-5 / 6-7 / 8-9
  [91, 92, 95, 96].forEach((num, i) => { html += renderSlot(num, 6, i * 2 + 2, 2); });

  grid.innerHTML = html;
  wireOddsBadges(grid);
}

function renderBracket(bracket) {
  renderBracketInto(bracket, "bracket-grid", "bracket-spinner", { trackChanges: true, showProb: true });
}
function renderPredictedBracket(bracket) {
  renderBracketInto(bracket, "predicted-bracket-grid", "predicted-bracket-spinner", { trackChanges: false, showProb: false, showOddsElo: true, requireConfirmed: false });
}

// "prob" is always P(advance to R32) now, regardless of current position.
function advanceProbPill(prob) {
  // Only show "100%" when advance is mathematically certain (prob === 1.0).
  // Math.round would otherwise display 99.9% as "100%", which misleads users
  // comparing against FIFA's site (which only marks teams as qualified when
  // it's truly guaranteed, not just very likely).
  const pct = prob >= 1 ? 100 : Math.min(99, Math.round((prob || 0) * 100));
  let cls;
  if (pct >= 75) cls = "tier-green";
  else if (pct >= 51) cls = "tier-yellow";
  else if (pct >= 11) cls = "tier-orange";
  else if (pct >= 1)  cls = "tier-red";
  else cls = "tier-grey";
  return { pct, cls, checkmark: "" };
}

function matchWinPill(prob) {
  const pct = Math.round((prob || 0) * 100);
  let cls;
  if (pct >= 75)     cls = "tier-green";
  else if (pct >= 51) cls = "tier-yellow";
  else if (pct >= 11) cls = "tier-orange";
  else if (pct >= 1)  cls = "tier-red";
  else                cls = "tier-grey";
  return { pct, cls };
}

// ── STANDINGS ─────────────────────────────────────────────────────────────────
// gridId/showProb/showLive/trackArrows let this serve both tabs: the actual
// table (live overlay, move arrows, advance-% pill) and the predicted table
// (none of that — it's a single re-computed projection each poll, and has
// no probabilities attached, see engine.compute_predicted_state).
function renderStandingsInto(standings, liveMatches, gridId, { showProb = true, showLive = true, trackArrows = true } = {}) {
  const grid = document.getElementById(gridId);
  if (!standings || Object.keys(standings).length === 0) return;

  const liveByTeam = {};
  if (showLive) {
    (liveMatches || []).forEach(m => {
      const state = m.home_score === m.away_score ? "tied" : m.home_score > m.away_score ? "winning" : "losing";
      const flip = { winning: "losing", losing: "winning", tied: "tied" };
      liveByTeam[m.home] = { score: `${m.home_score ?? "–"}-${m.away_score ?? "–"}`, state };
      liveByTeam[m.away] = { score: `${m.away_score ?? "–"}-${m.home_score ?? "–"}`, state: flip[state] };
    });
  }

  const positions = trackArrows ? prevPositions : {};
  const newPositions = {};
  const groups = "ABCDEFGHIJKL".split("");
  grid.innerHTML = groups.map(g => {
    const teams = standings[g] || [];
    const rows = teams.map((t, i) => {
      const pos = i + 1;
      newPositions[t.name] = pos;

      let arrow = "";
      if (trackArrows) {
        const prevPos = positions[t.name];
        if (prevPos && prevPos !== pos) {
          const delta = prevPos - pos;
          const cls = delta > 0 ? "up" : "down";
          const symbol = delta > 0 ? "▲" : "▼";
          arrow = `<span class="move-arrow ${cls}">${symbol}${Math.abs(delta) > 1 ? Math.abs(delta) : ""}</span>`;
        }
      }

      const live = liveByTeam[t.name];
      const livePill = live
        ? `<span class="result-pill live ${live.state}"><span class="live-dot"></span>${live.score}</span>`
        : "";

      const probCol = showProb
        ? (() => {
            const { pct, cls, checkmark } = advanceProbPill(t.prob);
            return `<div class="prob-pill ${cls}">${checkmark}${pct}%</div>`;
          })()
        : "";

      return `<div class="standings-row">
        <div class="pos-badge p${pos}">${pos}</div>
        <div class="standings-team">
          ${flagImg(t.name)}
          <span class="name">${tn(t.name)}</span>
          ${arrow}
        </div>
        <div class="standings-live">${livePill}</div>
        <div class="standings-col">${t.played}</div>
        <div class="standings-col">${t.goal_diff >= 0 ? "+" : ""}${t.goal_diff}</div>
        <div class="standings-col">${t.points}</div>
        ${probCol}
      </div>`;
    }).join("");
    const probHeader = showProb ? `<span class="gh-col prob">${tr("prob")}</span>` : "";
    return `<div class="group-card">
      <div class="group-head">
        <span class="gh-name">${tr("group_label")} ${g}</span>
        <span class="gh-col" style="width:54px"></span>
        <span class="gh-col">${tr("mp")}</span><span class="gh-col">${tr("gd")}</span><span class="gh-col">${tr("pts")}</span>${probHeader}
      </div>
      ${rows}
    </div>`;
  }).join("");

  if (trackArrows) prevPositions = newPositions;
}

function renderStandings(standings, liveMatches) {
  renderStandingsInto(standings, liveMatches, "standings-grid", { showProb: true, showLive: true, trackArrows: true });
}

// The predicted table only ever shows name + predicted position, never
// points/GD/GF — those would be expected-value decimals (e.g. 7.3 points),
// not a result anyone could actually finish with. See engine.py's
// compute_predicted_state docstring for why this is rank-only by design,
// not a missing feature.
function renderPredictedStandings(standings) {
  const section = document.getElementById("predicted-standings-section");
  if (isGroupStageSettled()) { if (section) section.style.display = "none"; return; }
  if (section) section.style.display = "";
  const grid = document.getElementById("predicted-standings-grid");
  if (!standings || Object.keys(standings).length === 0) return;

  const groups = "ABCDEFGHIJKL".split("");
  grid.innerHTML = groups.map(g => {
    const teams = standings[g] || [];
    const rows = teams.map(t => `<div class="standings-row">
        <div class="pos-badge p${t.position}">${t.position}</div>
        <div class="standings-team">
          ${flagImg(t.name)}
          <span class="name">${tn(t.name)}</span>
        </div>
      </div>`).join("");
    return `<div class="group-card">
      <div class="group-head">
        <span class="gh-name">${tr("group_label")} ${g}</span>
      </div>
      ${rows}
    </div>`;
  }).join("");
}

function isGroupStageSettled() {
  const s = cachedState.standings;
  if (!s || Object.keys(s).length < 12) return false;
  return Object.values(s).every(g => g.length > 0 && g.every(t => t.played >= 3));
}

// ── THIRDS RACE ───────────────────────────────────────────────────────────────
function renderThirds(thirds) {
  const section = document.getElementById("thirds-section");
  const list = document.getElementById("thirds-list");
  if (!thirds || thirds.length === 0) { section.style.display = "none"; return; }

  // Only show if any matches played
  const anyPlayed = thirds.some(t => t.played > 0);
  if (!anyPlayed) { section.style.display = "none"; return; }
  section.style.display = "block";

  const rows = thirds.map((t) => {
    const badgeCls = t.qualifies ? "qualify" : "eliminated";
    const { pct: probPct, cls: probCls, checkmark } = advanceProbPill(t.prob);
    const gd = t.goal_diff >= 0 ? `+${t.goal_diff}` : `${t.goal_diff}`;
    const tcs = t.fair_play ?? 0;
    const tcsStyle = tcs > 0 ? "color:#c2410c" : "color:var(--muted)";
    return `<div class="standings-row">
      <div class="pos-badge ${badgeCls}">${t.rank}</div>
      <div class="standings-team">
        ${flagImg(t.name)}
        <span class="name">${tn(t.name)}</span>
      </div>
      <div class="standings-col" style="width:22px;color:var(--muted);font-weight:700">${t.group}</div>
      <div class="standings-col" style="width:22px">${t.won}</div>
      <div class="standings-col" style="width:22px">${t.drawn}</div>
      <div class="standings-col" style="width:22px">${t.lost}</div>
      <div class="standings-col" style="width:26px">${t.goals_for}</div>
      <div class="standings-col" style="width:26px">${t.goals_against}</div>
      <div class="standings-col" style="width:26px">${gd}</div>
      <div class="standings-col" style="width:26px;${tcsStyle}">${tcs}</div>
      <div class="standings-col">${t.points}</div>
      <div class="prob-pill ${probCls}">${checkmark}${probPct}%</div>
    </div>`;
  }).join("");

  list.innerHTML = `<div style="overflow-x:auto"><div class="group-card" style="min-width:540px">
    <div class="group-head">
      <span class="gh-name">${tr("thirds_race")}</span>
      <span class="gh-col" style="width:22px">${tr("col_grp")}</span>
      <span class="gh-col" style="width:22px">${tr("col_w")}</span>
      <span class="gh-col" style="width:22px">${tr("col_d")}</span>
      <span class="gh-col" style="width:22px">${tr("col_l")}</span>
      <span class="gh-col" style="width:26px">${tr("col_gf")}</span>
      <span class="gh-col" style="width:26px">${tr("col_ga")}</span>
      <span class="gh-col" style="width:26px">${tr("gd")}</span>
      <span class="gh-col" style="width:26px">${tr("col_tcs")}</span>
      <span class="gh-col">${tr("pts")}</span>
      <span class="gh-col prob">${tr("prob")}</span>
    </div>
    ${rows}
  </div></div>`;
}

// Same cross-group ranking as renderThirds(), but rank + group letter +
// flag + name only — no Pld/GD/Pts/prob, same reasoning as the predicted
// standings table (see engine.compute_predicted_state's docstring).
function renderPredictedThirds(thirds) {
  const section = document.getElementById("predicted-thirds-section");
  if (isGroupStageSettled()) { if (section) section.style.display = "none"; return; }
  if (section) section.style.display = "";
  const list = document.getElementById("predicted-thirds-list");
  if (!thirds || thirds.length === 0) return;

  const rows = thirds.map(t => {
    const badgeCls = t.qualifies ? "qualify" : "eliminated";
    return `<div class="standings-row">
      <div class="pos-badge ${badgeCls}">${t.rank}</div>
      <div class="standings-team">
        ${flagImg(t.name)}
        <span class="name">${tn(t.name)}</span>
      </div>
      <span class="gh-col" style="width:30px;flex-shrink:0;color:var(--muted);font-weight:700">${t.group}</span>
    </div>`;
  }).join("");

  list.innerHTML = `<div class="group-card">
    <div class="group-head">
      <span class="gh-name">${tr("thirds_race_odds")}</span>
    </div>
    ${rows}
  </div>`;
}

// ── LAB ENGINE ────────────────────────────────────────────────────────────────
// Ported from bot/engine.py + bot/annex_c.py. The Lab needs to recompute
// standings/bracket instantly on every edit with zero network round-trip,
// so the deterministic parts of the real engine (no probabilities - same
// idea as the Odds-Based Projection tab, just fed user-chosen scores instead
// of expected values) are duplicated here in JS rather than calling back
// to Python. Keep this in sync with engine.py if the real tiebreak rules
// or bracket structure ever change.
const LAB_GROUPS = {
  A: ["Mexico", "South Korea", "South Africa", "Czech Republic"],
  B: ["Canada", "Switzerland", "Qatar", "Bosnia-Herzegovina"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["USA", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curacao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Norway", "Iraq"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};
const LAB_FIFA_RANKINGS = {
  "Argentina": 1, "France": 2, "England": 3, "Belgium": 4, "Brazil": 5,
  "Portugal": 6, "Netherlands": 7, "Spain": 8, "Germany": 9, "USA": 10,
  "Uruguay": 11, "Mexico": 12, "Colombia": 13, "Japan": 14, "Croatia": 15,
  "Morocco": 16, "Switzerland": 17, "Senegal": 18, "Sweden": 19, "Norway": 20,
  "Ecuador": 21, "Canada": 22, "South Korea": 23, "Australia": 24, "Turkey": 25,
  "Egypt": 26, "Algeria": 27, "Austria": 28, "Tunisia": 29,
  "Scotland": 30, "Ghana": 31, "Ivory Coast": 32, "Saudi Arabia": 33, "Iran": 34,
  "Paraguay": 35, "Qatar": 36, "New Zealand": 37, "South Africa": 38,
  "Bosnia-Herzegovina": 39, "Cape Verde": 40, "DR Congo": 41,
  "Uzbekistan": 42, "Czech Republic": 43, "Jordan": 44, "Iraq": 45, "Panama": 46,
  "Curacao": 47, "Haiti": 48,
};
const LAB_FIXED_R32 = [
  { slot: "R1", t1: { group: "A", pos: 2 }, t2: { group: "B", pos: 2 } },
  { slot: "R2", t1: { group: "C", pos: 1 }, t2: { group: "F", pos: 2 } },
  { slot: "R3", t1: { group: "F", pos: 1 }, t2: { group: "C", pos: 2 } },
  { slot: "R4", t1: { group: "H", pos: 1 }, t2: { group: "J", pos: 2 } },
  { slot: "R5", t1: { group: "J", pos: 1 }, t2: { group: "H", pos: 2 } },
  { slot: "R6", t1: { group: "E", pos: 2 }, t2: { group: "I", pos: 2 } },
  { slot: "R7", t1: { group: "K", pos: 2 }, t2: { group: "L", pos: 2 } },
  { slot: "R8", t1: { group: "D", pos: 2 }, t2: { group: "G", pos: 2 } },
];
const LAB_THIRD_SLOTS = ["A", "B", "D", "E", "G", "I", "K", "L"];
const LAB_MATCH_NUMBERS = {
  R1: 73, RE: 74, R3: 75, R2: 76, RI: 77, R6: 78,
  RA: 79, RL: 80, RD: 81, RG: 82, R7: 83, R4: 84,
  RB: 85, R5: 86, RK: 87, R8: 88,
};
const LAB_BRACKET_TREE_ORDER = ["RE", "RI", "R1", "R3", "R7", "R4", "RD", "RG",
                                 "R2", "R6", "RA", "RL", "R5", "R8", "RB", "RK"];

// Full 495-row FIFA Annex C table (verbatim from bot/annex_c.py) — maps
// the specific set of 8 qualifying third-place groups to which group's
// 3rd-place team faces which group-winner slot.
const LAB_ANNEX_RAW = `1 3E 3J 3I 3F 3H 3G 3L 3K
2 3H 3G 3I 3D 3J 3F 3L 3K
3 3E 3J 3I 3D 3H 3G 3L 3K
4 3E 3J 3I 3D 3H 3F 3L 3K
5 3E 3G 3I 3D 3J 3F 3L 3K
6 3E 3G 3J 3D 3H 3F 3L 3K
7 3E 3G 3I 3D 3H 3F 3L 3K
8 3E 3G 3J 3D 3H 3F 3L 3I
9 3E 3G 3J 3D 3H 3F 3I 3K
10 3H 3G 3I 3C 3J 3F 3L 3K
11 3E 3J 3I 3C 3H 3G 3L 3K
12 3E 3J 3I 3C 3H 3F 3L 3K
13 3E 3G 3I 3C 3J 3F 3L 3K
14 3E 3G 3J 3C 3H 3F 3L 3K
15 3E 3G 3I 3C 3H 3F 3L 3K
16 3E 3G 3J 3C 3H 3F 3L 3I
17 3E 3G 3J 3C 3H 3F 3I 3K
18 3H 3G 3I 3C 3J 3D 3L 3K
19 3C 3J 3I 3D 3H 3F 3L 3K
20 3C 3G 3I 3D 3J 3F 3L 3K
21 3C 3G 3J 3D 3H 3F 3L 3K
22 3C 3G 3I 3D 3H 3F 3L 3K
23 3C 3G 3J 3D 3H 3F 3L 3I
24 3C 3G 3J 3D 3H 3F 3I 3K
25 3E 3J 3I 3C 3H 3D 3L 3K
26 3E 3G 3I 3C 3J 3D 3L 3K
27 3E 3G 3J 3C 3H 3D 3L 3K
28 3E 3G 3I 3C 3H 3D 3L 3K
29 3E 3G 3J 3C 3H 3D 3L 3I
30 3E 3G 3J 3C 3H 3D 3I 3K
31 3C 3J 3E 3D 3I 3F 3L 3K
32 3C 3J 3E 3D 3H 3F 3L 3K
33 3C 3E 3I 3D 3H 3F 3L 3K
34 3C 3J 3E 3D 3H 3F 3L 3I
35 3C 3J 3E 3D 3H 3F 3I 3K
36 3C 3G 3E 3D 3J 3F 3L 3K
37 3C 3G 3E 3D 3I 3F 3L 3K
38 3C 3G 3E 3D 3J 3F 3L 3I
39 3C 3G 3E 3D 3J 3F 3I 3K
40 3C 3G 3E 3D 3H 3F 3L 3K
41 3C 3G 3J 3D 3H 3F 3L 3E
42 3C 3G 3J 3D 3H 3F 3E 3K
43 3C 3G 3E 3D 3H 3F 3L 3I
44 3C 3G 3E 3D 3H 3F 3I 3K
45 3C 3G 3J 3D 3H 3F 3E 3I
46 3H 3J 3B 3F 3I 3G 3L 3K
47 3E 3J 3I 3B 3H 3G 3L 3K
48 3E 3J 3B 3F 3I 3H 3L 3K
49 3E 3J 3B 3F 3I 3G 3L 3K
50 3E 3J 3B 3F 3H 3G 3L 3K
51 3E 3G 3B 3F 3I 3H 3L 3K
52 3E 3J 3B 3F 3H 3G 3L 3I
53 3E 3J 3B 3F 3H 3G 3I 3K
54 3H 3J 3B 3D 3I 3G 3L 3K
55 3H 3J 3B 3D 3I 3F 3L 3K
56 3I 3G 3B 3D 3J 3F 3L 3K
57 3H 3G 3B 3D 3J 3F 3L 3K
58 3H 3G 3B 3D 3I 3F 3L 3K
59 3H 3G 3B 3D 3J 3F 3L 3I
60 3H 3G 3B 3D 3J 3F 3I 3K
61 3E 3J 3B 3D 3I 3H 3L 3K
62 3E 3J 3B 3D 3I 3G 3L 3K
63 3E 3J 3B 3D 3H 3G 3L 3K
64 3E 3G 3B 3D 3I 3H 3L 3K
65 3E 3J 3B 3D 3H 3G 3L 3I
66 3E 3J 3B 3D 3H 3G 3I 3K
67 3E 3J 3B 3D 3I 3F 3L 3K
68 3E 3J 3B 3D 3H 3F 3L 3K
69 3E 3I 3B 3D 3H 3F 3L 3K
70 3E 3J 3B 3D 3H 3F 3L 3I
71 3E 3J 3B 3D 3H 3F 3I 3K
72 3E 3G 3B 3D 3J 3F 3L 3K
73 3E 3G 3B 3D 3I 3F 3L 3K
74 3E 3G 3B 3D 3J 3F 3L 3I
75 3E 3G 3B 3D 3J 3F 3I 3K
76 3E 3G 3B 3D 3H 3F 3L 3K
77 3H 3G 3B 3D 3J 3F 3L 3E
78 3H 3G 3B 3D 3J 3F 3E 3K
79 3E 3G 3B 3D 3H 3F 3L 3I
80 3E 3G 3B 3D 3H 3F 3I 3K
81 3H 3G 3B 3D 3J 3F 3E 3I
82 3H 3J 3B 3C 3I 3G 3L 3K
83 3H 3J 3B 3C 3I 3F 3L 3K
84 3I 3G 3B 3C 3J 3F 3L 3K
85 3H 3G 3B 3C 3J 3F 3L 3K
86 3H 3G 3B 3C 3I 3F 3L 3K
87 3H 3G 3B 3C 3J 3F 3L 3I
88 3H 3G 3B 3C 3J 3F 3I 3K
89 3E 3J 3B 3C 3I 3H 3L 3K
90 3E 3J 3B 3C 3I 3G 3L 3K
91 3E 3J 3B 3C 3H 3G 3L 3K
92 3E 3G 3B 3C 3I 3H 3L 3K
93 3E 3J 3B 3C 3H 3G 3L 3I
94 3E 3J 3B 3C 3H 3G 3I 3K
95 3E 3J 3B 3C 3I 3F 3L 3K
96 3E 3J 3B 3C 3H 3F 3L 3K
97 3E 3I 3B 3C 3H 3F 3L 3K
98 3E 3J 3B 3C 3H 3F 3L 3I
99 3E 3J 3B 3C 3H 3F 3I 3K
100 3E 3G 3B 3C 3J 3F 3L 3K
101 3E 3G 3B 3C 3I 3F 3L 3K
102 3E 3G 3B 3C 3J 3F 3L 3I
103 3E 3G 3B 3C 3J 3F 3I 3K
104 3E 3G 3B 3C 3H 3F 3L 3K
105 3H 3G 3B 3C 3J 3F 3L 3E
106 3H 3G 3B 3C 3J 3F 3E 3K
107 3E 3G 3B 3C 3H 3F 3L 3I
108 3E 3G 3B 3C 3H 3F 3I 3K
109 3H 3G 3B 3C 3J 3F 3E 3I
110 3H 3J 3B 3C 3I 3D 3L 3K
111 3I 3G 3B 3C 3J 3D 3L 3K
112 3H 3G 3B 3C 3J 3D 3L 3K
113 3H 3G 3B 3C 3I 3D 3L 3K
114 3H 3G 3B 3C 3J 3D 3L 3I
115 3H 3G 3B 3C 3J 3D 3I 3K
116 3C 3J 3B 3D 3I 3F 3L 3K
117 3C 3J 3B 3D 3H 3F 3L 3K
118 3C 3I 3B 3D 3H 3F 3L 3K
119 3C 3J 3B 3D 3H 3F 3L 3I
120 3C 3J 3B 3D 3H 3F 3I 3K
121 3C 3G 3B 3D 3J 3F 3L 3K
122 3C 3G 3B 3D 3I 3F 3L 3K
123 3C 3G 3B 3D 3J 3F 3L 3I
124 3C 3G 3B 3D 3J 3F 3I 3K
125 3C 3G 3B 3D 3H 3F 3L 3K
126 3C 3G 3B 3D 3H 3F 3L 3J
127 3H 3G 3B 3C 3J 3F 3D 3K
128 3C 3G 3B 3D 3H 3F 3L 3I
129 3C 3G 3B 3D 3H 3F 3I 3K
130 3H 3G 3B 3C 3J 3F 3D 3I
131 3E 3J 3B 3C 3I 3D 3L 3K
132 3E 3J 3B 3C 3H 3D 3L 3K
133 3E 3I 3B 3C 3H 3D 3L 3K
134 3E 3J 3B 3C 3H 3D 3L 3I
135 3E 3J 3B 3C 3H 3D 3I 3K
136 3E 3G 3B 3C 3J 3D 3L 3K
137 3E 3G 3B 3C 3I 3D 3L 3K
138 3E 3G 3B 3C 3J 3D 3L 3I
139 3E 3G 3B 3C 3J 3D 3I 3K
140 3E 3G 3B 3C 3H 3D 3L 3K
141 3H 3G 3B 3C 3J 3D 3L 3E
142 3H 3G 3B 3C 3J 3D 3E 3K
143 3E 3G 3B 3C 3H 3D 3L 3I
144 3E 3G 3B 3C 3H 3D 3I 3K
145 3H 3G 3B 3C 3J 3D 3E 3I
146 3C 3J 3B 3D 3E 3F 3L 3K
147 3C 3E 3B 3D 3I 3F 3L 3K
148 3C 3J 3B 3D 3E 3F 3L 3I
149 3C 3J 3B 3D 3E 3F 3I 3K
150 3C 3E 3B 3D 3H 3F 3L 3K
151 3C 3J 3B 3D 3H 3F 3L 3E
152 3C 3J 3B 3D 3H 3F 3E 3K
153 3C 3E 3B 3D 3H 3F 3L 3I
154 3C 3E 3B 3D 3H 3F 3I 3K
155 3C 3J 3B 3D 3H 3F 3E 3I
156 3C 3G 3B 3D 3E 3F 3L 3K
157 3C 3G 3B 3D 3J 3F 3L 3E
158 3C 3G 3B 3D 3J 3F 3E 3K
159 3C 3G 3B 3D 3E 3F 3L 3I
160 3C 3G 3B 3D 3E 3F 3I 3K
161 3C 3G 3B 3D 3J 3F 3E 3I
162 3C 3G 3B 3D 3H 3F 3L 3E
163 3C 3G 3B 3D 3H 3F 3E 3K
164 3H 3G 3B 3C 3J 3F 3D 3E
165 3C 3G 3B 3D 3H 3F 3E 3I
166 3H 3J 3I 3F 3A 3G 3L 3K
167 3E 3J 3I 3A 3H 3G 3L 3K
168 3E 3J 3I 3F 3A 3H 3L 3K
169 3E 3J 3I 3F 3A 3G 3L 3K
170 3E 3G 3J 3F 3A 3H 3L 3K
171 3E 3G 3I 3F 3A 3H 3L 3K
172 3E 3G 3J 3F 3A 3H 3L 3I
173 3E 3G 3J 3F 3A 3H 3I 3K
174 3H 3J 3I 3D 3A 3G 3L 3K
175 3H 3J 3I 3D 3A 3F 3L 3K
176 3I 3G 3J 3D 3A 3F 3L 3K
177 3H 3G 3J 3D 3A 3F 3L 3K
178 3H 3G 3I 3D 3A 3F 3L 3K
179 3H 3G 3J 3D 3A 3F 3L 3I
180 3H 3G 3J 3D 3A 3F 3I 3K
181 3E 3J 3I 3D 3A 3H 3L 3K
182 3E 3J 3I 3D 3A 3G 3L 3K
183 3E 3G 3J 3D 3A 3H 3L 3K
184 3E 3G 3I 3D 3A 3H 3L 3K
185 3E 3G 3J 3D 3A 3H 3L 3I
186 3E 3G 3J 3D 3A 3H 3I 3K
187 3E 3J 3I 3D 3A 3F 3L 3K
188 3H 3J 3E 3D 3A 3F 3L 3K
189 3H 3E 3I 3D 3A 3F 3L 3K
190 3H 3J 3E 3D 3A 3F 3L 3I
191 3H 3J 3E 3D 3A 3F 3I 3K
192 3E 3G 3J 3D 3A 3F 3L 3K
193 3E 3G 3I 3D 3A 3F 3L 3K
194 3E 3G 3J 3D 3A 3F 3L 3I
195 3E 3G 3J 3D 3A 3F 3I 3K
196 3H 3G 3E 3D 3A 3F 3L 3K
197 3H 3G 3J 3D 3A 3F 3L 3E
198 3H 3G 3J 3D 3A 3F 3E 3K
199 3H 3G 3E 3D 3A 3F 3L 3I
200 3H 3G 3E 3D 3A 3F 3I 3K
201 3H 3G 3J 3D 3A 3F 3E 3I
202 3H 3J 3I 3C 3A 3G 3L 3K
203 3H 3J 3I 3C 3A 3F 3L 3K
204 3I 3G 3J 3C 3A 3F 3L 3K
205 3H 3G 3J 3C 3A 3F 3L 3K
206 3H 3G 3I 3C 3A 3F 3L 3K
207 3H 3G 3J 3C 3A 3F 3L 3I
208 3H 3G 3J 3C 3A 3F 3I 3K
209 3E 3J 3I 3C 3A 3H 3L 3K
210 3E 3J 3I 3C 3A 3G 3L 3K
211 3E 3G 3J 3C 3A 3H 3L 3K
212 3E 3G 3I 3C 3A 3H 3L 3K
213 3E 3G 3J 3C 3A 3H 3L 3I
214 3E 3G 3J 3C 3A 3H 3I 3K
215 3E 3J 3I 3C 3A 3F 3L 3K
216 3H 3J 3E 3C 3A 3F 3L 3K
217 3H 3E 3I 3C 3A 3F 3L 3K
218 3H 3J 3E 3C 3A 3F 3L 3I
219 3H 3J 3E 3C 3A 3F 3I 3K
220 3E 3G 3J 3C 3A 3F 3L 3K
221 3E 3G 3I 3C 3A 3F 3L 3K
222 3E 3G 3J 3C 3A 3F 3L 3I
223 3E 3G 3J 3C 3A 3F 3I 3K
224 3H 3G 3E 3C 3A 3F 3L 3K
225 3H 3G 3J 3C 3A 3F 3L 3E
226 3H 3G 3J 3C 3A 3F 3E 3K
227 3H 3G 3E 3C 3A 3F 3L 3I
228 3H 3G 3E 3C 3A 3F 3I 3K
229 3H 3G 3J 3C 3A 3F 3E 3I
230 3H 3J 3I 3C 3A 3D 3L 3K
231 3I 3G 3J 3C 3A 3D 3L 3K
232 3H 3G 3J 3C 3A 3D 3L 3K
233 3H 3G 3I 3C 3A 3D 3L 3K
234 3H 3G 3J 3C 3A 3D 3L 3I
235 3H 3G 3J 3C 3A 3D 3I 3K
236 3C 3J 3I 3D 3A 3F 3L 3K
237 3H 3J 3F 3C 3A 3D 3L 3K
238 3H 3F 3I 3C 3A 3D 3L 3K
239 3H 3J 3F 3C 3A 3D 3L 3I
240 3H 3J 3F 3C 3A 3D 3I 3K
241 3C 3G 3J 3D 3A 3F 3L 3K
242 3C 3G 3I 3D 3A 3F 3L 3K
243 3C 3G 3J 3D 3A 3F 3L 3I
244 3C 3G 3J 3D 3A 3F 3I 3K
245 3H 3G 3F 3C 3A 3D 3L 3K
246 3C 3G 3J 3D 3A 3F 3L 3H
247 3H 3G 3J 3C 3A 3F 3D 3K
248 3H 3G 3F 3C 3A 3D 3L 3I
249 3H 3G 3F 3C 3A 3D 3I 3K
250 3H 3G 3J 3C 3A 3F 3D 3I
251 3E 3J 3I 3C 3A 3D 3L 3K
252 3H 3J 3E 3C 3A 3D 3L 3K
253 3H 3E 3I 3C 3A 3D 3L 3K
254 3H 3J 3E 3C 3A 3D 3L 3I
255 3H 3J 3E 3C 3A 3D 3I 3K
256 3E 3G 3J 3C 3A 3D 3L 3K
257 3E 3G 3I 3C 3A 3D 3L 3K
258 3E 3G 3J 3C 3A 3D 3L 3I
259 3E 3G 3J 3C 3A 3D 3I 3K
260 3H 3G 3E 3C 3A 3D 3L 3K
261 3H 3G 3J 3C 3A 3D 3L 3E
262 3H 3G 3J 3C 3A 3D 3E 3K
263 3H 3G 3E 3C 3A 3D 3L 3I
264 3H 3G 3E 3C 3A 3D 3I 3K
265 3H 3G 3J 3C 3A 3D 3E 3I
266 3C 3J 3E 3D 3A 3F 3L 3K
267 3C 3E 3I 3D 3A 3F 3L 3K
268 3C 3J 3E 3D 3A 3F 3L 3I
269 3C 3J 3E 3D 3A 3F 3I 3K
270 3H 3E 3F 3C 3A 3D 3L 3K
271 3H 3J 3F 3C 3A 3D 3L 3E
272 3H 3J 3E 3C 3A 3F 3D 3K
273 3H 3E 3F 3C 3A 3D 3L 3I
274 3H 3E 3F 3C 3A 3D 3I 3K
275 3H 3J 3E 3C 3A 3F 3D 3I
276 3C 3G 3E 3D 3A 3F 3L 3K
277 3C 3G 3J 3D 3A 3F 3L 3E
278 3C 3G 3J 3D 3A 3F 3E 3K
279 3C 3G 3E 3D 3A 3F 3L 3I
280 3C 3G 3E 3D 3A 3F 3I 3K
281 3C 3G 3J 3D 3A 3F 3E 3I
282 3H 3G 3F 3C 3A 3D 3L 3E
283 3H 3G 3E 3C 3A 3F 3D 3K
284 3H 3G 3J 3C 3A 3F 3D 3E
285 3H 3G 3E 3C 3A 3F 3D 3I
286 3H 3J 3B 3A 3I 3G 3L 3K
287 3H 3J 3B 3A 3I 3F 3L 3K
288 3I 3J 3B 3F 3A 3G 3L 3K
289 3H 3J 3B 3F 3A 3G 3L 3K
290 3H 3G 3B 3A 3I 3F 3L 3K
291 3H 3J 3B 3F 3A 3G 3L 3I
292 3H 3J 3B 3F 3A 3G 3I 3K
293 3E 3J 3B 3A 3I 3H 3L 3K
294 3E 3J 3B 3A 3I 3G 3L 3K
295 3E 3J 3B 3A 3H 3G 3L 3K
296 3E 3G 3B 3A 3I 3H 3L 3K
297 3E 3J 3B 3A 3H 3G 3L 3I
298 3E 3J 3B 3A 3H 3G 3I 3K
299 3E 3J 3B 3A 3I 3F 3L 3K
300 3E 3J 3B 3F 3A 3H 3L 3K
301 3E 3I 3B 3F 3A 3H 3L 3K
302 3E 3J 3B 3F 3A 3H 3L 3I
303 3E 3J 3B 3F 3A 3H 3I 3K
304 3E 3J 3B 3F 3A 3G 3L 3K
305 3E 3G 3B 3A 3I 3F 3L 3K
306 3E 3J 3B 3F 3A 3G 3L 3I
307 3E 3J 3B 3F 3A 3G 3I 3K
308 3E 3G 3B 3F 3A 3H 3L 3K
309 3H 3J 3B 3F 3A 3G 3L 3E
310 3H 3J 3B 3F 3A 3G 3E 3K
311 3E 3G 3B 3F 3A 3H 3L 3I
312 3E 3G 3B 3F 3A 3H 3I 3K
313 3H 3J 3B 3F 3A 3G 3E 3I
314 3I 3J 3B 3D 3A 3H 3L 3K
315 3I 3J 3B 3D 3A 3G 3L 3K
316 3H 3J 3B 3D 3A 3G 3L 3K
317 3I 3G 3B 3D 3A 3H 3L 3K
318 3H 3J 3B 3D 3A 3G 3L 3I
319 3H 3J 3B 3D 3A 3G 3I 3K
320 3I 3J 3B 3D 3A 3F 3L 3K
321 3H 3J 3B 3D 3A 3F 3L 3K
322 3H 3I 3B 3D 3A 3F 3L 3K
323 3H 3J 3B 3D 3A 3F 3L 3I
324 3H 3J 3B 3D 3A 3F 3I 3K
325 3F 3J 3B 3D 3A 3G 3L 3K
326 3I 3G 3B 3D 3A 3F 3L 3K
327 3F 3J 3B 3D 3A 3G 3L 3I
328 3F 3J 3B 3D 3A 3G 3I 3K
329 3H 3G 3B 3D 3A 3F 3L 3K
330 3H 3G 3B 3D 3A 3F 3L 3J
331 3H 3G 3B 3D 3A 3F 3J 3K
332 3H 3G 3B 3D 3A 3F 3L 3I
333 3H 3G 3B 3D 3A 3F 3I 3K
334 3H 3G 3B 3D 3A 3F 3I 3J
335 3E 3J 3B 3A 3I 3D 3L 3K
336 3E 3J 3B 3D 3A 3H 3L 3K
337 3E 3I 3B 3D 3A 3H 3L 3K
338 3E 3J 3B 3D 3A 3H 3L 3I
339 3E 3J 3B 3D 3A 3H 3I 3K
340 3E 3J 3B 3D 3A 3G 3L 3K
341 3E 3G 3B 3A 3I 3D 3L 3K
342 3E 3J 3B 3D 3A 3G 3L 3I
343 3E 3J 3B 3D 3A 3G 3I 3K
344 3E 3G 3B 3D 3A 3H 3L 3K
345 3H 3J 3B 3D 3A 3G 3L 3E
346 3H 3J 3B 3D 3A 3G 3E 3K
347 3E 3G 3B 3D 3A 3H 3L 3I
348 3E 3G 3B 3D 3A 3H 3I 3K
349 3H 3J 3B 3D 3A 3G 3E 3I
350 3E 3J 3B 3D 3A 3F 3L 3K
351 3E 3I 3B 3D 3A 3F 3L 3K
352 3E 3J 3B 3D 3A 3F 3L 3I
353 3E 3J 3B 3D 3A 3F 3I 3K
354 3H 3E 3B 3D 3A 3F 3L 3K
355 3H 3J 3B 3D 3A 3F 3L 3E
356 3H 3J 3B 3D 3A 3F 3E 3K
357 3H 3E 3B 3D 3A 3F 3L 3I
358 3H 3E 3B 3D 3A 3F 3I 3K
359 3H 3J 3B 3D 3A 3F 3E 3I
360 3E 3G 3B 3D 3A 3F 3L 3K
361 3E 3G 3B 3D 3A 3F 3L 3J
362 3E 3G 3B 3D 3A 3F 3J 3K
363 3E 3G 3B 3D 3A 3F 3L 3I
364 3E 3G 3B 3D 3A 3F 3I 3K
365 3E 3G 3B 3D 3A 3F 3I 3J
366 3H 3G 3B 3D 3A 3F 3L 3E
367 3H 3G 3B 3D 3A 3F 3E 3K
368 3H 3G 3B 3D 3A 3F 3E 3J
369 3H 3G 3B 3D 3A 3F 3E 3I
370 3I 3J 3B 3C 3A 3H 3L 3K
371 3I 3J 3B 3C 3A 3G 3L 3K
372 3H 3J 3B 3C 3A 3G 3L 3K
373 3I 3G 3B 3C 3A 3H 3L 3K
374 3H 3J 3B 3C 3A 3G 3L 3I
375 3H 3J 3B 3C 3A 3G 3I 3K
376 3I 3J 3B 3C 3A 3F 3L 3K
377 3H 3J 3B 3C 3A 3F 3L 3K
378 3H 3I 3B 3C 3A 3F 3L 3K
379 3H 3J 3B 3C 3A 3F 3L 3I
380 3H 3J 3B 3C 3A 3F 3I 3K
381 3C 3J 3B 3F 3A 3G 3L 3K
382 3I 3G 3B 3C 3A 3F 3L 3K
383 3C 3J 3B 3F 3A 3G 3L 3I
384 3C 3J 3B 3F 3A 3G 3I 3K
385 3H 3G 3B 3C 3A 3F 3L 3K
386 3H 3G 3B 3C 3A 3F 3L 3J
387 3H 3G 3B 3C 3A 3F 3J 3K
388 3H 3G 3B 3C 3A 3F 3L 3I
389 3H 3G 3B 3C 3A 3F 3I 3K
390 3H 3G 3B 3C 3A 3F 3I 3J
391 3E 3J 3B 3A 3I 3C 3L 3K
392 3E 3J 3B 3C 3A 3H 3L 3K
393 3E 3I 3B 3C 3A 3H 3L 3K
394 3E 3J 3B 3C 3A 3H 3L 3I
395 3E 3J 3B 3C 3A 3H 3I 3K
396 3E 3J 3B 3C 3A 3G 3L 3K
397 3E 3G 3B 3A 3I 3C 3L 3K
398 3E 3J 3B 3C 3A 3G 3L 3I
399 3E 3J 3B 3C 3A 3G 3I 3K
400 3E 3G 3B 3C 3A 3H 3L 3K
401 3H 3J 3B 3C 3A 3G 3L 3E
402 3H 3J 3B 3C 3A 3G 3E 3K
403 3E 3G 3B 3C 3A 3H 3L 3I
404 3E 3G 3B 3C 3A 3H 3I 3K
405 3H 3J 3B 3C 3A 3G 3E 3I
406 3E 3J 3B 3C 3A 3F 3L 3K
407 3E 3I 3B 3C 3A 3F 3L 3K
408 3E 3J 3B 3C 3A 3F 3L 3I
409 3E 3J 3B 3C 3A 3F 3I 3K
410 3H 3E 3B 3C 3A 3F 3L 3K
411 3H 3J 3B 3C 3A 3F 3L 3E
412 3H 3J 3B 3C 3A 3F 3E 3K
413 3H 3E 3B 3C 3A 3F 3L 3I
414 3H 3E 3B 3C 3A 3F 3I 3K
415 3H 3J 3B 3C 3A 3F 3E 3I
416 3E 3G 3B 3C 3A 3F 3L 3K
417 3E 3G 3B 3C 3A 3F 3L 3J
418 3E 3G 3B 3C 3A 3F 3J 3K
419 3E 3G 3B 3C 3A 3F 3L 3I
420 3E 3G 3B 3C 3A 3F 3I 3K
421 3E 3G 3B 3C 3A 3F 3I 3J
422 3H 3G 3B 3C 3A 3F 3L 3E
423 3H 3G 3B 3C 3A 3F 3E 3K
424 3H 3G 3B 3C 3A 3F 3E 3J
425 3H 3G 3B 3C 3A 3F 3E 3I
426 3I 3J 3B 3C 3A 3D 3L 3K
427 3H 3J 3B 3C 3A 3D 3L 3K
428 3H 3I 3B 3C 3A 3D 3L 3K
429 3H 3J 3B 3C 3A 3D 3L 3I
430 3H 3J 3B 3C 3A 3D 3I 3K
431 3C 3J 3B 3D 3A 3G 3L 3K
432 3I 3G 3B 3C 3A 3D 3L 3K
433 3C 3J 3B 3D 3A 3G 3L 3I
434 3C 3J 3B 3D 3A 3G 3I 3K
435 3H 3G 3B 3C 3A 3D 3L 3K
436 3H 3G 3B 3C 3A 3D 3L 3J
437 3H 3G 3B 3C 3A 3D 3J 3K
438 3H 3G 3B 3C 3A 3D 3L 3I
439 3H 3G 3B 3C 3A 3D 3I 3K
440 3H 3G 3B 3C 3A 3D 3I 3J
441 3C 3J 3B 3D 3A 3F 3L 3K
442 3C 3I 3B 3D 3A 3F 3L 3K
443 3C 3J 3B 3D 3A 3F 3L 3I
444 3C 3J 3B 3D 3A 3F 3I 3K
445 3H 3F 3B 3C 3A 3D 3L 3K
446 3C 3J 3B 3D 3A 3F 3L 3H
447 3H 3J 3B 3C 3A 3F 3D 3K
448 3H 3F 3B 3C 3A 3D 3L 3I
449 3H 3F 3B 3C 3A 3D 3I 3K
450 3H 3J 3B 3C 3A 3F 3D 3I
451 3C 3G 3B 3D 3A 3F 3L 3K
452 3C 3G 3B 3D 3A 3F 3L 3J
453 3C 3G 3B 3D 3A 3F 3J 3K
454 3C 3G 3B 3D 3A 3F 3L 3I
455 3C 3G 3B 3D 3A 3F 3I 3K
456 3C 3G 3B 3D 3A 3F 3I 3J
457 3C 3G 3B 3D 3A 3F 3L 3H
458 3H 3G 3B 3C 3A 3F 3D 3K
459 3H 3G 3B 3C 3A 3F 3D 3J
460 3H 3G 3B 3C 3A 3F 3D 3I
461 3E 3J 3B 3C 3A 3D 3L 3K
462 3E 3I 3B 3C 3A 3D 3L 3K
463 3E 3J 3B 3C 3A 3D 3L 3I
464 3E 3J 3B 3C 3A 3D 3I 3K
465 3H 3E 3B 3C 3A 3D 3L 3K
466 3H 3J 3B 3C 3A 3D 3L 3E
467 3H 3J 3B 3C 3A 3D 3E 3K
468 3H 3E 3B 3C 3A 3D 3L 3I
469 3H 3E 3B 3C 3A 3D 3I 3K
470 3H 3J 3B 3C 3A 3D 3E 3I
471 3E 3G 3B 3C 3A 3D 3L 3K
472 3E 3G 3B 3C 3A 3D 3L 3J
473 3E 3G 3B 3C 3A 3D 3J 3K
474 3E 3G 3B 3C 3A 3D 3L 3I
475 3E 3G 3B 3C 3A 3D 3I 3K
476 3E 3G 3B 3C 3A 3D 3I 3J
477 3H 3G 3B 3C 3A 3D 3L 3E
478 3H 3G 3B 3C 3A 3D 3E 3K
479 3H 3G 3B 3C 3A 3D 3E 3J
480 3H 3G 3B 3C 3A 3D 3E 3I
481 3C 3E 3B 3D 3A 3F 3L 3K
482 3C 3J 3B 3D 3A 3F 3L 3E
483 3C 3J 3B 3D 3A 3F 3E 3K
484 3C 3E 3B 3D 3A 3F 3L 3I
485 3C 3E 3B 3D 3A 3F 3I 3K
486 3C 3J 3B 3D 3A 3F 3E 3I
487 3H 3F 3B 3C 3A 3D 3L 3E
488 3H 3E 3B 3C 3A 3F 3D 3K
489 3H 3J 3B 3C 3A 3F 3D 3E
490 3H 3E 3B 3C 3A 3F 3D 3I
491 3C 3G 3B 3D 3A 3F 3L 3E
492 3C 3G 3B 3D 3A 3F 3E 3K
493 3C 3G 3B 3D 3A 3F 3E 3J
494 3C 3G 3B 3D 3A 3F 3E 3I
495 3H 3G 3B 3C 3A 3F 3D 3E`;
const LAB_ANNEX_SLOTS = ["A", "B", "D", "E", "G", "I", "K", "L"];
const LAB_ANNEX_C = {};
LAB_ANNEX_RAW.trim().split("\n").forEach(line => {
  const parts = line.trim().split(/\s+/);
  LAB_ANNEX_C[parseInt(parts[0], 10)] = parts.slice(1);
});
const LAB_ANNEX_REVERSE = {};
Object.entries(LAB_ANNEX_C).forEach(([num, row]) => {
  const key = row.map(v => v[1]).sort().join("");
  LAB_ANNEX_REVERSE[key] = row;
});

function labAnnexLookup(qualifyingGroups) {
  const key = [...qualifyingGroups].sort().join("");
  let row = LAB_ANNEX_REVERSE[key];
  if (!row) {
    // Fallback: closest match by overlap (mirrors annex_c.py's fallback;
    // shouldn't happen with a complete 495-row table, but stay safe).
    let bestOverlap = -1;
    for (const [k, v] of Object.entries(LAB_ANNEX_REVERSE)) {
      const kset = new Set(k.split(""));
      let overlap = 0;
      qualifyingGroups.forEach(g => { if (kset.has(g)) overlap++; });
      if (overlap > bestOverlap) { bestOverlap = overlap; row = v; }
    }
  }
  const result = {};
  LAB_ANNEX_SLOTS.forEach((slot, i) => { result[slot] = row[i][1]; });
  return result;
}

function labPoints(r) { return r.won * 3 + r.drawn; }
function labGoalDiff(r) { return r.goals_for - r.goals_against; }
function labSortKey(r) {
  return [-labPoints(r), -labGoalDiff(r), -r.goals_for, LAB_FIFA_RANKINGS[r.name] ?? 999];
}
function labCompareKeys(ka, kb) {
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
  return 0;
}
function labNewRecord(name, group) {
  return { name, group, played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0 };
}
function labApplyResult(records, home, away, hs, as_) {
  const h = records[home], a = records[away];
  if (!h || !a) return;
  h.played++; a.played++;
  h.goals_for += hs; h.goals_against += as_;
  a.goals_for += as_; a.goals_against += hs;
  if (hs > as_) { h.won++; a.lost++; }
  else if (hs === as_) { h.drawn++; a.drawn++; }
  else { a.won++; h.lost++; }
}

function labBuildGroupStandings(group, results) {
  const records = {};
  LAB_GROUPS[group].forEach(t => records[t] = labNewRecord(t, group));
  const groupResults = results.filter(r => r.group === group);
  groupResults.forEach(r => labApplyResult(records, r.home, r.away, r.home_score ?? 0, r.away_score ?? 0));
  return labSortGroup(Object.values(records), groupResults);
}

function labSortGroup(records, results) {
  const basic = [...records].sort((a, b) =>
    labPoints(b) - labPoints(a) || labGoalDiff(b) - labGoalDiff(a) || b.goals_for - a.goals_for
  );
  const final = [];
  let i = 0;
  while (i < basic.length) {
    let j = i + 1;
    while (j < basic.length &&
           labPoints(basic[j]) === labPoints(basic[i]) &&
           labGoalDiff(basic[j]) === labGoalDiff(basic[i]) &&
           basic[j].goals_for === basic[i].goals_for) j++;
    let tied = basic.slice(i, j);
    tied = tied.length > 1 ? labBreakH2H(tied, results) : [...tied].sort((a, b) => labCompareKeys(labSortKey(a), labSortKey(b)));
    final.push(...tied);
    i = j;
  }
  return final;
}

function labBreakH2H(tied, results) {
  const names = new Set(tied.map(r => r.name));
  const h2h = {};
  tied.forEach(r => h2h[r.name] = labNewRecord(r.name, r.group));
  results.forEach(res => {
    if (names.has(res.home) && names.has(res.away)) {
      labApplyResult(h2h, res.home, res.away, res.home_score ?? 0, res.away_score ?? 0);
    }
  });
  return Object.values(h2h).sort((a, b) => labCompareKeys(labSortKey(a), labSortKey(b)));
}

function labBuildStandings(results) {
  const out = {};
  Object.keys(LAB_GROUPS).forEach(g => out[g] = labBuildGroupStandings(g, results));
  return out;
}

function labRankThirds(standings) {
  const thirds = Object.entries(standings)
    .filter(([, recs]) => recs.length >= 3)
    .map(([g, recs]) => [g, recs[2]]);
  thirds.sort((a, b) => labCompareKeys(labSortKey(a[1]), labSortKey(b[1])));
  return thirds;
}

function labTeamEntry(rec, group, pos) {
  if (rec) return { team: rec.name, seed: `${pos}${group}`, group, pos };
  return { team: null, seed: `${pos}${group}` };
}

function labProjectBracket(standings, r32Kickoffs) {
  const thirds = labRankThirds(standings);
  const qualifying8 = new Set(thirds.slice(0, 8).map(([g]) => g));
  const annex = labAnnexLookup(qualifying8);
  const thirdByGroup = {};
  thirds.forEach(([g, rec]) => thirdByGroup[g] = rec);

  const matches = [];
  LAB_FIXED_R32.forEach(slotDef => {
    const { group: g1, pos: p1 } = slotDef.t1;
    const { group: g2, pos: p2 } = slotDef.t2;
    const t1 = (standings[g1] || [])[p1 - 1];
    const t2 = (standings[g2] || [])[p2 - 1];
    matches.push({
      slot: slotDef.slot,
      match_number: LAB_MATCH_NUMBERS[slotDef.slot],
      kickoff: (r32Kickoffs || {})[slotDef.slot],
      home: labTeamEntry(t1, g1, p1),
      away: labTeamEntry(t2, g2, p2),
    });
  });
  LAB_THIRD_SLOTS.forEach(slotLetter => {
    const srcGroup = annex[slotLetter];
    const winner = (standings[slotLetter] || [])[0];
    const third = srcGroup ? thirdByGroup[srcGroup] : null;
    const slot = `R${slotLetter}`;
    matches.push({
      slot,
      match_number: LAB_MATCH_NUMBERS[slot],
      kickoff: (r32Kickoffs || {})[slot],
      home: labTeamEntry(winner, slotLetter, 1),
      away: third ? labTeamEntry(third, srcGroup, 3) : { team: null, seed: "3?" },
    });
  });
  matches.sort((a, b) => LAB_BRACKET_TREE_ORDER.indexOf(a.slot) - LAB_BRACKET_TREE_ORDER.indexOf(b.slot));
  return matches;
}

// R32 onward: checks real bookmaker odds first, same convention as
// bot/forecast.py's _match_probs (sorted "TeamA|TeamB" key) - R32 matchups
// are fully determined by group standings well before kickoff, so real
// odds for them may already exist by the time this runs. Falls back to the
// Elo estimate when none exist yet, which in practice is every R16-onward
// matchup, since sportsbooks don't price a match between two teams who
// haven't even played their earlier round yet.
const LAB_DRAW_PROB = 0.25;
function labRealOddsFor(home, away) {
  const real = labRealOdds[[home, away].sort().join("|")];
  if (!real) return null;
  return real.home === home
    ? { pHome: real.p_home, pDraw: real.p_draw }
    : { pHome: real.p_away, pDraw: real.p_draw };
}
function labKnockoutWinProb(home, away) {
  const real = labRealOddsFor(home, away);
  if (real) return real.pHome + real.pDraw / 2;
  const strength = t => Math.pow(10, (labEloRatings[t] ?? 1500) / 400);
  const sh = strength(home), sa = strength(away);
  const pHome = (1 - LAB_DRAW_PROB) * sh / (sh + sa);
  return pHome + LAB_DRAW_PROB / 2;
}

const LAB_R16_NUMBERS = [89, 90, 93, 94, 91, 92, 95, 96];
const LAB_QF_NUMBERS = [97, 98, 99, 100];
const LAB_SF_NUMBERS = [101, 102];
const LAB_FINAL_NUMBER = 104;
const LAB_BRONZE_NUMBER = 103;
const LAB_TBD_ENTRY = { team: null, flag: "🏳", label: tr("tbd"), seed: "?", prob: 0 };

function labAdvanceEntry(teamEntry, winProb) {
  if (!teamEntry?.team) return LAB_TBD_ENTRY;
  return { ...teamEntry, prob: Math.round(winProb * 10000) / 10000 };
}

// Past R32, a team's original group seed ("1F") no longer means anything to
// the matchup in front of you - what matters is which earlier match it came
// out of. relabel() swaps the seed for that: "W93" (winner of match 93) for
// a normal advance, "L101" for the Bronze Final's SF-loser feeders.
function relabelSeed(entry, prefix, srcNumber) {
  if (!entry || entry === LAB_TBD_ENTRY) return { ...LAB_TBD_ENTRY, seed: `${prefix}${srcNumber}` };
  return { ...entry, seed: `${prefix}${srcNumber}` };
}

function labProjectOneMatch(homeEntry, awayEntry, matchNumber, actualByNum = {}) {
  const home = homeEntry?.team ? homeEntry : LAB_TBD_ENTRY;
  const away = awayEntry?.team ? awayEntry : LAB_TBD_ENTRY;
  if (!home.team || !away.team) {
    return { match_number: matchNumber, home, away, winner: null, loser: null };
  }
  // User pick takes priority
  const override = labLaterOverrides[matchNumber];
  if (override?.winner) {
    const winner = override.winner === home.team ? home : away;
    const loser = winner === home ? away : home;
    return { match_number: matchNumber, home, away, winner, loser };
  }
  // Actual completed result
  const actual = actualByNum[matchNumber];
  if (actual) {
    const homeWins = actual.home_score > actual.away_score;
    const homeIsActualHome = actual.home === home.team;
    const winner = (homeWins === homeIsActualHome) ? home : away;
    const loser = winner === home ? away : home;
    return { match_number: matchNumber, home, away, winner, loser };
  }
  // Not yet decided — both teams known but no result or pick
  return { match_number: matchNumber, home, away, winner: null, loser: null };
}

// Given the 16 R32 matches (labProjectBracket()'s output), builds R16 through
// Final entries based solely on confirmed results (actual ft scores from live
// data) and explicit user picks (labR32Overrides / labLaterOverrides).
// No odds/Elo auto-prediction — a match only gets populated when a winner is
// actually known.
function labProjectKnockoutRounds(r32Matches) {
  // Build a lookup of completed knockout match results from live data.
  const actualByNum = {};
  for (const m of allKnockoutMatches) {
    if (m.status === "ft" && m.home_score != null && m.away_score != null) {
      actualByNum[m.number] = m;
    }
  }

  // Determine the winner of each R32 match: user pick → actual result → null.
  let current = r32Matches.map(m => {
    const h = m.home, a = m.away;
    if (!h?.team || !a?.team) return null;
    const pick = labR32Overrides[m.slot];
    if (pick?.winner) return pick.winner === h.team ? h : a;
    const actual = actualByNum[m.match_number];
    if (actual) {
      const homeWins = actual.home_score > actual.away_score;
      const homeIsH = actual.home === h.team;
      return (homeWins === homeIsH) ? h : a;
    }
    return null; // not yet decided
  });
  let currentSrc = r32Matches.map(m => m.match_number);

  const out = [];
  const sfLosers = [];
  const sfLoserSrc = [];

  [LAB_R16_NUMBERS, LAB_QF_NUMBERS, LAB_SF_NUMBERS].forEach(roundNumbers => {
    const nextRound = [];
    const nextSrc = [];
    roundNumbers.forEach((number, i) => {
      const homeW = current[2 * i], awayW = current[2 * i + 1];
      const homeSrc = currentSrc[2 * i], awaySrc = currentSrc[2 * i + 1];
      const home = homeW ? relabelSeed(homeW, "W", homeSrc) : { ...LAB_TBD_ENTRY, seed: `W${homeSrc}` };
      const away = awayW ? relabelSeed(awayW, "W", awaySrc) : { ...LAB_TBD_ENTRY, seed: `W${awaySrc}` };
      const match = labProjectOneMatch(home, away, number, actualByNum);
      out.push(match);
      nextRound.push(match.winner ?? null);
      nextSrc.push(number);
      if (roundNumbers === LAB_SF_NUMBERS) {
        sfLosers.push(match.loser ?? null);
        sfLoserSrc.push(number);
      }
    });
    current = nextRound;
    currentSrc = nextSrc;
  });

  const finHome = current[0] ? relabelSeed(current[0], "W", currentSrc[0]) : { ...LAB_TBD_ENTRY, seed: `W${currentSrc[0]}` };
  const finAway = current[1] ? relabelSeed(current[1], "W", currentSrc[1]) : { ...LAB_TBD_ENTRY, seed: `W${currentSrc[1]}` };
  out.push(labProjectOneMatch(finHome, finAway, LAB_FINAL_NUMBER, actualByNum));

  if (sfLosers.length === 2) {
    const bronzeHome = sfLosers[0] ? relabelSeed(sfLosers[0], "L", sfLoserSrc[0]) : { ...LAB_TBD_ENTRY, seed: `L${sfLoserSrc[0]}` };
    const bronzeAway = sfLosers[1] ? relabelSeed(sfLosers[1], "L", sfLoserSrc[1]) : { ...LAB_TBD_ENTRY, seed: `L${sfLoserSrc[1]}` };
    out.push(labProjectOneMatch(bronzeHome, bronzeAway, LAB_BRONZE_NUMBER, actualByNum));
  }
  return out;
}

// ── LAB STATE & RENDERING ─────────────────────────────────────────────────────
let labInitialized = false;
let labGroupOverrides = {};   // matchKey -> {home_score, away_score} - user-scored group games
let labR32Overrides = {};     // slot -> {home_score, away_score, winner} - user-scored R32 games
let labR32ScoredFor = {};     // slot -> {home, away} team-name snapshot at the time it was scored
let labLaterOverrides = {};   // match_number -> {home_score, away_score, winner} - user-scored R16+ games
let labLaterScoredFor = {};   // match_number -> {home, away} team-name snapshot at the time it was scored
let labFixtureProbs = {};     // matchKey -> {p_home, p_draw, p_away} odds-implied, for the predicted baseline
let labEloRatings = {};       // team -> Elo rating, fallback for projecting R32-Final when no real odds exist for that matchup yet
let labRealOdds = {};         // sorted "TeamA|TeamB" -> {home,away,p_home,p_draw,p_away}, checked before falling back to Elo
let labPrevBracketBySlot = {};
let labPrevPositions = {};
let labLastStandings = {};
let labLastMovedTeams = new Set();
let labOpenSlot = null;
let labOpenLaterNumber = null; // match_number of the open R16+ modal, mutually exclusive with labOpenSlot
let labModalPrevTeams = {}; // slot/number -> {home, away} last rendered in the modal, to detect a live matchup change
let labNotices = [];
let labNoticeSeq = 0;

function labMatchKey(home, away) { return `${home}_${away}`; }

// The placeholder result for a game the user hasn't scored comes straight
// from the backend's most-likely-group-scenario scoreline (see forecast.py
// _most_likely_group_scenario / remaining_fixture_probs) - the same
// concrete result the Odds-Based Projection tab's group order is built
// from, not this single fixture's own favored outcome in isolation. Two
// tabs, one scenario, same pairings.
function labOutcomeFor(home_score, away_score) {
  if (home_score > away_score) return "H";
  if (away_score > home_score) return "A";
  return "D";
}

// The effective result the Lab currently uses for one remaining group
// game: a user-entered score takes priority, then (for a match already
// kicked off) the real live score, then the backend's predicted baseline.
function labResultFor(m) {
  const key = labMatchKey(m.home, m.away);
  const ov = labGroupOverrides[key];
  if (ov) return { home_score: ov.home_score, away_score: ov.away_score, mode: "edited" };
  if (m.status === "live" || m.status === "ht") {
    return { home_score: m.home_score, away_score: m.away_score, mode: "live" };
  }
  const probs = labFixtureProbs[key];
  const home_score = probs ? probs.home_score : 0;
  const away_score = probs ? probs.away_score : 0;
  return { home_score, away_score, mode: "predicted", outcome: labOutcomeFor(home_score, away_score), probs };
}

function labPushNotice(text) {
  const id = ++labNoticeSeq;
  labNotices.push({ id, text });
  setTimeout(() => {
    labNotices = labNotices.filter(n => n.id !== id);
    renderLabNotices();
  }, 5000);
}

function renderLabNotices() {
  const el = document.getElementById("lab-notifications");
  el.innerHTML = labNotices.map(n =>
    `<div class="lab-notice"><span>${n.text}</span><button type="button" data-id="${n.id}">✕</button></div>`
  ).join("");
  el.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      labNotices = labNotices.filter(n => n.id !== parseInt(btn.dataset.id, 10));
      renderLabNotices();
    });
  });
}

function labComputeAndRender() {
  const finished = allMatches.filter(m => m.status === "ft")
    .map(m => ({ home: m.home, away: m.away, group: m.group, home_score: m.home_score, away_score: m.away_score }));
  const remaining = allMatches.filter(m => m.status !== "ft");

  const hypothetical = remaining.map(m => {
    const r = labResultFor(m);
    return { home: m.home, away: m.away, group: m.group, home_score: r.home_score, away_score: r.away_score };
  });

  const results = finished.concat(hypothetical);
  const standings = labBuildStandings(results);
  labLastStandings = standings;

  // Computed once per cycle, before labPrevPositions is overwritten, so both
  // the scenario table and any open modal's group table agree on which rows
  // just moved (the modal renders later in this same function).
  const newPositions = labAllPositions(standings);
  labLastMovedTeams = new Set(
    Object.keys(newPositions).filter(name => labPrevPositions[name] && labPrevPositions[name] !== newPositions[name])
  );
  labPrevPositions = newPositions;

  const r32Kickoffs = {};
  (cachedState.bracket || []).forEach(m => { r32Kickoffs[m.slot] = m.kickoff; });
  const bracket = labProjectBracket(standings, r32Kickoffs);

  // A prediction only means something for the specific two teams it was
  // made for. If an upstream edit changed who's actually playing that
  // match, the old pick is meaningless - clear it and say why, rather than
  // silently keeping a winner pick attached to the wrong teams. Clearing a
  // pick can itself change who arrives at a *later* match (e.g. clearing
  // an R16 pick changes who the QF projects forward), so this re-projects
  // and re-checks until nothing more needs clearing - bounded by the 5
  // rounds after R32, there's no way this loops more than that.
  let laterRounds = labProjectKnockoutRounds(bracket);
  for (let pass = 0; pass < 6; pass++) {
    let invalidated = false;
    bracket.forEach(m => {
      const snap = labR32ScoredFor[m.slot];
      if (snap && (snap.home !== m.home.team || snap.away !== m.away.team)) {
        delete labR32Overrides[m.slot];
        delete labR32ScoredFor[m.slot];
        labPushNotice(trPredictionCleared(m.match_number, "group"));
        invalidated = true;
      }
    });
    laterRounds.forEach(m => {
      const snap = labLaterScoredFor[m.match_number];
      if (snap && (snap.home !== m.home.team || snap.away !== m.away.team)) {
        delete labLaterOverrides[m.match_number];
        delete labLaterScoredFor[m.match_number];
        labPushNotice(trPredictionCleared(m.match_number, "earlier"));
        invalidated = true;
      }
    });
    if (!invalidated) break;
    laterRounds = labProjectKnockoutRounds(bracket);
  }

  renderLabBracket(bracket, laterRounds);
  renderLabStandings(cachedState.standings || {}, new Set());
  renderLabThirds(cachedState.standings || {}, new Set());
  renderLabNotices();
  updateLabBannerState();
  if (labOpenSlot) renderLabModal(labOpenSlot, bracket);
  if (labOpenLaterNumber) renderLabLaterModal(labOpenLaterNumber, laterRounds);
  labInitialized = true;
}

// The reset button only matters once there's something to reset - before
// that it's dead weight next to the bubble explaining what to do. Once an
// edit exists, it takes the bubble's exact slot (same box shape - see
// .lab-reset-btn.standalone) rather than appearing as a second control.
function updateLabBannerState() {
  const hasEdits = Object.keys(labGroupOverrides).length > 0
    || Object.keys(labR32Overrides).length > 0
    || Object.keys(labLaterOverrides).length > 0;
  document.getElementById("lab-info-bubble").style.display = hasEdits ? "none" : "flex";
  const resetBtn = document.getElementById("lab-reset-btn");
  resetBtn.style.display = hasEdits ? "block" : "none";
  resetBtn.classList.toggle("standalone", hasEdits);
}

function renderLabBracket(bracket, laterRounds) {
  const grid = document.getElementById("lab-bracket-grid");
  const laterByNumber = {};
  (laterRounds || []).forEach(m => { laterByNumber[m.match_number] = m; });

  const leftR32 = bracket.slice(0, 8);
  const rightR32 = bracket.slice(8, 16);

  const renderLaterSlot = (num, col, rowStart, rowSpan) => {
    const style = `grid-column:${col};grid-row:${rowStart} / span ${rowSpan}`;
    const m = laterByNumber[num];
    if (m && (m.home?.team || m.away?.team)) {
      if (!m.home?.team || !m.away?.team) {
        return laterRoundCard(num, m, style, "lab-card", `data-number="${num}"`);
      }
      const pick = labLaterOverrides[num];
      const actualM = allKnockoutMatches.find(x => x.number === num);
      const homeScore = pick ? pick.home_score : (actualM?.home_score ?? null);
      const awayScore = pick ? pick.away_score : (actualM?.away_score ?? null);
      const winnerTeam = pick?.winner ?? actualM?.winner ?? null;
      const homeIsWinner = winnerTeam != null ? (winnerTeam === m.home?.team) : undefined;
      const awayIsWinner = winnerTeam != null ? (winnerTeam === m.away?.team) : undefined;
      const isFinished = actualM?.status === "ft";
      const decidedByPen = actualM?.decided_by_pen ?? false;
      return resultCard(num, m.home, m.away, {
        homeScore, awayScore, homeIsWinner, awayIsWinner,
        extraClass: `lab-card later-round${pick ? " lab-picked" : ""}${isFinished ? " finished" : ""}`,
        style,
        attrs: `data-number="${num}" data-match-num="${num}"`,
        decidedByPen, penHome: decidedByPen ? (actualM?.pen_home ?? null) : null,
        penAway: decidedByPen ? (actualM?.pen_away ?? null) : null,
      });
    }
    return labTbdCard(num, style);
  };

  const labCardOnly = (num) => {
    const m = laterByNumber[num];
    if (m && (m.home?.team || m.away?.team)) {
      if (!m.home?.team || !m.away?.team) {
        return laterRoundCard(num, m, "", "lab-card", `data-number="${num}"`);
      }
      const pick = labLaterOverrides[num];
      const actualM = allKnockoutMatches.find(x => x.number === num);
      const homeScore = pick ? pick.home_score : (actualM?.home_score ?? null);
      const awayScore = pick ? pick.away_score : (actualM?.away_score ?? null);
      const winnerTeam = pick?.winner ?? actualM?.winner ?? null;
      const homeIsWinner = winnerTeam != null ? (winnerTeam === m.home?.team) : undefined;
      const awayIsWinner = winnerTeam != null ? (winnerTeam === m.away?.team) : undefined;
      const isFinished = actualM?.status === "ft";
      const decidedByPen = actualM?.decided_by_pen ?? false;
      return resultCard(num, m.home, m.away, {
        homeScore, awayScore, homeIsWinner, awayIsWinner,
        extraClass: `lab-card later-round${pick ? " lab-picked" : ""}${isFinished ? " finished" : ""}`,
        attrs: `data-number="${num}" data-match-num="${num}"`,
        decidedByPen, penHome: decidedByPen ? (actualM?.pen_home ?? null) : null,
        penAway: decidedByPen ? (actualM?.pen_away ?? null) : null,
      });
    }
    return labTbdCard(num);
  };

  const labRoundGroup = (num, col, rowStart, label) =>
    `<div class="bracket-int-group" style="grid-column:${col};grid-row:${rowStart} / span 2">
      <div class="bracket-int-label">${label}</div>
      ${labCardOnly(num)}
    </div>`;

  let html = "";

  // Round titles (row 1) — only R32 and R16 columns
  [[1, tr("round_r32")], [2, tr("round_r16")],
   [6, tr("round_r16")], [7, tr("round_r32")]
  ].forEach(([col, label]) => {
    html += `<div class="round-title" style="grid-column:${col};grid-row:1">${label}</div>`;
  });

  // Left R32: col 1, rows 2-9
  html += leftR32.map((m, i) => {
    const prev = labPrevBracketBySlot[m.slot];
    const changed = prev && (prev.home?.team !== m.home?.team || prev.away?.team !== m.away?.team);
    labPrevBracketBySlot[m.slot] = m;
    const pick = labR32Overrides[m.slot];
    const actualM = allKnockoutMatches.find(x => x.number === m.match_number);
    const homeScore = pick ? pick.home_score : (actualM?.home_score ?? null);
    const awayScore = pick ? pick.away_score : (actualM?.away_score ?? null);
    const winnerTeam = pick?.winner ?? actualM?.winner ?? null;
    const homeIsWinner = winnerTeam != null ? (winnerTeam === m.home?.team) : undefined;
    const awayIsWinner = winnerTeam != null ? (winnerTeam === m.away?.team) : undefined;
    const isFinished = actualM?.status === "ft";
    const decidedByPen = actualM?.decided_by_pen ?? false;
    return resultCard(m.match_number, m.home, m.away, {
      homeScore, awayScore, homeIsWinner, awayIsWinner,
      extraClass: `lab-card${changed ? " lab-flash" : ""}${pick ? " lab-picked" : ""}${isFinished ? " finished" : ""}`,
      style: `grid-column:1;grid-row:${i + 2}`,
      attrs: `data-slot="${m.slot}" data-match-num="${m.match_number ?? i + 73}"`,
      decidedByPen, penHome: decidedByPen ? (actualM?.pen_home ?? null) : null,
      penAway: decidedByPen ? (actualM?.pen_away ?? null) : null,
    });
  }).join("");

  // Right R32: col 7, rows 2-9
  html += rightR32.map((m, i) => {
    const prev = labPrevBracketBySlot[m.slot];
    const changed = prev && (prev.home?.team !== m.home?.team || prev.away?.team !== m.away?.team);
    labPrevBracketBySlot[m.slot] = m;
    const pick = labR32Overrides[m.slot];
    const actualM = allKnockoutMatches.find(x => x.number === m.match_number);
    const homeScore = pick ? pick.home_score : (actualM?.home_score ?? null);
    const awayScore = pick ? pick.away_score : (actualM?.away_score ?? null);
    const winnerTeam = pick?.winner ?? actualM?.winner ?? null;
    const homeIsWinner = winnerTeam != null ? (winnerTeam === m.home?.team) : undefined;
    const awayIsWinner = winnerTeam != null ? (winnerTeam === m.away?.team) : undefined;
    const isFinished = actualM?.status === "ft";
    const decidedByPen = actualM?.decided_by_pen ?? false;
    return resultCard(m.match_number, m.home, m.away, {
      homeScore, awayScore, homeIsWinner, awayIsWinner,
      extraClass: `lab-card${changed ? " lab-flash" : ""}${pick ? " lab-picked" : ""}${isFinished ? " finished" : ""}`,
      style: `grid-column:7;grid-row:${i + 2}`,
      attrs: `data-slot="${m.slot}" data-match-num="${m.match_number ?? i + 81}"`,
      decidedByPen, penHome: decidedByPen ? (actualM?.pen_home ?? null) : null,
      penAway: decidedByPen ? (actualM?.pen_away ?? null) : null,
    });
  }).join("");

  // Left R16: col 2
  [89, 90, 93, 94].forEach((num, i) => { html += renderLaterSlot(num, 2, i * 2 + 2, 2); });

  // Left QF+SF: col 3 (integrated groups)
  html += labRoundGroup(97,  3, 3, `${tr("round_qf_abbr")} 1`);
  html += labRoundGroup(101, 3, 5, `${tr("round_sf_abbr")} 1`);
  html += labRoundGroup(98,  3, 7, `${tr("round_qf_abbr")} 2`);

  // Center: col 4 — Final and Bronze
  html += labRoundGroup(104, 4, 4, tr("round_final"));
  html += labRoundGroup(103, 4, 6, tr("round_bronze_singular"));

  // Right QF+SF: col 5 (integrated groups)
  html += labRoundGroup(99,  5, 3, `${tr("round_qf_abbr")} 3`);
  html += labRoundGroup(102, 5, 5, `${tr("round_sf_abbr")} 2`);
  html += labRoundGroup(100, 5, 7, `${tr("round_qf_abbr")} 4`);

  // Right R16: col 6
  [91, 92, 95, 96].forEach((num, i) => { html += renderLaterSlot(num, 6, i * 2 + 2, 2); });

  grid.innerHTML = html;
  grid.querySelectorAll(".lab-card[data-slot]").forEach(card => {
    const matchNum = parseInt(card.dataset.matchNum, 10);
    const concluded = matchNum && allKnockoutMatches.find(m => m.number === matchNum && m.status === "ft" && m.winner);
    if (concluded) {
      card.classList.add("lab-concluded");
    } else {
      card.addEventListener("click", () => openLabModal(card.dataset.slot));
    }
  });
  wireOddsBadges(grid);
  grid.querySelectorAll(".lab-card[data-number]").forEach(card => {
    const num = parseInt(card.dataset.number, 10);
    const concluded = allKnockoutMatches.find(m => m.number === num && m.status === "ft" && m.winner);
    if (concluded) {
      card.classList.add("lab-concluded");
    } else {
      card.addEventListener("click", () => openLabLaterModal(num));
    }
  });
}

function labAllPositions(standings) {
  const positions = {};
  Object.values(standings).forEach(teams => {
    teams.forEach((t, i) => { positions[t.name] = i + 1; });
  });
  return positions;
}

// Shared by the scenario-wide standings grid and the per-matchup modal, so
// MP/GD/Pts and the just-moved flash always read identically in both places.
function renderLabGroupTable(g, teams, movedTeams) {
  const rows = teams.map((t, i) => {
    const pos = i + 1;
    const moved = movedTeams.has(t.name);
    return `<div class="standings-row${moved ? " lab-moved" : ""}">
      <div class="pos-badge p${pos}">${pos}</div>
      <div class="standings-team">
        ${flagImg(t.name)}
        <span class="name">${tn(t.name)}</span>
      </div>
      <div class="standings-col">${t.played}</div>
      <div class="standings-col">${labGoalDiff(t) >= 0 ? "+" : ""}${labGoalDiff(t)}</div>
      <div class="standings-col">${labPoints(t)}</div>
    </div>`;
  }).join("");
  return `<div class="group-card">
    <div class="group-head">
      <span class="gh-name">${tr("group_label")} ${g}</span>
      <span class="gh-col" style="width:54px"></span>
      <span class="gh-col">${tr("mp")}</span><span class="gh-col">${tr("gd")}</span><span class="gh-col">${tr("pts")}</span>
    </div>
    ${rows}
  </div>`;
}

function renderLabStandings(standings, movedTeams) {
  const section = document.getElementById("lab-standings-section");
  if (isGroupStageSettled()) { if (section) section.style.display = "none"; return; }
  if (section) section.style.display = "";
  const grid = document.getElementById("lab-standings-grid");
  const groups = "ABCDEFGHIJKL".split("");
  grid.innerHTML = groups.map(g => renderLabGroupTable(g, standings[g] || [], movedTeams)).join("");
}

function renderLabThirds(standings, movedTeams) {
  const section = document.getElementById("lab-thirds-section");
  if (isGroupStageSettled()) { if (section) section.style.display = "none"; return; }
  if (section) section.style.display = "";
  document.getElementById("lab-thirds-list").innerHTML = renderLabThirdsTable(standings, movedTeams);
}

// Cross-group third-place ranking, same shape as renderLabGroupTable so it
// drops into the modal as a normal third column - top 8 qualify for R32.
function renderLabThirdsTable(standings, movedTeams) {
  const thirds = labRankThirds(standings);
  const rows = thirds.map(([g, rec], i) => {
    const rank = i + 1;
    const badgeCls = rank <= 8 ? "qualify" : "eliminated";
    const moved = movedTeams.has(rec.name);
    return `<div class="standings-row${moved ? " lab-moved" : ""}">
      <div class="pos-badge ${badgeCls}">${rank}</div>
      <div class="standings-team">
        ${flagImg(rec.name)}
        <span class="name">${tn(rec.name)}</span>
      </div>
      <span class="gh-col" style="width:24px;flex-shrink:0;color:var(--muted);font-weight:700">${g}</span>
      <div class="standings-col">${rec.played}</div>
      <div class="standings-col">${labGoalDiff(rec) >= 0 ? "+" : ""}${labGoalDiff(rec)}</div>
      <div class="standings-col">${labPoints(rec)}</div>
    </div>`;
  }).join("");
  return `<div class="group-card">
    <div class="group-head">
      <span class="gh-name">${tr("thirds_race_short")}</span>
      <span class="gh-col" style="width:24px"></span>
      <span class="gh-col">${tr("mp")}</span><span class="gh-col">${tr("gd")}</span><span class="gh-col">${tr("pts")}</span>
    </div>
    ${rows}
  </div>`;
}

// ── LAB MODAL: contextual editor for one R32 matchup ──────────────────────────
// Edits apply live (each keystroke recomputes the whole bracket) so the
// user can see the downstream effect as they type - but "quit without
// saving" still needs something to revert to, so a snapshot of every
// override store is taken the moment the modal opens.
let labModalSnapshot = null;
function snapshotLabOverrides() {
  return JSON.parse(JSON.stringify({
    group: labGroupOverrides, r32: labR32Overrides, r32ScoredFor: labR32ScoredFor,
    later: labLaterOverrides, laterScoredFor: labLaterScoredFor,
  }));
}
function restoreLabOverrides(snap) {
  labGroupOverrides = snap.group;
  labR32Overrides = snap.r32;
  labR32ScoredFor = snap.r32ScoredFor;
  labLaterOverrides = snap.later;
  labLaterScoredFor = snap.laterScoredFor;
}
function labOverridesChangedSinceSnapshot() {
  return JSON.stringify(snapshotLabOverrides()) !== JSON.stringify(labModalSnapshot);
}

function openLabModal(slot) {
  labOpenSlot = slot;
  labOpenLaterNumber = null;
  labModalSnapshot = snapshotLabOverrides();
  document.getElementById("lab-modal-backdrop").style.display = "flex";
  labComputeAndRender();
}
function openLabLaterModal(matchNumber) {
  // Concluded knockout matches (actual result from ESPN) are read-only —
  // the real score is already locked in and the Lab uses it unconditionally.
  const concluded = allKnockoutMatches.find(
    m => m.number === matchNumber && m.status === "ft" && m.winner
  );
  if (concluded) return;

  labOpenLaterNumber = matchNumber;
  labOpenSlot = null;
  labModalSnapshot = snapshotLabOverrides();
  document.getElementById("lab-modal-backdrop").style.display = "flex";
  labComputeAndRender();
}
function closeLabModal() {
  labOpenSlot = null;
  labOpenLaterNumber = null;
  labModalSnapshot = null;
  document.getElementById("lab-modal-backdrop").style.display = "none";
}
function requestCloseLabModal() {
  if (!labModalSnapshot || !labOverridesChangedSinceSnapshot()) {
    closeLabModal();
    return;
  }
  document.getElementById("lab-quit-confirm-backdrop").style.display = "flex";
}
document.getElementById("lab-modal-close").addEventListener("click", requestCloseLabModal);
document.getElementById("lab-modal-done").addEventListener("click", closeLabModal);
document.getElementById("lab-modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "lab-modal-backdrop") requestCloseLabModal();
});
document.getElementById("lab-quit-keep-editing").addEventListener("click", () => {
  document.getElementById("lab-quit-confirm-backdrop").style.display = "none";
});
document.getElementById("lab-quit-close").addEventListener("click", () => {
  restoreLabOverrides(labModalSnapshot);
  document.getElementById("lab-quit-confirm-backdrop").style.display = "none";
  closeLabModal();
  labComputeAndRender();
});
document.getElementById("lab-quit-save-close").addEventListener("click", () => {
  document.getElementById("lab-quit-confirm-backdrop").style.display = "none";
  closeLabModal();
});

// The modal fully re-renders on every keystroke (live recompute can change
// which two teams are even in this matchup), which would normally steal
// focus/caret position out from under the user mid-type - this captures
// the active input before the re-render and restores it after.
function captureLabFocus(root) {
  const el = document.activeElement;
  if (!el || !root.contains(el) || el.tagName !== "INPUT") return null;
  let selector;
  if (el.dataset.r32Slot) {
    selector = `input[data-r32-slot="${el.dataset.r32Slot}"][data-side="${el.dataset.side}"]`;
  } else if (el.dataset.laterNumber) {
    selector = `input[data-later-number="${el.dataset.laterNumber}"][data-side="${el.dataset.side}"]`;
  } else if (el.dataset.home) {
    selector = `input[data-home="${CSS.escape(el.dataset.home)}"][data-away="${CSS.escape(el.dataset.away)}"][data-side="${el.dataset.side}"]`;
  } else {
    return null;
  }
  return { selector, pos: el.selectionStart };
}
function restoreLabFocus(root, snap) {
  if (!snap) return;
  const el = root.querySelector(snap.selector);
  if (!el) return;
  el.focus();
  try { el.setSelectionRange(snap.pos, snap.pos); } catch (e) {}
}

function renderLabModal(slot, bracket) {
  const m = bracket.find(x => x.slot === slot);
  if (!m) { closeLabModal(); return; }

  const modalRoot = document.getElementById("lab-modal");
  const focusSnap = captureLabFocus(modalRoot);

  document.getElementById("lab-modal-title").textContent =
    `${tr("match_label")} ${m.match_number} — ${tn(m.home.team) || tr("tbd")} vs ${tn(m.away.team) || tr("tbd")}`;

  const prevTeams = labModalPrevTeams[slot];
  const teamsChanged = prevTeams && (prevTeams.home !== m.home.team || prevTeams.away !== m.away.team);
  labModalPrevTeams[slot] = { home: m.home.team, away: m.away.team };

  const pickEl = document.getElementById("lab-modal-pick");
  pickEl.innerHTML = renderLabMatchupPick(m);

  const groups = [...new Set([m.home.group, m.away.group].filter(Boolean))];
  // Always included, not just when one of these two teams is itself a
  // 3rd-place qualifier - editing any group's scores can shift the
  // cross-group 3rd-place ranking and bump a *different* group's 3rd-place
  // team across the qualification line.
  const thirdColumn = `<div class="lab-group-block">${renderLabThirdsTable(labLastStandings, labLastMovedTeams)}</div>`;
  const body = document.getElementById("lab-modal-body");
  body.innerHTML = `<div class="lab-modal-columns">${groups.map(g => renderLabGroupBlock(g)).join("")}${thirdColumn}</div>`;

  wireLabFixtureInputs(body);
  wireLabMatchupPick(pickEl, m);
  restoreLabFocus(modalRoot, focusSnap);

  if (teamsChanged) {
    const sticky = document.querySelector(".lab-modal-sticky");
    sticky.classList.remove("lab-flash");
    void sticky.offsetWidth;
    sticky.classList.add("lab-flash");
  }
}

function renderLabGroupBlock(g) {
  const table = renderLabGroupTable(g, labLastStandings[g] || [], labLastMovedTeams);

  // Upcoming/live/edited games on top (the ones that still matter to edit),
  // finished games below (reference only) - reverse of plain chronological
  // order, which would bury the editable games under the played ones.
  const byKickoff = (a, b) => new Date(a.kickoff) - new Date(b.kickoff);
  const groupMatches = allMatches.filter(m => m.group === g);
  const upcoming = groupMatches.filter(m => m.status !== "ft").sort(byKickoff);
  const finished = groupMatches.filter(m => m.status === "ft").sort(byKickoff);
  const fixtureRows = upcoming.concat(finished).map(renderLabFixtureRow).join("");

  return `<div class="lab-group-block">
    ${table}
    ${fixtureRows}
  </div>`;
}

function renderLabFixtureRow(m) {
  if (m.status === "ft") {
    return `<div class="lab-fixture-row completed">
      <div class="lab-fixture-team">${flagImg(m.home)}<span class="name">${tn(m.home)}</span><span>${m.home_score}</span></div>
      <div class="lab-fixture-team">${flagImg(m.away)}<span class="name">${tn(m.away)}</span><span>${m.away_score}</span></div>
    </div>`;
  }

  const r = labResultFor(m);
  const isLive = m.status === "live" || m.status === "ht";
  const minHome = isLive ? m.home_score : 0;
  const minAway = isLive ? m.away_score : 0;
  const homeShown = r.mode === "predicted" ? "" : r.home_score;
  const awayShown = r.mode === "predicted" ? "" : r.away_score;
  const statusLabel = isLive ? `<span class="lab-live-dot"></span>${tr("live_now")}` : "";
  const topRow = statusLabel ? `<div class="lab-fixture-top">${statusLabel}</div>` : "";

  return `<div class="lab-fixture-row ${r.mode}">
    ${topRow}
    <div class="lab-fixture-team">
      ${flagImg(m.home)}<span class="name">${tn(m.home)}</span>
      <input type="number" class="lab-score-input" min="${minHome}" max="99" value="${homeShown}" placeholder="${minHome}"
        data-home="${m.home}" data-away="${m.away}" data-side="home" data-min="${minHome}">
    </div>
    <div class="lab-fixture-team">
      ${flagImg(m.away)}<span class="name">${tn(m.away)}</span>
      <input type="number" class="lab-score-input" min="${minAway}" max="99" value="${awayShown}" placeholder="${minAway}"
        data-home="${m.home}" data-away="${m.away}" data-side="away" data-min="${minAway}">
    </div>
  </div>`;
}

function wireLabFixtureInputs(container) {
  container.querySelectorAll(".lab-score-input[data-home]").forEach(input => {
    input.addEventListener("input", () => {
      const min = parseInt(input.dataset.min, 10) || 0;
      let val = parseInt(input.value, 10);
      if (isNaN(val) || val < min) val = min;

      const home = input.dataset.home, away = input.dataset.away;
      const key = labMatchKey(home, away);
      const m = allMatches.find(x => x.home === home && x.away === away);
      const current = labResultFor(m);
      // First edit on a still-"predicted" fixture must start from a real 0-0,
      // not the hidden odds-favored placeholder score - otherwise typing "1"
      // into just one side can silently inherit the other side's invisible
      // favored number (e.g. away-favored 0-1 + typing home=1 -> shown 1-1).
      // A live match is different: there's a real partial score to preserve.
      const existing = labGroupOverrides[key] || (
        current.mode === "live"
          ? { home_score: current.home_score, away_score: current.away_score }
          : { home_score: 0, away_score: 0 }
      );
      existing[`${input.dataset.side}_score`] = val;
      labGroupOverrides[key] = existing;
      labComputeAndRender();
    });
  });
}

function renderLabMatchupPick(m) {
  if (!m.home.team || !m.away.team) return "";
  const pick = labR32Overrides[m.slot];
  const homeVal = pick ? pick.home_score : "";
  const awayVal = pick ? pick.away_score : "";
  const showTieBreak = pick && pick.home_score === pick.away_score && !pick.winner;

  return `<div class="lab-matchup-pick">
    <div class="lab-matchup-pick-title">${trPredictMatchup(tr("round_r32"))}</div>
    <div class="lab-pick-row">
      ${flagImg(m.home.team)}<span class="name">${tn(m.home.team)}</span>
      <input type="number" class="lab-score-input" min="0" max="20" value="${homeVal}" placeholder="0"
        data-r32-slot="${m.slot}" data-side="home">
    </div>
    <div class="lab-pick-row">
      ${flagImg(m.away.team)}<span class="name">${tn(m.away.team)}</span>
      <input type="number" class="lab-score-input" min="0" max="20" value="${awayVal}" placeholder="0"
        data-r32-slot="${m.slot}" data-side="away">
    </div>
    ${showTieBreak ? `
      <div class="lab-tie-note">${tr("tie_note")}</div>
      <button type="button" class="lab-tie-btn" data-r32-winner-slot="${m.slot}" data-r32-winner-team="${m.home.team}">${tn(m.home.team)}</button>
      <button type="button" class="lab-tie-btn" data-r32-winner-slot="${m.slot}" data-r32-winner-team="${m.away.team}">${tn(m.away.team)}</button>
    ` : ""}
  </div>`;
}

function wireLabMatchupPick(container, m) {
  container.querySelectorAll("input[data-r32-slot]").forEach(input => {
    input.addEventListener("input", () => {
      const slot = input.dataset.r32Slot;
      let val = parseInt(input.value, 10);
      if (isNaN(val) || val < 0) val = 0;
      const existing = labR32Overrides[slot] || { home_score: 0, away_score: 0 };
      existing[`${input.dataset.side}_score`] = val;
      delete existing.winner; // score changed - any earlier penalty-shootout pick is stale
      if (existing.home_score !== existing.away_score) {
        existing.winner = existing.home_score > existing.away_score ? m.home.team : m.away.team;
      }
      labR32Overrides[slot] = existing;
      labR32ScoredFor[slot] = { home: m.home.team, away: m.away.team };
      labComputeAndRender();
    });
  });
  container.querySelectorAll("[data-r32-winner-slot]").forEach(btn => {
    btn.addEventListener("click", () => {
      labR32Overrides[btn.dataset.r32WinnerSlot].winner = btn.dataset.r32WinnerTeam;
      labComputeAndRender();
    });
  });
}

// ── LAB MODAL: R16-onward (simple - no groups/fixtures, just this match) ──────
// Per explicit design: which winner meets which is already a fixed lookup,
// not something that needs group context or drilling into feeder matches -
// once R32 is scored, R16 (and onward) is just "pick a score for this game."
function labRoundNameForNumber(num) {
  if (LAB_R16_NUMBERS.includes(num)) return tr("round_r16_singular");
  if (LAB_QF_NUMBERS.includes(num)) return tr("round_qf_singular");
  if (LAB_SF_NUMBERS.includes(num)) return tr("round_sf_singular");
  if (num === LAB_FINAL_NUMBER) return tr("round_final");
  if (num === LAB_BRONZE_NUMBER) return tr("round_bronze_singular");
  return tr("round_r32");
}

function renderLabLaterModal(num, laterRounds) {
  const m = laterRounds.find(x => x.match_number === num);
  if (!m) { closeLabModal(); return; }

  const modalRoot = document.getElementById("lab-modal");
  const focusSnap = captureLabFocus(modalRoot);

  document.getElementById("lab-modal-title").textContent =
    `${tr("match_label")} ${num} — ${tn(m.home?.team) || tr("tbd")} vs ${tn(m.away?.team) || tr("tbd")}`;

  const prevTeams = labModalPrevTeams[num];
  const teamsChanged = prevTeams && (prevTeams.home !== m.home?.team || prevTeams.away !== m.away?.team);
  labModalPrevTeams[num] = { home: m.home?.team, away: m.away?.team };

  const pickEl = document.getElementById("lab-modal-pick");
  pickEl.innerHTML = renderLabLaterPick(m, num);
  document.getElementById("lab-modal-body").innerHTML = "";

  wireLabLaterPick(pickEl, m, num);
  restoreLabFocus(modalRoot, focusSnap);

  if (teamsChanged) {
    const sticky = document.querySelector(".lab-modal-sticky");
    sticky.classList.remove("lab-flash");
    void sticky.offsetWidth;
    sticky.classList.add("lab-flash");
  }
}

function renderLabLaterPick(m, num) {
  if (!m.home?.team || !m.away?.team) return "";
  const pick = labLaterOverrides[num];
  const homeVal = pick ? pick.home_score : "";
  const awayVal = pick ? pick.away_score : "";
  const showTieBreak = pick && pick.home_score === pick.away_score && !pick.winner;

  return `<div class="lab-matchup-pick">
    <div class="lab-matchup-pick-title">${trPredictMatchup(labRoundNameForNumber(num))}</div>
    <div class="lab-pick-row">
      ${flagImg(m.home.team)}<span class="name">${tn(m.home.team)}</span>
      <input type="number" class="lab-score-input" min="0" max="20" value="${homeVal}" placeholder="0"
        data-later-number="${num}" data-side="home">
    </div>
    <div class="lab-pick-row">
      ${flagImg(m.away.team)}<span class="name">${tn(m.away.team)}</span>
      <input type="number" class="lab-score-input" min="0" max="20" value="${awayVal}" placeholder="0"
        data-later-number="${num}" data-side="away">
    </div>
    ${showTieBreak ? `
      <div class="lab-tie-note">${tr("tie_note")}</div>
      <button type="button" class="lab-tie-btn" data-later-winner-number="${num}" data-later-winner-team="${m.home.team}">${tn(m.home.team)}</button>
      <button type="button" class="lab-tie-btn" data-later-winner-number="${num}" data-later-winner-team="${m.away.team}">${tn(m.away.team)}</button>
    ` : ""}
  </div>`;
}

function wireLabLaterPick(container, m, num) {
  container.querySelectorAll("input[data-later-number]").forEach(input => {
    input.addEventListener("input", () => {
      let val = parseInt(input.value, 10);
      if (isNaN(val) || val < 0) val = 0;
      const existing = labLaterOverrides[num] || { home_score: 0, away_score: 0 };
      existing[`${input.dataset.side}_score`] = val;
      delete existing.winner; // score changed - any earlier penalty-shootout pick is stale
      if (existing.home_score !== existing.away_score) {
        existing.winner = existing.home_score > existing.away_score ? m.home.team : m.away.team;
      }
      labLaterOverrides[num] = existing;
      labLaterScoredFor[num] = { home: m.home.team, away: m.away.team };
      labComputeAndRender();
    });
  });
  container.querySelectorAll("[data-later-winner-number]").forEach(btn => {
    btn.addEventListener("click", () => {
      labLaterOverrides[parseInt(btn.dataset.laterWinnerNumber, 10)].winner = btn.dataset.laterWinnerTeam;
      labComputeAndRender();
    });
  });
}

document.getElementById("lab-reset-btn").addEventListener("click", () => {
  labGroupOverrides = {};
  labR32Overrides = {};
  labR32ScoredFor = {};
  labLaterOverrides = {};
  labLaterScoredFor = {};
  labNotices = [];
  labComputeAndRender();
});

function initLab() {
  labFixtureProbs = {};
  (cachedState.fixture_probs || []).forEach(f => {
    labFixtureProbs[labMatchKey(f.home, f.away)] = f;
  });
  labEloRatings = cachedState.elo_ratings || {};
  labRealOdds = cachedState.real_odds || {};
  labComputeAndRender();
  updateFuturesBanner();
}

// ── LAST UPDATED ──────────────────────────────────────────────────────────────
function renderLastUpdated(ts) {
  const el = document.getElementById("last-updated");
  if (!ts) { el.textContent = ""; return; }
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) el.textContent = tr("updated_just_now");
  else if (diff < 3600) el.textContent = LANG === "es" ? `Actualizado hace ${Math.floor(diff/60)}m` : `Updated ${Math.floor(diff/60)}m ago`;
  else el.textContent = LANG === "es" ? `Actualizado hace ${Math.floor(diff/3600)}h` : `Updated ${Math.floor(diff/3600)}h ago`;
}

// ── POLLING ───────────────────────────────────────────────────────────────────
// Two independent loops: cachedState only changes when a match finishes
// (cron-driven, can lag), so it's polled slowly. liveMatches comes straight
// from ESPN on every call and drives the live banner, the standings
// overlay, and the ticking clock — polled fast since that's the whole
// point of bypassing the cron for it.
// fetchState and fetchLive resolve independently — if either one rendered
// on its own before the other ever loaded, the standings would render once
// without the live overlay and once with it moments later, which the
// move-arrow logic would misread as a real position change. So neither
// renders until both have loaded at least once; after that, either one
// triggers a normal re-render on its own.
let stateLoadedOnce = false;
let liveLoadedOnce = false;

// /api/live also returns matches that finished recently (status "ft"), so
// the banner doesn't vanish the instant the final whistle blows. But those
// must NOT feed the standings overlay — once the cron's next tick picks a
// finished match up into cachedState, overlaying it again here would
// double-count it. Only genuinely in-progress matches go into the overlay;
// the banner prefers in-progress, falling back to recently-finished ones
// only when nothing is currently live.
function inProgressMatches(matches) {
  return matches.filter(m => m.status === "live" || m.status === "ht");
}

function renderAll() {
  if (!stateLoadedOnce || !liveLoadedOnce) return;
  const active = inProgressMatches(liveMatches);
  allKnockoutMatches = buildKnockoutStripEntries(); // built from cachedState.bracket + knockoutLiveData
  renderTodayStrip(allMatches.concat(allKnockoutMatches));
  renderBracket(cachedState.bracket);
  renderStandings(applyLiveOverlay(cachedState.standings, active), active);
  renderThirds(cachedState.thirds_race);
  renderPredictedBracket(cachedState.predicted_bracket);
  renderPredictedStandings(cachedState.predicted_standings);
  renderPredictedThirds(cachedState.predicted_thirds_race);
  renderLastUpdated(cachedState.last_updated);
  updateFuturesBanner();
}

// ── TABS ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-actual").style.display = btn.dataset.tab === "actual" ? "block" : "none";
    document.getElementById("tab-predicted").style.display = btn.dataset.tab === "predicted" ? "block" : "none";
    document.getElementById("tab-lab").style.display = btn.dataset.tab === "lab" ? "block" : "none";
    if (btn.dataset.tab === "lab") initLab();
  });
});

async function fetchState() {
  try {
    const res = await fetch("/api/state");
    if (!res.ok) return;
    cachedState = await res.json();
    stateLoadedOnce = true;
    renderAll();
  } catch (e) {
    console.error("fetchState error:", e);
  }
}

// Adaptive interval, not a fixed setInterval: poll quickly only while a
// match is actually in progress; back off hard the rest of the time. A
// fixed fast interval is what burned through Netlify's free-tier usage
// limits and got the site paused — most of the tournament has nothing
// live at all, and that's most of the day.
const LIVE_POLL_ACTIVE_MS = 20000;
const LIVE_POLL_IDLE_MS = 90000;
let liveFetchTimer = null;

async function fetchLive() {
  try {
    const res = await fetch("/api/live");
    if (res.ok) {
      const data = await res.json();
      liveMatches = data.live_matches || [];
      allMatches = data.all_matches || [];

      // Merge knockout live data with bracket match numbers so the strip
      // can show live clocks and scores during knockout matches. We match
      // by home+away team names against cachedState.bracket.
      const koRaw = data.knockout_matches || [];
      if (koRaw.length && cachedState?.bracket) {
        const bracketByTeams = {};
        for (const m of cachedState.bracket) {
          if (m.home?.team && m.away?.team)
            bracketByTeams[`${m.home.team}|${m.away.team}`] = m;
        }
        // koRaw entries don't have match numbers yet — fill them in from bracket
        for (const m of koRaw) {
          const bm = bracketByTeams[`${m.home}|${m.away}`];
          if (bm) m.number = bm.match_number;
        }
      }
      // Store raw data for buildKnockoutStripEntries() to pick up in renderAll()
      knockoutLiveData = koRaw.filter(m => m.number);

      const now = Date.now();
      for (const m of liveMatches) {
        liveTickers[matchKey(m)] = {
          baseMinute: m.status === "live" ? parseMinute(m.minute) : null,
          hasStoppage: /\+/.test(m.minute || ""),
          rawLabel: m.minute,
          fetchedAtMs: now,
          status: m.status,
        };
      }
      for (const key of Object.keys(liveTickers)) {
        if (!liveMatches.some(m => matchKey(m) === key)) delete liveTickers[key];
      }
      liveLoadedOnce = true;
      renderAll();
    }
  } catch (e) {
    console.error("fetchLive error:", e);
  } finally {
    clearTimeout(liveFetchTimer);
    const delay = inProgressMatches(liveMatches).length > 0 ? LIVE_POLL_ACTIVE_MS : LIVE_POLL_IDLE_MS;
    liveFetchTimer = setTimeout(fetchLive, delay);
  }
}

fetchState();
fetchLive();
fetchVisitorGeo();
setInterval(fetchState, 60000);
setInterval(tickTodayStatuses, 1000); // local clock tick, no fetch, no DOM rebuild
setInterval(() => renderLastUpdated(cachedState.last_updated), 30000);

// Browsers throttle or fully suspend setInterval/setTimeout on a
// backgrounded or sleeping tab - left open overnight, the page can sit
// frozen on whatever it last fetched with no timer left to notice. Force
// an immediate refetch the moment the tab is actually looked at again,
// instead of waiting on a timer that may not have run in hours.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  fetchState();
  clearTimeout(liveFetchTimer);
  fetchLive();
});

function refreshNow() {
  const btn = document.getElementById("refresh-btn");
  btn.disabled = true;
  btn.classList.add("spinning");
  clearTimeout(liveFetchTimer);
  Promise.all([fetchState(), fetchLive()]).finally(() => {
    btn.disabled = false;
    btn.classList.remove("spinning");
  });
}
document.getElementById("refresh-btn").addEventListener("click", refreshNow);

// ── GOOGLE ANALYTICS (Consent Mode v2) ───────────────────────────────────────
const GA_MEASUREMENT_ID = "G-BJT7WH328K";
window.dataLayer = window.dataLayer || [];
window.gtag = function () { window.dataLayer.push(arguments); };

// Default: deny cookies until the user explicitly accepts.
// GA still fires in cookieless/modeled mode so the tag validates and
// Google can model aggregate data — but no cookies are set before consent.
window.gtag("consent", "default", {
  analytics_storage: "denied",
  ad_storage: "denied",
  wait_for_update: 500,
});
window.gtag("js", new Date());
window.gtag("config", GA_MEASUREMENT_ID);

const script = document.createElement("script");
script.async = true;
script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
document.head.appendChild(script);

// ── COOKIE CONSENT ────────────────────────────────────────────────────────────
const COOKIE_CONSENT_KEY = "cookieConsent";
if (localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted") {
  window.gtag("consent", "update", { analytics_storage: "granted" });
} else {
  document.getElementById("cookie-banner").style.display = "flex";
}
document.getElementById("cookie-accept-btn").addEventListener("click", () => {
  localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
  document.getElementById("cookie-banner").style.display = "none";
  window.gtag("consent", "update", { analytics_storage: "granted" });
});
