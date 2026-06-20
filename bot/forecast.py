"""
Placeholder probability model for group-stage outcomes.

For each group, enumerates every possible result (home win / draw / away win)
for the remaining fixtures, weights each combination by a simple rank-based
win-probability heuristic, and tallies how often each team lands in each of
the 4 final positions. This gives P(team finishes group in position k).

Bracket-slot probabilities are then derived from these position
probabilities: for fixed (non-third-place) slots, the probability of the
projected matchup is just the product of both teams' position probabilities
(treated as independent, per design). For winner-vs-third slots, it's the
team's probability of finishing 3rd in its own group, times a uniform 1/8
placeholder weight for which of the 8 qualifying thirds Annex C routes to
this particular slot.

Everything here is explicitly a placeholder pending a real odds source.
"""
from __future__ import annotations
from itertools import product as iproduct

import engine

DRAW_PROB = 0.25
_OUTCOME_SCORES = {"H": (1, 0), "D": (0, 0), "A": (0, 1)}


def _strength(team: str) -> float:
    rank = engine.OFFICIAL_RANKS.get(team) or engine.FIFA_RANKINGS.get(team, 50)
    return 1.0 / rank


def _match_probs(home: str, away: str) -> dict[str, float]:
    sh, sa = _strength(home), _strength(away)
    p_home = (1 - DRAW_PROB) * sh / (sh + sa)
    p_away = (1 - DRAW_PROB) * sa / (sh + sa)
    return {"H": p_home, "D": DRAW_PROB, "A": p_away}


def group_position_probabilities(
    group: str, completed: list[dict], remaining: list[dict]
) -> dict[str, dict[int, float]]:
    """completed/remaining: this group's results/fixtures only (with 'group' key)."""
    teams = engine.GROUPS[group]
    counts = {t: {1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0} for t in teams}

    if not remaining:
        order = [r.name for r in engine.build_group_standings(group, completed)]
        for pos, team in enumerate(order, start=1):
            counts[team][pos] = 1.0
        return counts

    fixture_probs = [_match_probs(m["home"], m["away"]) for m in remaining]
    total_weight = 0.0
    for combo in iproduct("HDA", repeat=len(remaining)):
        weight = 1.0
        hypothetical = list(completed)
        for fixture, probs, outcome in zip(remaining, fixture_probs, combo):
            weight *= probs[outcome]
            hs, as_ = _OUTCOME_SCORES[outcome]
            hypothetical.append({
                "home": fixture["home"], "away": fixture["away"],
                "group": group, "home_score": hs, "away_score": as_,
            })
        order = [r.name for r in engine.build_group_standings(group, hypothetical)]
        for pos, team in enumerate(order, start=1):
            counts[team][pos] += weight
        total_weight += weight

    return {
        t: {p: v / total_weight for p, v in pos_map.items()}
        for t, pos_map in counts.items()
    }


def compute_all_probabilities(
    results: list[dict], matches: list[dict]
) -> dict[str, dict[str, dict[int, float]]]:
    """{group: {team: {1: prob, 2: prob, 3: prob, 4: prob}}} for every group."""
    completed_by_group: dict[str, list[dict]] = {g: [] for g in engine.GROUPS}
    played_pairs: dict[str, set] = {g: set() for g in engine.GROUPS}
    for r in results:
        g = r.get("group")
        if g not in completed_by_group:
            continue
        completed_by_group[g].append(r)
        played_pairs[g].add((r["home"], r["away"]))

    remaining_by_group: dict[str, list[dict]] = {g: [] for g in engine.GROUPS}
    for m in matches:
        g = m.get("group")
        if g not in remaining_by_group:
            continue
        if (m["home"], m["away"]) not in played_pairs[g]:
            remaining_by_group[g].append(m)

    return {
        g: group_position_probabilities(g, completed_by_group[g], remaining_by_group[g])
        for g in engine.GROUPS
    }
