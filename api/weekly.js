// api/weekly.js
// Aggregates runs into the last 8 weekly totals, labeled with the real
// Monday-Sunday date range (e.g. "Jun 22-28") instead of week numbers.
const { stravaGet } = require("../lib/strava");

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function mondayOf(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

function weekLabel(monday) {
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const mD = monday.getUTCDate(), mM = MONTHS[monday.getUTCMonth()];
  const sD = sunday.getUTCDate(), sM = MONTHS[sunday.getUTCMonth()];
  return mM === sM ? `${mM} ${mD}-${sD}` : `${mM} ${mD} - ${sM} ${sD}`;
}

module.exports = async (req, res) => {
  try {
    const after = Math.floor(Date.now() / 1000) - 63 * 24 * 3600;
    const activities = await stravaGet(`/athlete/activities?after=${after}&per_page=100`);
    const runs = activities.filter(a => a.sport_type === "Run" || a.sport_type === "VirtualRun");

    const byWeek = {};
    for (const r of runs) {
      const monday = mondayOf(new Date(r.start_date_local));
      const key = monday.toISOString().slice(0, 10);
      byWeek[key] = (byWeek[key] || 0) + r.distance / 1000;
    }

    const currentMondayKey = mondayOf(new Date()).toISOString().slice(0, 10);
    const weeks = Object.keys(byWeek).sort().map(key => ({
      label: weekLabel(new Date(key + "T00:00:00Z")),
      km: Math.round(byWeek[key] * 10) / 10,
      current: key === currentMondayKey
    })).slice(-8); // exactly the last 8 weeks, no matter how wide the fetch window is

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate");
    res.status(200).json({ weeks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
