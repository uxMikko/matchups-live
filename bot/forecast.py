"""
Probability model for group-stage outcomes.

For each group, enumerates every possible result (home win / draw / away win)
for the remaining fixtures, weights each combination by a win-probability
derived from real Elo ratings (see elo.py), and tallies how often each team
lands in each of the 4 final positions. This gives P(team finishes group in
position k).

thirds_qualification_probabilities() then answers the harder question: of
the 12 teams that finish 3rd in their own group, only the best 8 (by the
same points/GD/GF/fair-play/rank tiebreak used everywhere else) advance.
Brute-force enumeration of all 12 groups jointly is infeasible (the
remaining-fixture combinations multiply across groups into the
quintillions), so instead, for every group's every possible 3rd-place
finisher scenario, we compute the exact probability that at most 7 of the
*other* 11 groups' 3rd-place finishers outrank it — a Poisson-binomial
calculation over 11 independent per-group "do they beat me" probabilities.
This is exact (no sampling noise), since groups' remaining fixtures don't
affect each other.

A team's overall "advance to R32" probability — what the standings table
actually shows — is then just P(finish 1st) + P(finish 2nd) + P(finish 3rd
AND qualify as one of the top-8 thirds), since those three outcomes are
mutually exclusive.

The draw probability is still a flat placeholder (25% regardless of
opponent) pending real bookmaker odds for near-term fixtures.
"""
from __future__ import annotations
from itertools import product as iproduct

import engine

DRAW_PROB = 0.25
_OUTCOME_SCORES = {"H": (1, 0), "D": (0, 0), "A": (0, 1)}

# Real Elo ratings (elo.fetch_elo_ratings()), set by the caller before
# running any simulation here — same pattern as engine.OFFICIAL_RANKS.
ELO_RATINGS: dict[str, float] = {}


def _strength(team: str) -> float:
    """10**(rating/400) is the standard Elo/Bradley-Terry parameterization:
    strength_A / (strength_A + strength_B) reproduces the classic logistic
    Elo expected-score formula exactly. 1500 (avg rating) for any team
    missing from the feed."""
    rating = ELO_RATINGS.get(team, 1500)
    return 10 ** (rating / 400)


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


def _split_completed_remaining(
    results: list[dict], matches: list[dict]
) -> tuple[dict[str, list[dict]], dict[str, list[dict]]]:
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

    return completed_by_group, remaining_by_group


def compute_all_probabilities(
    results: list[dict], matches: list[dict]
) -> dict[str, dict[str, dict[int, float]]]:
    """{group: {team: {1: prob, 2: prob, 3: prob, 4: prob}}} for every group."""
    completed_by_group, remaining_by_group = _split_completed_remaining(results, matches)
    return {
        g: group_position_probabilities(g, completed_by_group[g], remaining_by_group[g])
        for g in engine.GROUPS
    }


def _group_third_scenarios(
    group: str, completed: list[dict], remaining: list[dict]
) -> list[tuple[float, tuple, str]]:
    """[(weight, sort_key, team_name), ...] for every possible outcome of this
    group's remaining fixtures, weights normalized to sum to 1. sort_key is
    TeamRecord.cross_group_sort_key() — not the regular sort_key(), since its
    within-group-rank tiebreaker isn't comparable across different groups —
    so two scenarios from different groups can be compared directly with
    plain tuple comparison."""
    if not remaining:
        third = engine.build_group_standings(group, completed)[2]
        return [(1.0, third.cross_group_sort_key(), third.name)]

    fixture_probs = [_match_probs(m["home"], m["away"]) for m in remaining]
    scenarios = []
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
        third = engine.build_group_standings(group, hypothetical)[2]
        scenarios.append((weight, third.cross_group_sort_key(), third.name))
        total_weight += weight

    return [(w / total_weight, k, name) for w, k, name in scenarios]


def _poisson_binomial_le(probs: list[float], k: int) -> float:
    """P(number of successes <= k) for independent Bernoulli trials with the
    given per-trial success probabilities, via O(n^2) dynamic programming."""
    dp = [1.0]
    for p in probs:
        new_dp = [0.0] * (len(dp) + 1)
        for i, prob_i in enumerate(dp):
            new_dp[i] += prob_i * (1 - p)
            new_dp[i + 1] += prob_i * p
        dp = new_dp
    return sum(dp[: k + 1])


def thirds_qualification_probabilities(
    results: list[dict], matches: list[dict]
) -> dict[str, float]:
    """{team: P(finishes 3rd in its own group AND ranks in the top 8 of all
    12 groups' 3rd-place finishers)} — exact, via the decomposition described
    in the module docstring. Only ever non-zero for a team that has some
    chance of finishing 3rd in its own group."""
    completed_by_group, remaining_by_group = _split_completed_remaining(results, matches)
    scenarios_by_group = {
        g: _group_third_scenarios(g, completed_by_group[g], remaining_by_group[g])
        for g in engine.GROUPS
    }

    qualify_prob: dict[str, float] = {}
    groups = list(engine.GROUPS)
    for g in groups:
        other_groups = [g2 for g2 in groups if g2 != g]
        for weight, sort_key, team in scenarios_by_group[g]:
            beat_probs = [
                sum(w2 for w2, k2, _ in scenarios_by_group[g2] if k2 < sort_key)
                for g2 in other_groups
            ]
            p_qualify_given_scenario = _poisson_binomial_le(beat_probs, 7)
            qualify_prob[team] = qualify_prob.get(team, 0.0) + weight * p_qualify_given_scenario
    return qualify_prob
