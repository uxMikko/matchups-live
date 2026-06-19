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


# ── STANDINGS ─────────────────────────────────────────────────────────────────
def build_standings(results: list[dict]) -> dict[str, list[TeamRecord]]:
    """
    Build standings from a list of completed results.
    results: [{home, away, group, home_score, away_score}, ...]
    Returns {group: [TeamRecord sorted 1st→4th]}.
    """
    records: dict[str, dict[str, TeamRecord]] = {
        g: {t: TeamRecord(name=t, group=g) for t in teams}
        for g, teams in GROUPS.items()
    }
    group_results: dict[str, list[dict]] = {g: [] for g in GROUPS}

    for r in results:
        g = r["group"]
        home, away = r["home"], r["away"]
        hs, as_ = r.get("home_score", 0) or 0, r.get("away_score", 0) or 0
        if g not in records or home not in records[g] or away not in records[g]:
            continue
        h, a = records[g][home], records[g][away]
        h.played += 1; a.played += 1
        h.goals_for += hs; h.goals_against += as_
        a.goals_for += as_; a.goals_against += hs
        if hs > as_:
            h.won += 1; a.lost += 1
        elif hs == as_:
            h.drawn += 1; a.drawn += 1
        else:
            a.won += 1; h.lost += 1
        group_results[g].append(r)

    standings = {}
    for g, team_map in records.items():
        sorted_teams = _sort_group(list(team_map.values()), group_results[g])
        standings[g] = sorted_teams
    return standings


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
    thirds.sort(key=lambda x: x[1].sort_key())
    return thirds  # index 0 = best third, index 7 = 8th (last qualifier)


def thirds_race_payload(thirds: list[tuple[str, TeamRecord]]) -> list[dict]:
    out = []
    for i, (g, rec) in enumerate(thirds):
        d = rec.to_dict()
        d["group"] = g
        d["rank"] = i + 1
        d["qualifies"] = i < 8
        d["cutoff"] = i == 7  # marks the 8th/9th boundary
        out.append(d)
    return out


# ── R32 BRACKET PROJECTION ────────────────────────────────────────────────────
def project_bracket(standings: dict[str, list[TeamRecord]]) -> list[dict]:
    """Project all 16 R32 matches from current standings."""
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
        matches.append({
            "slot": slot_def["slot"],
            "home": _team_entry(t1, g1, p1),
            "away": _team_entry(t2, g2, p2),
            "type": "runner_v_runner" if p1 == 2 and p2 == 2 else "winner_v_runner",
        })

    # Annex C: winner vs 3rd-place
    for slot_letter in THIRD_SLOTS:
        src_group = annex.get(slot_letter)
        winner = _get_team(standings, slot_letter, 1)
        third = third_by_group.get(src_group) if src_group else None
        matches.append({
            "slot": f"R{slot_letter}",
            "home": _team_entry(winner, slot_letter, 1),
            "away": _team_entry(third, src_group, 3) if third else {"label": f"3rd Grp {src_group or '?'}", "team": None},
            "type": "winner_v_third",
        })

    return matches


def _get_team(standings: dict, group: str, pos: int) -> Optional[TeamRecord]:
    recs = standings.get(group, [])
    return recs[pos - 1] if len(recs) >= pos else None


def _team_entry(rec: Optional[TeamRecord], group: str, pos: int) -> dict:
    pos_labels = {1: "1st", 2: "2nd", 3: "3rd"}
    if rec:
        return {
            "team": rec.name,
            "flag": FLAG_EMOJIS.get(rec.name, "🏳"),
            "label": f"{pos_labels.get(pos,'?')} Group {group}",
            "played": rec.played,
            "group": group,
            "pos": pos,
        }
    return {"team": None, "flag": "🏳", "label": f"{pos_labels.get(pos,'?')} Grp {group} TBD"}


# ── FULL STATE COMPUTATION ────────────────────────────────────────────────────
def compute_state(results: list[dict]) -> dict:
    standings = build_standings(results)
    thirds = rank_thirds(standings)
    bracket = project_bracket(standings)
    return {
        "standings": {
            g: [r.to_dict() for r in recs]
            for g, recs in standings.items()
        },
        "bracket": bracket,
        "thirds_race": thirds_race_payload(thirds),
    }
