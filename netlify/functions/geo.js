// GET /api/geo — visitor's country, from Netlify's own edge geolocation
// (no external call, no cost). Used purely to gate betting/odds content to
// an explicit allow-list (see ODDS_ALLOWED_COUNTRIES in index.html) - never
// to gate the rest of the site, which has nothing region-restricted in it.

export async function handler(event, context) {
  const code = context.geo?.country?.code || null;
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      // Per-visitor, but geolocation for a given IP doesn't change
      // minute-to-minute - short cache just avoids a repeat lookup on
      // every poll cycle from the same visitor.
      "Cache-Control": "private, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ country: code }),
  };
}
