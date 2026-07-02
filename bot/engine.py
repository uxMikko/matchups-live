"""
Standings, third-place ranking, and R32 bracket projection engine.
Runs after every confirmed score change and after every full time.
"""
from __future__ import annotations
import copy
from dataclasses import dataclass
from itertools import combinations, product
from typing import Optional
import annex_c as ac

# ── GROUP COMPOSITIONS ────────────────────────────────────────────────────────
GROUPS: dict[str, list[str]] = {
    "A": ["Mexico", "South Korea", "South Africa", "Czech Republic"],
    "B": ["Canada", "Switzerland", "Qatar", "Bosnia-Herzegovina"],
    "C": ["Brazil", "Morocco", "Haiti", "Scotland"],
    "D": ["USA", "Paraguay", "Australia", "Turkey"],
    "E": ["Germany", "Curacao", "Ivory Coast", "Ecuador"],
    "F": ["Netherlands", "Japan", "Sweden", "Tunisia"],
    "G": ["Belgium", "Egypt", "Iran", "New Zealand"],
    "H": ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
    "I": ["France", "Senegal", "Norway", "Iraq"],
    "J": ["Argentina", "Algeria", "Austria", "Jordan"],
    "K": ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
    "L": ["England", "Croatia", "Ghana", "Panama"],
}

TEAM_TO_GROUP: dict[str, str] = {
    t: g for g, teams in GROUPS.items() for t in teams
}

# ESPN's own resolved within-group rank (1-4), set by the caller via
# scraper.fetch_group_ranks() before compute_state(). Preferred over
# FIFA_RANKINGS below when present, since it reflects the real tiebreak
# outcome rather than an approximation.
OFFICIAL_RANKS: dict[str, int] = {}

# Approximate FIFA rankings — lower = better ranked (last-resort tiebreaker
# fallback when OFFICIAL_RANKS doesn't have an entry, e.g. before any real
# matches have been played yet)
FIFA_RANKINGS: dict[str, int] = {
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
}

FLAG_EMOJIS: dict[str, str] = {
    "Mexico": "🇲🇽", "South Korea": "🇰🇷", "South Africa": "🇿🇦", "Czech Republic": "🇨🇿",
    "Canada": "🇨🇦", "Switzerland": "🇨🇭", "Qatar": "🇶🇦", "Bosnia-Herzegovina": "🇧🇦",
    "Brazil": "🇧🇷", "Morocco": "🇲🇦", "Haiti": "🇭🇹", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    "USA": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Turkey": "🇹🇷",
    "Germany": "🇩🇪", "Curacao": "🇨🇼", "Ivory Coast": "🇨🇮", "Ecuador": "🇪🇨",
    "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
    "Belgium": "🇧🇪", "Egypt": "🇪🇬", "Iran": "🇮🇷", "New Zealand": "🇳🇿",
    "Spain": "🇪🇸", "Cape Verde": "🇨🇻", "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾",
    "France": "🇫🇷", "Senegal": "🇸🇳", "Norway": "🇳🇴", "Iraq": "🇮🇶",
    "Argentina": "🇦🇷", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴",
    "Portugal": "🇵🇹", "DR Congo": "🇨🇩", "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴",
    "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croatia": "🇭🇷", "Ghana": "🇬🇭", "Panama": "🇵🇦",
}

# Fixed R32 bracket slots
FIXED_R32 = [
    {"slot": "R1", "t1": {"group": "A", "pos": 2}, "t2": {"group": "B", "pos": 2}},
    {"slot": "R2", "t1": {"group": "C", "pos": 1}, "t2": {"group": "F", "pos": 2}},
    {"slot": "R3", "t1": {"group": "F", "pos": 1}, "t2": {"group": "C", "pos": 2}},
    {"slot": "R4", "t1": {"group": "H", "pos": 1}, "t2": {"group": "J", "pos": 2}},
    {"slot": "R5", "t1": {"group": "J", "pos": 1}, "t2": {"group": "H", "pos": 2}},
    {"slot": "R6", "t1": {"group": "E", "pos": 2}, "t2": {"group": "I", "pos": 2}},
    {"slot": "R7", "t1": {"group": "K", "pos": 2}, "t2": {"group": "L", "pos": 2}},
    {"slot": "R8", "t1": {"group": "D", "pos": 2}, "t2": {"group": "G", "pos": 2}},
]
THIRD_SLOTS = ["A", "B", "D", "E", "G", "I", "K", "L"]


# ── TEAM RECORD ────────────────────────────────────────────────────────────────
@dataclass
class TeamRecord:
    name: str
    group: str
    played: int = 0
    won: int = 0
    drawn: int = 0
    lost: int = 0
    goals_for: int = 0
    goals_against: int = 0
    yellow_cards: int = 0
    red_cards: int = 0

    @property
    def points(self) -> int:
        return self.won * 3 + self.drawn

    @property
    def goal_diff(self) -> int:
        return self.goals_for - self.goals_against

    @property
    def fair_play(self) -> int:
        return self.yellow_cards + self.red_cards * 3

    def sort_key(self) -> tuple:
        return (
            -self.points,
            -self.goal_diff,
            -self.goals_for,
            self.fair_play,
            OFFICIAL_RANKS.get(self.name) or FIFA_RANKINGS.get(self.name, 999),
        )

    def cross_group_sort_key(self) -> tuple:
        """Like sort_key(), but for comparing teams from *different* groups
        (the third-place race, and the joint qualification simulation).
        OFFICIAL_RANKS is ESPN's within-group rank (1-4) — reused across
        groups it collides constantly (every group has a "2nd"), creating
        false ties between unrelated teams. FIFA_RANKINGS is unique 1-48
        across every team, so it's the only valid tiebreaker here."""
        return (
            -self.points,
            -self.goal_diff,
            -self.goals_for,
            self.fair_play,
            FIFA_RANKINGS.get(self.name, 999),
        )

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "group": self.group,
            "played": self.played,
            "won": self.won,
            "drawn": self.drawn,
            "lost": self.lost,
            "goals_for": self.goals_for,
            "goals_against": self.goals_against,
            "goal_diff": self.goal_diff,
            "points": self.points,
            "yellow_cards": self.yellow_cards,
            "red_cards": self.red_cards,
            "fair_play": self.fair_play,
            "flag": FLAG_EMOJIS.get(self.name, "🏳"),
        }


# ── STANDINGS ─────────────────────────────────────────────────────────────────
def build_group_standings(group: str, results: list[dict]) -> list[TeamRecord]:
    """Standings for a single group, given results filtered/unfiltered (results
    not belonging to this group are ignored). Used directly by forecast.py to
    re-sort many hypothetical result sets cheaply (without touching the other
    11 groups each time)."""
    teams = GROUPS[group]
    records = {t: TeamRecord(name=t, group=group) for t in teams}
    group_results = [r for r in results if r.get("group") == group]

    for r in group_results:
        home, away = r["home"], r["away"]
        if home not in records or away not in records:
            continue
        hs, as_ = r.get("home_score", 0) or 0, r.get("away_score", 0) or 0
        h, a = records[home], records[away]
        h.played += 1; a.played += 1
        h.goals_for += hs; h.goals_against += as_
        a.goals_for += as_; a.goals_against += hs
        h.yellow_cards += r.get("home_yellow", 0)
        a.yellow_cards += r.get("away_yellow", 0)
        h.red_cards += r.get("home_red", 0)
        a.red_cards += r.get("away_red", 0)
        if hs > as_:
            h.won += 1; a.lost += 1
        elif hs == as_:
            h.drawn += 1; a.drawn += 1
        else:
            a.won += 1; h.lost += 1

    return _sort_group(list(records.values()), group_results)


def build_standings(results: list[dict]) -> dict[str, list[TeamRecord]]:
    """
    Build standings from a list of completed results.
    results: [{home, away, group, home_score, away_score}, ...]
    Returns {group: [TeamRecord sorted 1st→4th]}.
    """
    return {g: build_group_standings(g, results) for g in GROUPS}




def _sort_group(records: list[TeamRecord], results: list[dict]) -> list[TeamRecord]:
    basic = sorted(records, key=lambda r: (-r.points, -r.goal_diff, -r.goals_for))
    final = []
    i = 0
    while i < len(basic):
        j = i + 1
        while j < len(basic) and (
            basic[j].points == basic[i].points
            and basic[j].goal_diff == basic[i].goal_diff
            and basic[j].goals_for == basic[i].goals_for
        ):
            j += 1
        tied = basic[i:j]
        if len(tied) > 1:
            tied = _break_h2h(tied, results)
        else:
            tied = sorted(tied, key=lambda r: r.sort_key())
        final.extend(tied)
        i = j
    return final


def _break_h2h(tied: list[TeamRecord], results: list[dict]) -> list[TeamRecord]:
    names = {r.name for r in tied}
    h2h = {r.name: TeamRecord(name=r.name, group=r.group) for r in tied}
    for res in results:
        if res["home"] in names and res["away"] in names:
            hs, as_ = res.get("home_score", 0) or 0, res.get("away_score", 0) or 0
            h, a = h2h[res["home"]], h2h[res["away"]]
            h.played += 1; a.played += 1
            h.goals_for += hs; h.goals_against += as_
            a.goals_for += as_; a.goals_against += hs
            if hs > as_: h.won += 1; a.lost += 1
            elif hs == as_: h.drawn += 1; a.drawn += 1
            else: a.won += 1; h.lost += 1
    return sorted(h2h.values(), key=lambda r: r.sort_key())


# ── THIRD-PLACE RANKING ───────────────────────────────────────────────────────
def rank_thirds(standings: dict[str, list[TeamRecord]]) -> list[tuple[str, TeamRecord]]:
    thirds = [(g, recs[2]) for g, recs in standings.items() if len(recs) >= 3]
    thirds.sort(key=lambda x: x[1].cross_group_sort_key())
    return thirds  # index 0 = best third, index 7 = 8th (last qualifier)


def thirds_race_payload(thirds: list[tuple[str, TeamRecord]], advance_prob: dict | None = None) -> list[dict]:
    """advance_prob is each team's overall P(advance to R32) - the same
    number the group standings table shows - not the narrower P(finish 3rd
    AND qualify via the thirds race). A team like one likely to finish 2nd
    outright would show a misleadingly low number under the narrower
    definition, since most of its real qualification chances come from a
    path this table doesn't track at all; showing the same overall number
    as everywhere else avoids that confusion."""
    advance_prob = advance_prob or {}
    out = []
    for i, (g, rec) in enumerate(thirds):
        d = rec.to_dict()
        d["group"] = g
        d["rank"] = i + 1
        d["qualifies"] = i < 8
        d["cutoff"] = i == 7  # marks the 8th/9th boundary
        d["prob"] = round(advance_prob.get(rec.name, 0.0), 4)
        out.append(d)
    return out


def predicted_thirds_payload(thirds: list[tuple[str, TeamRecord]]) -> list[dict]:
    """Same cross-group ranking as thirds_race_payload(), but for the
    Predicted Outcome tab: name/group/rank/qualifies only, no points/GD/GF
    or probability — see compute_predicted_state's docstring for why this
    tab never exposes projected stats, only ranks."""
    return [
        {"name": rec.name, "flag": FLAG_EMOJIS.get(rec.name, "🏳"), "group": g,
         "rank": i + 1, "qualifies": i < 8}
        for i, (g, rec) in enumerate(thirds)
    ]


# ── R32 BRACKET PROJECTION ────────────────────────────────────────────────────
SEED_LABELS = {1: "1", 2: "2", 3: "3"}

# Real FIFA match numbers (73-88) for each R32 slot, verified against the
# official pairing reported by worldcupwiki.com — cross-checked against our
# own FIXED_R32 + THIRD_SLOTS group/position composition for every slot
# (every pairing matched exactly). Group-stage matches are 1-72, so R32 is
# 73-88, R16 89-96, QF 97-100, SF 101-102, 3rd-place 103, Final 104.
MATCH_NUMBERS: dict[str, int] = {
    "R1": 73, "RE": 74, "R3": 75, "R2": 76, "RI": 77, "R6": 78,
    "RA": 79, "RL": 80, "RD": 81, "RG": 82, "R7": 83, "R4": 84,
    "RB": 85, "R5": 86, "RK": 87, "R8": 88,
}

# Mirrors the JS KNOCKOUT_FEEDERS constant: {match_num: (feeder1, feeder2)}.
# Match 103 (Bronze) is fed by the *losers* of the two SFs (101, 102).
KNOCKOUT_FEEDERS: dict[int, tuple[int, int]] = {
    89: (74, 77), 90: (73, 75), 91: (76, 78), 92: (79, 80),
    93: (83, 84), 94: (81, 82), 95: (86, 88), 96: (85, 87),
    97: (89, 90), 98: (93, 94), 99: (91, 92), 100: (95, 96),
    101: (97, 98), 102: (99, 100),
    103: (101, 102),  # Bronze Final — fed by losers of 101/102
    104: (101, 102),  # Final — fed by winners of 101/102
}

# Mirrors the JS KNOCKOUT_KICKOFFS constant (UTC ISO strings).
KNOCKOUT_KICKOFFS: dict[int, str] = {
    89: "2026-07-04T21:00Z", 90: "2026-07-04T17:00Z",
    91: "2026-07-05T20:00Z", 92: "2026-07-06T00:00Z",
    93: "2026-07-06T19:00Z", 94: "2026-07-07T00:00Z",
    95: "2026-07-07T16:00Z", 96: "2026-07-07T20:00Z",
    97: "2026-07-09T20:00Z", 98: "2026-07-10T19:00Z",
    99: "2026-07-11T21:00Z", 100: "2026-07-12T01:00Z",
    101: "2026-07-14T19:00Z", 102: "2026-07-15T19:00Z",
    103: "2026-07-18T21:00Z", 104: "2026-07-19T19:00Z",
}

# Display order (top to bottom) for the bracket tree — NOT the same as
# sorting by match_number. A tree needs each vertically-adjacent pair of R32
# rows to be the two matches whose winners actually meet in the R16, and
# each adjacent pair of *those* pairs to feed the same QF, and so on — same
# idea as MATCH_NUMBERS, derived from FIFA's match schedule PDF (which match
# numbers meet in which later match, e.g. winners of 74 and 77 meet in 89):
#   R16: 89=(74,77) 90=(73,75) 93=(83,84) 94=(81,82) 91=(76,78) 92=(79,80) 95=(86,88) 96=(85,87)
#   QF:  97=(89,90) 98=(93,94) 99=(91,92) 100=(95,96)
#   SF:  101=(97,98) 102=(99,100)
# Walking that tree from the final down to R32 gives this row order.
BRACKET_TREE_ORDER = ["RE", "RI", "R1", "R3", "R7", "R4", "RD", "RG",
                       "R2", "R6", "RA", "RL", "R5", "R8", "RB", "RK"]


def project_bracket(
    standings: dict[str, list[TeamRecord]],
    pos_probs: dict | None = None,
    r32_kickoffs: dict | None = None,
    advance_prob: dict | None = None,
) -> list[dict]:
    """Project all 16 R32 matches from current standings."""
    pos_probs = pos_probs or {}
    r32_kickoffs = r32_kickoffs or {}
    advance_prob = advance_prob or {}
    thirds = rank_thirds(standings)
    qualifying_8 = {g for g, _ in thirds[:8]}
    annex = ac.lookup(qualifying_8)  # {slot: source_group}
    third_by_group = {g: rec for g, rec in thirds}

    matches = []

    # Fixed: runner vs runner-up
    for slot_def in FIXED_R32:
        g1, p1 = slot_def["t1"]["group"], slot_def["t1"]["pos"]
        g2, p2 = slot_def["t2"]["group"], slot_def["t2"]["pos"]
        t1 = _get_team(standings, g1, p1)
        t2 = _get_team(standings, g2, p2)
        home = _team_entry(t1, g1, p1, pos_probs)
        away = _team_entry(t2, g2, p2, pos_probs)
        matches.append({
            "slot": slot_def["slot"],
            "match_number": MATCH_NUMBERS[slot_def["slot"]],
            "kickoff": r32_kickoffs.get(slot_def["slot"]),
            "home": home,
            "away": away,
            "type": "runner_v_runner" if p1 == 2 and p2 == 2 else "winner_v_runner",
        })

    # Annex C: winner vs 3rd-place
    for slot_letter in THIRD_SLOTS:
        src_group = annex.get(slot_letter)
        winner = _get_team(standings, slot_letter, 1)
        third = third_by_group.get(src_group) if src_group else None
        home = _team_entry(winner, slot_letter, 1, pos_probs)
        away = _third_entry(third, src_group, advance_prob) if third else {"label": f"3rd Grp {src_group or '?'}", "team": None, "prob": 0}
        slot = f"R{slot_letter}"
        matches.append({
            "slot": slot,
            "match_number": MATCH_NUMBERS[slot],
            "kickoff": r32_kickoffs.get(slot),
            "home": home,
            "away": away,
            "type": "winner_v_third",
        })

    matches.sort(key=lambda m: BRACKET_TREE_ORDER.index(m["slot"]))
    return matches


def project_full_knockout_bracket(
    r32_bracket: list[dict],
    ko_results: dict | None = None,
    predict_unknown: bool = True,
) -> list[dict]:
    """Extend the 16-entry R32 bracket through R16, QF, SF, Bronze, and Final.

    ko_results: {"|".join(sorted([home, away])): {home, away, home_score,
    away_score, status}} — keyed by sorted team pair.

    predict_unknown=True  (predicted tab): use odds/Elo when no actual result.
    predict_unknown=False (actual tab): only advance teams from confirmed "ft"
    results — unresolved matches are omitted entirely so the frontend renders
    them as TBD placeholders."""
    import forecast

    ko_results = ko_results or {}
    by_num: dict[int, dict] = {m["match_number"]: m for m in r32_bracket}

    # Patch R32 entries with actual results so the frontend can read
    # score/status/pen data from the bracket rather than relying on the
    # live endpoint (which stops returning historical matches after ~24h).
    for entry in r32_bracket:
        ht = (entry.get("home") or {}).get("team")
        at = (entry.get("away") or {}).get("team")
        if not ht or not at:
            continue
        actual = ko_results.get("|".join(sorted([ht, at])), {})
        if actual.get("status") == "ft":
            # Flip scores if ESPN had them home/away-swapped vs bracket order
            if actual.get("home") == ht:
                entry["home_score"] = actual["home_score"]
                entry["away_score"] = actual["away_score"]
            else:
                entry["home_score"] = actual["away_score"]
                entry["away_score"] = actual["home_score"]
            entry["status"] = "ft"
            entry["decided_by_pen"] = actual.get("decided_by_pen", False)
            entry["pen_home"] = actual.get("pen_home")
            entry["pen_away"] = actual.get("pen_away")
            entry["winner"] = actual.get("winner")

    def _winner(num: int, want_loser: bool = False) -> tuple[Optional[str], Optional[str]]:
        m = by_num.get(num)
        if not m:
            return None, None
        home_t = (m["home"] or {}).get("team")
        away_t = (m["away"] or {}).get("team")
        home_f = (m["home"] or {}).get("flag", "🏳")
        away_f = (m["away"] or {}).get("flag", "🏳")
        if not home_t or not away_t:
            return None, None

        pair_key = "|".join(sorted([home_t, away_t]))
        actual = ko_results.get(pair_key, {})
        if actual.get("status") == "ft":
            # Use explicit winner field (handles penalties where scores are tied)
            w = actual.get("winner")
            if w:
                home_wins = (w == home_t)
            else:
                hs, as_ = actual["home_score"], actual["away_score"]
                if actual.get("home") == home_t:
                    home_wins = hs > as_
                else:
                    home_wins = as_ > hs
            if home_wins:
                return (away_t, away_f) if want_loser else (home_t, home_f)
            return (home_t, home_f) if want_loser else (away_t, away_f)

        if not predict_unknown:
            return None, None

        # Predict via outright odds only — never Elo (see forecast.knockout_advance_prob)
        p_home, p_away = forecast.knockout_advance_prob(home_t, away_t)
        if p_home >= p_away:
            return (away_t, away_f) if want_loser else (home_t, home_f)
        return (home_t, home_f) if want_loser else (away_t, away_f)

    later: list[dict] = []
    for num in sorted(KNOCKOUT_FEEDERS):
        f1, f2 = KNOCKOUT_FEEDERS[num]
        want_loser = (num == 103)
        t1, fl1 = _winner(f1, want_loser)
        t2, fl2 = _winner(f2, want_loser)
        if not t1 and not t2:
            continue  # neither feeder resolved — nothing to show yet
        prefix = "L" if want_loser else "W"
        entry: dict = {
            "match_number": num,
            "kickoff": KNOCKOUT_KICKOFFS.get(num),
            "home": {"team": t1, "flag": fl1} if t1 else {"team": None, "label": f"{prefix}{f1}"},
            "away": {"team": t2, "flag": fl2} if t2 else {"team": None, "label": f"{prefix}{f2}"},
        }
        if t1 and t2:
            pair_key = "|".join(sorted([t1, t2]))
            actual = ko_results.get(pair_key, {})
            if actual.get("status") == "ft":
                if actual.get("home") == t1:
                    entry["home_score"] = actual["home_score"]
                    entry["away_score"] = actual["away_score"]
                else:
                    entry["home_score"] = actual["away_score"]
                    entry["away_score"] = actual["home_score"]
                entry["status"] = "ft"
        by_num[num] = entry
        later.append(entry)

    return r32_bracket + later


def _get_team(standings: dict, group: str, pos: int) -> Optional[TeamRecord]:
    recs = standings.get(group, [])
    return recs[pos - 1] if len(recs) >= pos else None


def _team_entry(rec: Optional[TeamRecord], group: str, pos: int, pos_probs: dict) -> dict:
    pos_labels = {1: "1st", 2: "2nd", 3: "3rd"}
    if rec:
        prob = pos_probs.get(group, {}).get(rec.name, {}).get(pos, 0.0)
        return {
            "team": rec.name,
            "flag": FLAG_EMOJIS.get(rec.name, "🏳"),
            "label": f"{pos_labels.get(pos,'?')} Group {group}",
            "seed": f"{SEED_LABELS.get(pos, pos)}{group}",
            "played": rec.played,
            "group": group,
            "pos": pos,
            "prob": round(prob, 4),
        }
    return {"team": None, "flag": "🏳", "label": f"{pos_labels.get(pos,'?')} Grp {group} TBD",
            "seed": f"{SEED_LABELS.get(pos, pos)}{group}", "prob": 0}


def _third_entry(rec: Optional[TeamRecord], src_group: Optional[str], advance_prob: dict) -> dict:
    if not rec or not src_group:
        return {"team": None, "flag": "🏳", "label": "3rd TBD", "seed": "3?", "prob": 0}
    # Shown prob is the team's overall P(advance to R32) - same number the
    # standings table and the third-place race table both show - not the
    # narrower P(finish 3rd in own group AND qualify via the thirds race).
    # A team whose realistic path is finishing 1st/2nd outright would show
    # a misleadingly low number under that narrower definition.
    prob = advance_prob.get(rec.name, 0.0)
    return {
        "team": rec.name,
        "flag": FLAG_EMOJIS.get(rec.name, "🏳"),
        "label": f"3rd Group {src_group}",
        "seed": f"3{src_group}",
        "played": rec.played,
        "group": src_group,
        "pos": 3,
        "prob": round(prob, 4),
    }


# ── FULL STATE COMPUTATION ────────────────────────────────────────────────────
def compute_state(
    results: list[dict],
    matches: list[dict] | None = None,
    r32_kickoffs: dict | None = None,
    ko_results: dict | None = None,
) -> dict:
    standings = build_standings(results)
    thirds = rank_thirds(standings)

    pos_probs = {}
    thirds_qualify = {}
    if matches:
        import forecast
        pos_probs = forecast.compute_all_probabilities(results, matches)
        thirds_qualify = forecast.thirds_qualification_probabilities(results, matches)

    # "Prob" everywhere a team is shown now means P(advance to R32) — not
    # P(finish in this exact position) — since 1st/2nd always advance and
    # 3rd only advances if it also wins the cross-group third-place race.
    # Computed once here so the standings table, the third-place race
    # table, and the R32 bracket's third-place slots all show the exact
    # same number for a given team, instead of each computing their own
    # narrower slice of it.
    advance_prob: dict[str, float] = {}
    for g, recs in standings.items():
        team_probs = pos_probs.get(g, {})
        for r in recs:
            p = team_probs.get(r.name, {})
            advance_prob[r.name] = p.get(1, 0.0) + p.get(2, 0.0) + thirds_qualify.get(r.name, 0.0)

    bracket = project_bracket(standings, pos_probs, r32_kickoffs, advance_prob)
    bracket = project_full_knockout_bracket(bracket, ko_results, predict_unknown=False)

    standings_payload = {}
    for g, recs in standings.items():
        rows = []
        for r in recs:
            d = r.to_dict()
            d["prob"] = round(advance_prob.get(r.name, 0.0), 4)
            rows.append(d)
        standings_payload[g] = rows

    return {
        "standings": standings_payload,
        "bracket": bracket,
        "thirds_race": thirds_race_payload(thirds, advance_prob),
    }


def compute_predicted_state(
    results: list[dict],
    matches: list[dict],
    r32_kickoffs: dict | None = None,
    ko_results: dict | None = None,
) -> dict:
    """The "Predicted Outcome" tab: every group resolved to its single most
    probable real final standing (see forecast.predicted_final_standings /
    _most_likely_group_scenario — every possible H/D/A combination for the
    remaining fixtures, weighted by real probability and aggregated by the
    resulting order), producing one deterministic group order and the
    resulting R32 matchups — then extended through R16/QF/SF/Bronze/Final
    using bookmaker odds (falling back to Elo) to pick the most likely
    winner of each subsequent match."""
    import forecast
    predicted_standings = forecast.predicted_final_standings(results, matches)
    bracket = project_bracket(predicted_standings, r32_kickoffs=r32_kickoffs)
    bracket = project_full_knockout_bracket(bracket, ko_results)
    standings_payload = {
        g: [
            {"name": r.name, "flag": FLAG_EMOJIS.get(r.name, "🏳"), "position": i + 1}
            for i, r in enumerate(recs)
        ]
        for g, recs in predicted_standings.items()
    }
    thirds = rank_thirds(predicted_standings)
    return {
        "standings": standings_payload,
        "bracket": bracket,
        "thirds_race": predicted_thirds_payload(thirds),
    }
