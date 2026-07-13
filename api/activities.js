// api/activities.js
// Returns every activity from Jan 1st of the current year to now (all sport
// types). This one fetch backs both the "recent activities" table AND the
// "activities by type" pie chart on the front-end — period filtering (7
// days / last week / this month / year) happens client-side so switching
// tabs is instant, no extra requests.
const { stravaGet } = require("../lib/strava");

module.exports = async (req, res) => {
  try {
    const jan1 = Date.UTC(new Date().getUTCFullYear(), 0, 1) / 1000;
    const all = [];
    const maxPages = 6; // 6 x 200 = 1200, comfortably covers a year for this account
    for (let page = 1; page <= maxPages; page++) {
      const batch = await stravaGet(`/athlete/activities?after=${jan1}&per_page=200&page=${page}`);
      if (!batch.length) break;
      all.push(...batch);
      if (batch.length < 200) break;
    }

    const trimmed = all.map(a => ({
      id: a.id,
      name: a.name,
      sport_type: a.sport_type,
      distance: a.distance,
      moving_time: a.moving_time,
      start_date_local: a.start_date_local
    }));

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate");
    res.status(200).json(trimmed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
