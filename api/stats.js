// api/stats.js
// Returns lifetime + year-to-date totals using Strava's athlete stats
// endpoint — a single call, no need to paginate every activity ever done.
const { stravaGet } = require("../lib/strava");

module.exports = async (req, res) => {
  try {
    const athlete = await stravaGet("/athlete");
    const stats = await stravaGet(`/athletes/${athlete.id}/stats`);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate"); // stats don't need to be real-time
    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
