// api/gear.js
// The Strava public API's GET /athlete only returns ACTIVE gear in the
// `shoes` field — retired shoes are not exposed there (confirmed: the field
// comes back empty of retired items even with no filtering). So: fetch
// active shoes live from the API, and merge in the retired ones from a seed
// file (same pattern as prs.js and pace-zones — real data, copied once from
// the app, since there's no API to fetch it).
const { stravaGet } = require("../lib/strava");
const retiredSeed = require("../data/retired-shoes-seed.json");

module.exports = async (req, res) => {
  try {
    const athlete = await stravaGet("/athlete");
    const active = (athlete.shoes || [])
      .sort((a, b) => b.distance - a.distance)
      .map(s => ({ name: s.name, km: Math.round(s.distance / 100) / 10, retired: false }));

    const retired = retiredSeed.shoes
      .sort((a, b) => b.km - a.km)
      .map(s => ({ name: s.name, km: s.km, retired: true }));

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).json([...active, ...retired]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
