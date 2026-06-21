"""
Real team-strength source: eloratings.net's free, public World Football Elo
Ratings. No auth, no scraping risk (it's a plain TSV file, not a page we'd
need a browser to render) — replaces forecast.py's old crude 1/rank guess.
"""
import logging

import httpx

log = logging.getLogger("elo")

ELO_URL = "https://www.eloratings.net/World.tsv"

# eloratings.net's own country codes -> our team names. Mostly ISO-3166-1
# alpha-2, with a few of their own conventions (Scotland=SQ, England=EN)
# that don't match the flag-icons codes used elsewhere in this project.
ELO_CODE_TO_TEAM = {
    "MX": "Mexico", "KR": "South Korea", "ZA": "South Africa", "CZ": "Czech Republic",
    "CA": "Canada", "CH": "Switzerland", "QA": "Qatar", "BA": "Bosnia-Herzegovina",
    "BR": "Brazil", "MA": "Morocco", "HT": "Haiti", "SQ": "Scotland",
    "US": "USA", "PY": "Paraguay", "AU": "Australia", "TR": "Turkey",
    "DE": "Germany", "CW": "Curacao", "CI": "Ivory Coast", "EC": "Ecuador",
    "NL": "Netherlands", "JP": "Japan", "SE": "Sweden", "TN": "Tunisia",
    "BE": "Belgium", "EG": "Egypt", "IR": "Iran", "NZ": "New Zealand",
    "ES": "Spain", "CV": "Cape Verde", "SA": "Saudi Arabia", "UY": "Uruguay",
    "FR": "France", "SN": "Senegal", "NO": "Norway", "IQ": "Iraq",
    "AR": "Argentina", "DZ": "Algeria", "AT": "Austria", "JO": "Jordan",
    "PT": "Portugal", "CD": "DR Congo", "UZ": "Uzbekistan", "CO": "Colombia",
    "EN": "England", "HR": "Croatia", "GH": "Ghana", "PA": "Panama",
}


async def fetch_elo_ratings() -> dict[str, float]:
    """{team_name: current Elo rating} for every team we track."""
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(ELO_URL, timeout=8)
            r.raise_for_status()
    except Exception as e:
        log.warning(f"fetch_elo_ratings failed: {e}")
        return {}

    ratings: dict[str, float] = {}
    for line in r.text.splitlines():
        cols = line.split("\t")
        if len(cols) < 4:
            continue
        code, rating = cols[2], cols[3]
        team = ELO_CODE_TO_TEAM.get(code)
        if team:
            try:
                ratings[team] = float(rating)
            except ValueError:
                continue
    return ratings
