# matchups.live — Invariant Rules for Claude

This file is loaded automatically at the start of every session. These rules are **non-negotiable** and must never be violated, even when focused on an unrelated change.

---

## DO NOT DEPLOY

Never run `git push`, `netlify deploy`, or any command that sends changes to production. All work is local. The local dev server runs at `http://127.0.0.1:8943/`.

---

## Probability Sources — Strict Priority Order

**Rule: Only one probability source per card. Never mix sources on the same fixture.**

For knockout match projections (Odds-Based Projection tab, Live Standings pills, matchup info modal):

1. **Match h2h odds** from `real_odds` — only if `p_draw < 0.01` (confirms it's a genuine 2-way knockout market, not a leaked group-stage 3-way entry). These are stored by `odds_api.py` as "to advance" probability (draw absorbed 50/50 into home/away).
2. **Tournament outright ratio** from `tournament_probs` — `p_A / (p_A + p_B)` when match h2h isn't available.
3. **Nothing** — if neither source exists, show no percentage. Do not fall back to ELO.

**ELO is banned from all user-facing projection display.** ELO only exists inside the Lab's internal scenario simulation engine (`labEloRatings`), which is separate. It must never appear in the Live Standings bracket, the Odds-Based Projection bracket, or any matchup modal.

---

## Real Odds Cache (`real_odds`) — Usage Rules

- **Group-stage entries have `p_draw > 0`** (3-way h2h). These must never be used for knockout projection regardless of team confirmation status.
- **Valid knockout entries have `p_draw = 0`** (stored as "to advance" by `odds_api.py`'s conversion). Only these pass the `< 0.01` threshold.
- **Key format**: `sorted("TeamA|TeamB")` — same key can collide between group-stage and knockout contexts. The `p_draw` check is the only discriminator.
- **Never use a `real_odds` entry for a projected later-round fixture unless both teams are in `confirmedWinners`** (i.e., both have actually won a preceding knockout match with status "ft"). Bookmakers publish speculative fixtures before teams qualify; `requireBothConfirmed: true` gates this.

---

## Scores Always Come from ESPN Live Data

- Scores shown on any card must come from `allKnockoutMatches` (built from `cachedState.bracket` + `knockoutLiveData` via `live.js`).
- Never display a score from a stale Redis cache entry or from a predicted/simulated value.
- Group-stage scores come from `allMatches` (scraped via ESPN by `refresh.py`).

---

## Lab / Simulator — Concluded Matches Are Read-Only

- Any knockout match with `status === "ft"` and a `winner` in `allKnockoutMatches` is **concluded**. Clicking it in the Lab must not open an edit modal.
- `openLabLaterModal(matchNumber)` must bail immediately if the match is concluded.
- Concluded lab cards get `class="lab-concluded"` (cursor: default, no hover highlight).
- The Lab uses ESPN's actual scores unconditionally — user overrides for concluded matches are ignored by `labProjectOneMatch`.
- Group-stage matches with `status === "ft"` in `allMatches` are also read-only in the Lab's fixture editor (`renderLabFixtureRow` shows them as non-interactive "completed" rows).

---

## Odds API Integration

- **Sport key for h2h match odds**: `soccer_fifa_world_cup` with `markets=h2h`.
- **Sport key for tournament outright winner**: `soccer_fifa_world_cup_winner` with `markets=outrights`. The main sport endpoint (`soccer_fifa_world_cup`) returns 422 for outrights.
- **`draw_no_bet`, `to_qualify`, `winner` markets**: Not supported by The Odds API for this sport. Don't try them again.
- `fetch_odds()` in `odds_api.py` converts 3-way h2h to "to advance" by setting `p_home = avg_p_home + avg_p_draw/2`, `p_draw = 0`. This is the contract every consumer relies on.
- Credits reset on the 1st of each month. `odds:credits_remaining` in Redis holds the last-known value and goes stale across the reset.
- `odds:last_schedule_date` must be updated after every successful schedule-triggered fetch. If it's stuck (same date for multiple days), the API call is silently failing — check `ODDS_API_KEY` in GitHub Secrets.
- **`ODDS_API_KEY` in GitHub Secrets must match the local `.env`** — these can drift. When they drift, the schedule trigger silently skips all calls.

---

## Bracket Display

- `bracketTieCard` is for Live Standings (real bracket). `resultCard` is for Odds-Based Projection and Lab.
- Probability pills in `bracketTieCard` are suppressed when `probPct === 100` (confirmed team, certain to be there). For upcoming matches, probability comes from the odds priority order above.
- Penalty shootout results: always show `AET · PEN home–away` on the card when `decided_by_pen === true` and scores are available. Never drop this information.
- The `showOddsBadge` on `resultCard` must be `false` for projected fixtures where teams aren't both confirmed (`slotConfirmed`).

---

## Data Flow — What Updates What

```
ESPN API → live.js (Netlify function, real-time) → knockoutLiveData in frontend
ESPN API → refresh.py (cron, every ~1 min) → Redis → state.js → cachedState in frontend
The Odds API → odds_state.py (inside refresh.py, once/day + triggers) → Redis odds:matchups / odds:tournament_probs
```

- `live.js` is the source of truth for live scores, knockout match status, and penalty results.
- `refresh.py` / Redis is the source of truth for bracket seeding, standings, predicted bracket, and odds.
- Never use Redis-cached data for live in-play information.

---

## Naming / Key Conventions

- Internal team names are set in `engine.py`'s 48-team list. When ESPN or The Odds API uses a different name, fix it in `NAME_FROM_ESPN` (live.js / scraper.py) or `ODDS_API_NAME_FIXUP` (odds_api.py). Never scatter name fixups elsewhere.
- `real_odds` keys: `sorted("TeamA|TeamB")` using **internal** team names (after normalization).
- `tournament_probs` keys: internal team names.
- Match numbers: FIFA's official match numbering from the published schedule PDF. Group stage: 1–72. R32: 73–88. R16: 89–96. QF: 97–100. SF: 101–102. Bronze: 103. Final: 104.

---

## What the Three Tabs Show

| Tab | Bracket Source | Probability Source | Scores Source |
|---|---|---|---|
| Live Standings | `cachedState.bracket` (real, engine-computed) | h2h odds → outright ratio → nothing | `allKnockoutMatches` (live.js) |
| Odds-Based Projection | `cachedState.predicted_bracket` (engine-predicted) | h2h odds → outright ratio → nothing | `allKnockoutMatches` (live.js) |
| Lab | User-driven simulation | Lab's own ELO engine (internal only, not displayed as "projection") | `allKnockoutMatches` overrides user picks for concluded matches |

---

## Things That Have Been Broken Before — Do Not Repeat

1. **Showing ELO in the bracket when no real odds exist.** Fixed multiple times. The answer is always: show nothing, not ELO.
2. **Group-stage `real_odds` entries leaking into knockout projection cards** via team-pair key collision. Fixed by the `p_draw < 0.01` guard. Do not remove or weaken this guard.
3. **Concluded knockout matches being editable in the Lab.** Fixed by bailing in `openLabLaterModal` when `status === "ft" && winner`. Do not open the modal for concluded matches under any circumstance.
4. **Using speculative future-market h2h odds for projected later-round fixtures.** Fixed by `requireBothConfirmed`. Do not show h2h odds for a projected R16+ fixture unless both teams have actually won their preceding match.
5. **`odds_api.py` calling `min()` on an empty list when group stage is over.** Fixed with `if upcoming:` guard before the `min(kickoffs)` call.
6. **`fetch_outrights()` using the wrong API endpoint.** The correct sport key is `soccer_fifa_world_cup_winner`, not `soccer_fifa_world_cup`. The latter returns 422 for outrights.
7. **Lab showing projected scores instead of actual scores for concluded R16+ matches.** Fixed by checking `allKnockoutMatches` for actual scores before falling back to predicted/pick values in `renderLaterSlot` and `labCardOnly`.
