// api/prs.js
// Strava's public API has no "lifetime best marks" endpoint — that table
// (the one you see on strava.com under your profile -> "Melhores marcas")
// is computed internally by Strava, not exposed via /athlete or /activities.
// best_efforts only come back per-activity, and only for runs long enough
// to contain that distance.
//
// So: we seed with your real all-time bests (data/prs-seed.json, copied
// once from your Strava profile / share cards), and only override a
// distance if a recently scanned run beats or ties it — i.e. a genuine PR.
// Because we already fetch the full activity detail for every candidate in
// the scan window, a fresh PR automatically updates BOTH the time and the
// full stats card (distance, pace, elevation, calories, avg HR) — no
// manual step needed when you actually break a record.
//
// To resync the seed later (e.g. after a race that falls outside the scan
// window), update data/prs-seed.json with fresh values from your Strava
// share card for that activity.

const { stravaGet } = require("../lib/strava");
const seed = require("../data/prs-seed.json");

const LABELS = {
  "400m": "400 m", "1/2 mile": "1/2 mile", "1k": "1 km", "1 mile": "1 mile",
  "2 mile": "2 mile", "5k": "5K", "10k": "10K", "15k": "15K",
  "10 mile": "10 mile", "20k": "20K", "Half-Marathon": "Half Marathon",
  "30k": "30K", "Marathon": "Marathon"
};

const ORDER = ["5k", "10k", "15k", "10 mile", "Half-Marathon", "30k", "Marathon"];

function fmtTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.round(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

module.exports = async (req, res) => {
  try {
    const best = { ...seed.seconds };
    const stats = { ...(seed.stats || {}) };

    const activities = await stravaGet("/athlete/activities?per_page=30");
    const candidates = activities
      .filter(a => (a.sport_type === "Run" || a.sport_type === "VirtualRun") && a.distance > 3000)
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 8);

    for (const activity of candidates) {
      const detail = await stravaGet(`/activities/${activity.id}`);
      for (const effort of detail.best_efforts || []) {
        const key = effort.name;
        if (!LABELS[key]) continue;
        if (best[key] === undefined || effort.elapsed_time <= best[key]) {
          best[key] = effort.elapsed_time;
          stats[key] = {
            eventName: detail.name,
            date: detail.start_date_local,
            locationName: detail.location_city || null,
            distanceKm: Math.round((detail.distance / 1000) * 100) / 100,
            movingTimeS: detail.moving_time,
            elevationM: Math.round(detail.total_elevation_gain || 0),
            calories: detail.calories || null,
            avgHr: detail.average_heartrate ? Math.round(detail.average_heartrate) : null
          };
        }
      }
    }

    const prs = ORDER.filter(k => best[k] !== undefined).map(k => {
      const s = stats[k] || null;
      return {
        key: k,
        dist: LABELS[k],
        time: fmtTime(best[k]),
        stats: s ? {
          eventName: s.eventName,
          date: s.date,
          locationName: s.locationName,
          distanceKm: s.distanceKm,
          movingTime: fmtTime(s.movingTimeS),
          avgPace: fmtTime(s.movingTimeS / s.distanceKm) + "/km",
          elevationM: s.elevationM,
          calories: s.calories,
          avgHr: s.avgHr
        } : null
      };
    });

    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    res.status(200).json(prs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
