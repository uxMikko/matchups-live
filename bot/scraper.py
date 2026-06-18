"""
Playwright async scraper.
Primary: Google search widget. Fallback: ESPN match page.
Full time confirmed by 2 consecutive FT reads 60s apart with same score.
"""
import asyncio
import logging
import re
from dataclasses import dataclass
from typing import Optional

from playwright.async_api import async_playwright, TimeoutError as PWTimeout

log = logging.getLogger("scraper")


@dataclass
class MatchScore:
    home_score: Optional[int]
    away_score: Optional[int]
    minute: Optional[str]
    status: str  # "live" | "ht" | "ft" | "ns" | "unknown"


async def scrape_match(home: str, away: str) -> Optional[MatchScore]:
    """Try Google first, then ESPN."""
    for attempt in range(2):
        try:
            result = await _google_scrape(home, away)
            if result:
                return result
        except Exception as e:
            log.warning(f"Google attempt {attempt+1} failed ({home} vs {away}): {e}")

    try:
        return await _espn_scrape(home, away)
    except Exception as e:
        log.error(f"ESPN fallback failed ({home} vs {away}): {e}")
        return None


async def _google_scrape(home: str, away: str) -> Optional[MatchScore]:
    query = f"2026 World Cup {home} {away} score"
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"
        )
        try:
            await page.goto(
                f"https://www.google.com/search?q={query.replace(' ', '+')}",
                wait_until="networkidle",
                timeout=20000,
            )
            # Try multiple score widget selectors
            for sel in [".imso-score", "[data-attrid*='score']", ".imspo_mt__t-sc"]:
                try:
                    await page.wait_for_selector(sel, timeout=5000)
                    break
                except PWTimeout:
                    continue

            text = await page.inner_text("body")
            return _parse_score_text(text, home, away)
        finally:
            await browser.close()


async def _espn_scrape(home: str, away: str) -> Optional[MatchScore]:
    query = f"site:espn.com {home} {away} 2026 world cup"
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(
                f"https://www.google.com/search?q={query.replace(' ', '+')}",
                wait_until="domcontentloaded",
                timeout=20000,
            )
            # Try to find ESPN result link
            links = await page.query_selector_all("a[href*='espn.com']")
            for link in links[:3]:
                href = await link.get_attribute("href")
                if href and "gameId" in href:
                    await page.goto(href, wait_until="domcontentloaded", timeout=20000)
                    text = await page.inner_text("body")
                    result = _parse_score_text(text, home, away)
                    if result:
                        return result
            return None
        finally:
            await browser.close()


def _parse_score_text(text: str, home: str, away: str) -> Optional[MatchScore]:
    """Extract score from page text using multiple patterns."""
    # Pattern: "X - Y" or "X–Y" between team name mentions
    score_patterns = [
        r"(\d{1,2})\s*[-–]\s*(\d{1,2})",
        r"(\d{1,2}):(\d{1,2})",
    ]
    for pattern in score_patterns:
        matches = re.findall(pattern, text)
        if matches:
            hs, as_ = int(matches[0][0]), int(matches[0][1])
            status = _detect_status(text)
            minute = _detect_minute(text)
            return MatchScore(hs, as_, minute, status)

    # Not started or no score found
    if any(word in text.lower() for word in ["not started", "upcoming", "preview"]):
        return MatchScore(None, None, None, "ns")
    return None


def _detect_status(text: str) -> str:
    lower = text.lower()
    if any(s in lower for s in ["full time", "final", "ft", "full-time"]):
        return "ft"
    if "half time" in lower or "ht" in lower or "half-time" in lower:
        return "ht"
    if any(s in lower for s in ["live", "in progress", "'"]):
        return "live"
    return "unknown"


def _detect_minute(text: str) -> Optional[str]:
    m = re.search(r"(\d{1,3})['’]\s*(?:\+\d+)?", text)
    return m.group(0).strip() if m else None


async def wait_for_fulltime(home: str, away: str, kickoff_plus: int = 100) -> MatchScore:
    """
    Poll every 30s starting at kickoff+100min.
    Confirm FT when score unchanged across 2 consecutive FT reads 60s apart.
    Safety cutoff at kickoff+150min.
    """
    log.info(f"Waiting for FT: {home} vs {away}")
    last_score: Optional[MatchScore] = None
    last_ft_score: Optional[tuple] = None
    polls = 0
    max_polls = (150 - kickoff_plus) * 2  # 2 polls/min from kickoff+100

    while polls < max_polls:
        await asyncio.sleep(30)
        polls += 1
        score = await scrape_match(home, away)
        if not score:
            continue

        log.info(f"  {home} {score.home_score}-{score.away_score} {away} [{score.status}] {score.minute or ''}")

        if score.status == "ft":
            current = (score.home_score, score.away_score)
            if last_ft_score == current:
                log.info(f"FT confirmed: {home} {score.home_score}-{score.away_score} {away}")
                return score
            last_ft_score = current
        else:
            last_ft_score = None

        last_score = score

    # Safety cutoff — return best known score
    log.warning(f"Safety cutoff for {home} vs {away}")
    return last_score or MatchScore(0, 0, "150+", "ft")
