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
            "flag": FLAG_EMOJIS.get(self.name, "🏳"),
        }


@dataclass
class PredictedTeamRecord(TeamRecord):
    """A team's *predicted final* points total — current actual points plus
    expected points (P(win)*3 + P(draw)*1) summed across remaining
    fixtures — used for the "Predicted Outcome" tab. played/won/drawn/lost/
    goals_for/goals_against stay at their real, current (not projected)
    values: forecast.predicted_final_standings() only aggregates remaining-
    fixture win/draw/loss probabilities into a points total, it doesn't
    invent goals, so goal_diff/goals_for can't be projected the same way —
    they're used as-is for tiebreaking until a real scoreline model exists."""
    predicted_points: float = 0.0

    @property
    def points(self) -> float:
        return self.predicted_points


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


def thirds_race_payload(thirds: list[tuple[str, TeamRecord]], thirds_qualify: dict | None = None) -> list[dict]:
    thirds_qualify = thirds_qualify or {}
    out = []
    for i, (g, rec) in enumerate(thirds):
        d = rec.to_dict()
        d["group"] = g
        d["rank"] = i + 1
        d["qualifies"] = i < 8
        d["cutoff"] = i == 7  # marks the 8th/9th boundary
        d["prob"] = round(thirds_qualify.get(rec.name, 0.0), 4)
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

R16_NUMBERS = [89, 90, 93, 94, 91, 92, 95, 96]
QF_NUMBERS = [97, 98, 99, 100]
SF_NUMBERS = [101, 102]
FINAL_NUMBER = 104
BRONZE_NUMBER = 103


def _feeder_pairs(slot_order: list, numbers: list[int]) -> dict[frozenset, int]:
    """slot_order's i-th adjacent pair (2i, 2i+1) feeds numbers[i] - same
    tree-walk relationship BRACKET_TREE_ORDER/R16_NUMBERS/etc. already
    encode, just indexed by frozenset so a caller holding two match numbers
    (in either order) can look up what they feed into."""
    return {
        frozenset({slot_order[2 * i], slot_order[2 * i + 1]}): numbers[i]
        for i in range(len(numbers))
    }


# Used by scraper.fetch_later_kickoffs() to identify which real match number
# ESPN's placeholder R16-Final fixtures are, from the pair of earlier-round
# match numbers ESPN names them by (e.g. "Round of 32 3 Winner at Round of
# 32 1 Winner" feeds the R16 match between match 75 and match 73 - look that
# pair up here to get its own real match number, 90).
R32_FEEDER_TO_R16 = _feeder_pairs([MATCH_NUMBERS[s] for s in BRACKET_TREE_ORDER], R16_NUMBERS)
R16_FEEDER_TO_QF = _feeder_pairs(R16_NUMBERS, QF_NUMBERS)
QF_FEEDER_TO_SF = _feeder_pairs(QF_NUMBERS, SF_NUMBERS)


def project_bracket(
    standings: dict[str, list[TeamRecord]],
    pos_probs: dict | None = None,
    r32_kickoffs: dict | None = None,
    thirds_qualify: dict | None = None,
) -> list[dict]:
    """Project all 16 R32 matches from current standings."""
    pos_probs = pos_probs or {}
    r32_kickoffs = r32_kickoffs or {}
    thirds_qualify = thirds_qualify or {}
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
        away = _third_entry(third, src_group, thirds_qualify) if third else {"label": f"3rd Grp {src_group or '?'}", "team": None, "prob": 0}
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


def _third_entry(rec: Optional[TeamRecord], src_group: Optional[str], thirds_qualify: dict) -> dict:
    if not rec or not src_group:
        return {"team": None, "flag": "🏳", "label": "3rd TBD", "seed": "3?", "prob": 0}
    # Shown prob is P(this team qualifies as a top-8 third) - the same
    # number as the third-place race table. It does NOT account for which of
    # the 8 third-place R32 slots Annex C specifically routes them to; that
    # would need marginalizing Annex C's routing over every combination of
    # which 8 groups produce the top-8 thirds, which isn't computed here.
    qualify_prob = thirds_qualify.get(rec.name, 0.0)
    return {
        "team": rec.name,
        "flag": FLAG_EMOJIS.get(rec.name, "🏳"),
        "label": f"3rd Group {src_group}",
        "seed": f"3{src_group}",
        "played": rec.played,
        "group": src_group,
        "pos": 3,
        "prob": round(qualify_prob, 4),
    }


# ── R16-FINAL PROJECTION (predicted tab only) ─────────────────────────────────
# R16_NUMBERS/QF_NUMBERS/SF_NUMBERS/FINAL_NUMBER/BRONZE_NUMBER are defined
# above, alongside BRACKET_TREE_ORDER, since R32_FEEDER_TO_R16 etc. need them
# too. R16_NUMBERS[i] is fed by R32 matches 2i and 2i+1 of
# project_bracket()'s output, QF_NUMBERS[i] by R16 matches 2i/2i+1, etc.

_TBD_ENTRY = {"team": None, "flag": "🏳", "label": "TBD", "seed": "?", "prob": 0}


def _advance_entry(team_entry: dict, win_prob: float) -> dict:
    """Carries a team's identity into the next round, with prob replaced
    by P(winning this specific match) - locally meaningful the same way
    R32's prob (P(advance to R32)) is, just one round at a time."""
    if not team_entry.get("team"):
        return _TBD_ENTRY
    return {**team_entry, "prob": round(win_prob, 4)}


def _project_one(home_entry: dict, away_entry: dict, match_number: int, kickoff: str | None) -> dict:
    if not home_entry.get("team") or not away_entry.get("team"):
        return {
            "match_number": match_number,
            "kickoff": kickoff,
            "home": home_entry if home_entry.get("team") else _TBD_ENTRY,
            "away": away_entry if away_entry.get("team") else _TBD_ENTRY,
            "winner": None, "loser": None,
        }
    import forecast
    p_home = forecast.knockout_win_prob(home_entry["team"], away_entry["team"])
    home_out = _advance_entry(home_entry, p_home)
    away_out = _advance_entry(away_entry, 1 - p_home)
    winner, loser = (home_out, away_out) if p_home >= 0.5 else (away_out, home_out)
    return {"match_number": match_number, "kickoff": kickoff, "home": home_out, "away": away_out, "winner": winner, "loser": loser}


def project_knockout_rounds(r32_matches: list[dict], later_kickoffs: dict | None = None) -> list[dict]:
    """Given the 16 R32 matches (project_bracket()'s output, already in
    bracket-tree order), projects a single most-likely winner forward
    through R16, QF, SF, the Final, and the Bronze final - same odds/Elo
    model as everywhere else (forecast.knockout_win_prob), continuously
    recomputed every refresh rather than gated on anything, matching how
    groups/R32 are already always fully populated on the predicted tab.
    Returns a flat list of match dicts (each {match_number, home, away}),
    32 entries total across all 5 of these rounds. later_kickoffs ({match
    number: kickoff iso}, from scraper.fetch_later_kickoffs()) attaches the
    real scheduled date/time to each - that's fixed per match number
    regardless of which teams end up playing it, same as R32's."""
    later_kickoffs = later_kickoffs or {}
    # R32 entries' own "prob" is P(advance to R32), not a head-to-head
    # comparison, so each match's favored side is re-derived from scratch.
    current = []
    for m in r32_matches:
        h, a = m["home"], m["away"]
        if not h.get("team") or not a.get("team"):
            current.append(h if h.get("team") else a)
            continue
        import forecast
        p_home = forecast.knockout_win_prob(h["team"], a["team"])
        current.append(h if p_home >= 0.5 else a)

    out = []
    sf_losers = []
    for round_numbers in (R16_NUMBERS, QF_NUMBERS, SF_NUMBERS):
        next_round = []
        for i, number in enumerate(round_numbers):
            match = _project_one(current[2 * i], current[2 * i + 1], number, later_kickoffs.get(number))
            out.append(match)
            next_round.append(match["winner"] or _TBD_ENTRY)
            if round_numbers is SF_NUMBERS:
                sf_losers.append(match["loser"] or _TBD_ENTRY)
        current = next_round

    final = _project_one(current[0], current[1], FINAL_NUMBER, later_kickoffs.get(FINAL_NUMBER))
    out.append(final)
    bronze = (
        _project_one(sf_losers[0], sf_losers[1], BRONZE_NUMBER, later_kickoffs.get(BRONZE_NUMBER))
        if len(sf_losers) == 2 else None
    )
    if bronze:
        out.append(bronze)
    return out


# ── FULL STATE COMPUTATION ────────────────────────────────────────────────────
def compute_state(
    results: list[dict],
    matches: list[dict] | None = None,
    r32_kickoffs: dict | None = None,
) -> dict:
    standings = build_standings(results)
    thirds = rank_thirds(standings)

    pos_probs = {}
    thirds_qualify = {}
    if matches:
        import forecast
        pos_probs = forecast.compute_all_probabilities(results, matches)
        thirds_qualify = forecast.thirds_qualification_probabilities(results, matches)

    bracket = project_bracket(standings, pos_probs, r32_kickoffs, thirds_qualify)

    # "Prob" everywhere a team is shown now means P(advance to R32) — not
    # P(finish in this exact position) — since 1st/2nd always advance and
    # 3rd only advances if it also wins the cross-group third-place race.
    standings_payload = {}
    for g, recs in standings.items():
        team_probs = pos_probs.get(g, {})
        rows = []
        for r in recs:
            d = r.to_dict()
            p = team_probs.get(r.name, {})
            advance_prob = p.get(1, 0.0) + p.get(2, 0.0) + thirds_qualify.get(r.name, 0.0)
            d["prob"] = round(advance_prob, 4)
            rows.append(d)
        standings_payload[g] = rows

    return {
        "standings": standings_payload,
        "bracket": bracket,
        "thirds_race": thirds_race_payload(thirds, thirds_qualify),
    }


def compute_predicted_state(
    results: list[dict],
    matches: list[dict],
    r32_kickoffs: dict | None = None,
    later_kickoffs: dict | None = None,
) -> dict:
    """The "Predicted Outcome" tab: every team ranked by its expected final
    points (see forecast.predicted_final_standings — P(win)*3 + P(draw)*1
    per remaining fixture, added to current actual points), producing one
    single deterministic group order and the resulting R32 matchups — same
    bracket shape/rendering as compute_state(), just fed a different
    (projected) dataset.

    The standings payload here intentionally exposes only name + predicted
    position, not points/GD/GF — expected points is a real, sound ranking
    signal (it's literally the average outcome over every possible way the
    remaining games could go), but it isn't a result anyone could actually
    finish with (e.g. 7.3 points), so showing it as a fake stat line would
    overstate precision the model doesn't have. This is also why this isn't
    instead settled as a single win/draw/loss per fixture: that approach
    all-but-eliminates draws (real bookmaker odds put draw as the single
    most likely outcome in only ~3% of fixtures, vs. a real-world ~25% draw
    rate), which would bias every projected group order toward decisive
    results that don't reflect how often groups actually get separated by
    a draw.

    Unlike the group stage, R32-and-later matches genuinely can't end in a
    draw, so project_knockout_rounds() projects those rounds with a single
    most-likely winner per match (forecast.knockout_win_prob) rather than
    expected points - there's no "expected points" notion for a knockout
    match. bracket therefore ends up with all 32 R32-through-Bronze-Final
    matches, continuously recomputed every refresh the same way the rest of
    this tab already is, not gated on real odds existing for a given match
    (Elo is always available as a fallback)."""
    import forecast
    predicted_standings = forecast.predicted_final_standings(results, matches)
    bracket = project_bracket(predicted_standings, r32_kickoffs=r32_kickoffs)
    bracket = bracket + project_knockout_rounds(bracket, later_kickoffs=later_kickoffs)
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
