// api/insights.js
// Paginates through your FULL run history (single pass, list endpoint only
// — cheap on rate limits) to compute every aggregate the front-end charts
// need: weekday/hour patterns, distance distribution, pace/HR zone breakdowns,
// pace distribution, HR zones, and time-in-zone (approximated — see below).

const { stravaGet } = require("../lib/strava");
const { powerLawFit, predictTime, mean, loocvPowerLaw } = require("../lib/ml");
const prsSeed = require("../data/prs-seed.json");
const paceZoneSeed = require("../data/pace-zones-seed.json");

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TYPE_LABELS = {
  Run: "Run", VirtualRun: "Run", Ride: "Ride", VirtualRide: "Virtual Ride", WeightTraining: "Strength Training",
  Canoeing: "Rowing / Canoeing", Rowing: "Rowing / Canoeing",
  Walk: "Walk", Hike: "Hike", Swim: "Swim", Yoga: "Yoga", Workout: "Workout",
  Elliptical: "Elliptical", StairStepper: "Stair Stepper", Crossfit: "Crossfit"
};

const ZONE_META = [
  { zone: "Z1", label: "Recovery", color: "#F7CFC9" },
  { zone: "Z2", label: "Easy", color: "#EDA79B" },
  { zone: "Z3", label: "Steady", color: "#DE7A67" },
  { zone: "Z4", label: "Threshold", color: "#C94531" },
  { zone: "Z5", label: "Max", color: "#7A1610" }
];
const DEFAULT_ZONES = [{ min: 0, max: 124 }, { min: 125, max: 155 }, { min: 156, max: 170 }, { min: 171, max: 185 }, { min: 186, max: null }];

const PACE_ZONE_META = [
  { zone: "Z1", label: "Recovery", color: "#D6E4F5" },
  { zone: "Z2", label: "Easy", color: "#AEC9EA" },
  { zone: "Z3", label: "Moderate", color: "#86AEDE" },
  { zone: "Z4", label: "Tempo", color: "#5E93D2" },
  { zone: "Z5", label: "Threshold", color: "#3A72B8" },
  { zone: "Z6", label: "Max", color: "#1C2B4A" }
];

function fmtPaceShort(s){
  const mm = Math.floor(s/60), ss = Math.round(s%60);
  return `${mm}:${String(ss).padStart(2,"0")}`;
}

function fmtPace(distM, movingS) {
  if (!distM) return "—";
  const s = movingS / (distM / 1000);
  const mm = Math.floor(s / 60), ss = Math.round(s % 60);
  return `${mm}:${String(ss).padStart(2, "0")}/km`;
}

const DIST_BUCKETS = [
  { label: "0-2km", min: 0, max: 2 }, { label: "2-5km", min: 2, max: 5 },
  { label: "5-10km", min: 5, max: 10 }, { label: "10-15km", min: 10, max: 15 },
  { label: "15-21km", min: 15, max: 21 }, { label: "21-30km", min: 21, max: 30 },
  { label: "30-42km", min: 30, max: 42 }, { label: "42km+", min: 42, max: Infinity }
];

function paceBucketsFor(paces) {
  if (!paces.length) return { bins: [], mean: 0 };
  const mean = paces.reduce((a, b) => a + b, 0) / paces.length;
  const minP = 150, maxP = 420, step = 10;
  const bins = [];
  for (let s = minP; s < maxP; s += step) bins.push({ from: s, count: paces.filter(p => p >= s && p < s + step).length });
  return { bins, mean };
}

function zoneIndexFor(bpm, zones) {
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const openEnded = z.max == null || z.max < 0; // Strava sometimes uses -1 (not null) to mean "no upper limit"
    if (bpm >= z.min && (openEnded || bpm < z.max)) return i;
  }
  return zones.length - 1;
}

function hrBucketsFor(hrs, zones) {
  // One bin per real HR zone (matches the 5-zone legend below the chart)
  // instead of arbitrary fixed-width bpm buckets.
  const bins = zones.map((z, i) => ({ from: z.min, to: z.max, zoneIndex: i, count: 0 }));
  for (const v of hrs) {
    const zi = zoneIndexFor(v, zones);
    if (bins[zi]) bins[zi].count++;
  }
  const observedMax = hrs.length ? Math.max(...hrs) : null;
  return { bins, observedMax };
}

module.exports = async (req, res) => {
  try {
    // Real HR zone boundaries from the athlete's Strava settings (fallback if unavailable)
    let hrZoneDefs = DEFAULT_ZONES;
    try {
      const zonesResp = await stravaGet("/athlete/zones");
      const z = zonesResp?.heart_rate?.zones;
      if (Array.isArray(z) && z.length) hrZoneDefs = z;
    } catch (_) { /* keep default */ }

    const all = [];
    const maxPages = 30; // 30 x 200 = 6000 — the real stop condition is batch.length < 200 (below); this cap is just a safety ceiling, raised because 8 was cutting off your earliest activities (e.g. 2022)
    for (let page = 1; page <= maxPages; page++) {
      const batch = await stravaGet(`/athlete/activities?per_page=200&page=${page}`);
      if (!batch.length) break;
      all.push(...batch);
      if (batch.length < 200) break;
    }
    if (all.length === 0) return res.status(200).json({ error: "sem atividades encontradas" });

    const runs = all.filter(a => a.sport_type === "Run" || a.sport_type === "VirtualRun"); // treat Virtual Run as a regular run — matches how Strava's own official stats aggregate them together

    const byWeekday = Array(7).fill(0).map(() => ({ count: 0, km: 0 }));
    const byHour = Array(24).fill(0);
    const byYear = {};
    const distBuckets = DIST_BUCKETS.map(b => ({ ...b, count: 0 }));
    let totalDist = 0, totalMoving = 0, totalElevation = 0;
    let longest = runs[0] || null;
    const paces = [];
    const hrs = [];
    const zoneTime = Array(5).fill(0); // seconds, approximated per-run by avg HR
    const paceZoneTime = Array(6).fill(0); // seconds, classified by each run's avg speed

    for (const r of runs) {
      const dt = new Date(r.start_date_local);
      const day = dt.getUTCDay();
      const hour = dt.getUTCHours();
      const year = r.start_date_local.slice(0, 4);
      const km = r.distance / 1000;

      byWeekday[day].count += 1;
      byWeekday[day].km += km;
      byHour[hour] += 1;
      byYear[year] = (byYear[year] || 0) + km;

      const bucket = distBuckets.find(b => km >= b.min && km < b.max);
      if (bucket) bucket.count += 1;

      totalDist += r.distance;
      totalMoving += r.moving_time;
      totalElevation += r.total_elevation_gain || 0;
      if (r.distance > longest.distance) longest = r;

      if (r.distance > 0 && r.moving_time > 0) {
        const paceS = r.moving_time / km;
        if (paceS >= 100 && paceS <= 500) paces.push(paceS);
        const speedMps = r.distance / r.moving_time;
        const pzi = zoneIndexFor(speedMps, paceZoneSeed.speedZones);
        paceZoneTime[pzi] += r.moving_time;
      }
      if (r.has_heartrate && r.average_heartrate) {
        hrs.push(r.average_heartrate);
        const zi = zoneIndexFor(r.average_heartrate, hrZoneDefs);
        zoneTime[zi] += r.moving_time;
      }
    }

    const weekday = byWeekday.map((d, i) => ({ label: WEEKDAY_LABELS[i], count: d.count, km: Math.round(d.km * 10) / 10, avgKm: d.count ? Math.round((d.km / d.count) * 10) / 10 : 0 }));
    const busiest = weekday.reduce((a, b) => (b.count > a.count ? b : a));

    const byType = {};
    for (const a of all) {
      const key = TYPE_LABELS[a.sport_type] || a.sport_type; // group by normalized label so e.g. Run + VirtualRun merge into one "Run" bucket
      if (!byType[key]) byType[key] = { count: 0, distance: 0, movingTime: 0 };
      byType[key].count += 1;
      byType[key].distance += a.distance || 0;
      byType[key].movingTime += a.moving_time || 0;
    }
    const bySport = Object.entries(byType).sort((a, b) => b[1].movingTime - a[1].movingTime)
      .map(([type, v]) => ({ type, count: v.count, km: Math.round((v.distance / 1000) * 10) / 10, hours: Math.round((v.movingTime / 3600) * 10) / 10 }));

    // Corrida x Musculação x Workout, por ano (% do tempo combinado das três + horas acumuladas)
    const annualTypeSeconds = {};
    for (const a of all) {
      const isRun = a.sport_type === "Run" || a.sport_type === "VirtualRun";
      const isStrength = a.sport_type === "WeightTraining";
      const isWorkout = a.sport_type === "Workout";
      if (!isRun && !isStrength && !isWorkout) continue;
      const year = a.start_date_local.slice(0, 4);
      if (!annualTypeSeconds[year]) annualTypeSeconds[year] = { Run: 0, WeightTraining: 0, Workout: 0 };
      const key = isRun ? "Run" : (isStrength ? "WeightTraining" : "Workout");
      annualTypeSeconds[year][key] += a.moving_time || 0;
    }
    const annualRunVsStrength = Object.keys(annualTypeSeconds).sort().map(year => {
      const s = annualTypeSeconds[year];
      const totalS = (s.Run + s.WeightTraining + s.Workout) || 1;
      return {
        year,
        runHours: Math.round((s.Run / 3600) * 10) / 10,
        strengthHours: Math.round((s.WeightTraining / 3600) * 10) / 10,
        workoutHours: Math.round((s.Workout / 3600) * 10) / 10,
        runPct: Math.round((s.Run / totalS) * 1000) / 10,
        strengthPct: Math.round((s.WeightTraining / totalS) * 1000) / 10,
        workoutPct: Math.round((s.Workout / totalS) * 1000) / 10
      };
    });

    const { bins: paceBins, mean: paceMean } = paceBucketsFor(paces);
    const { bins: hrBins, observedMax: hrObservedMax } = hrBucketsFor(hrs, hrZoneDefs);

    const totalZoneTime = zoneTime.reduce((a, b) => a + b, 0) || 1;
    const zoneTimePct = ZONE_META.map((meta, i) => {
      const def = hrZoneDefs[i] || {};
      const range = (def.max == null || def.max < 0) ? `${def.min}+ bpm` : `${def.min}-${def.max} bpm`;
      return { ...meta, pct: Math.round((zoneTime[i] / totalZoneTime) * 1000) / 10, range };
    });

    const totalPaceZoneTime = paceZoneTime.reduce((a, b) => a + b, 0) || 1;
    const paceZoneTimePct = PACE_ZONE_META.map((meta, i) => {
      const def = paceZoneSeed.speedZones[i] || {};
      const fastPace = def.max ? fmtPaceShort(1000 / def.max) : null;
      const slowPace = def.min ? fmtPaceShort(1000 / def.min) : null;
      let range;
      if (i === 0) range = `slower than ${fastPace}/km`;
      else if (i === PACE_ZONE_META.length - 1) range = `faster than ${slowPace}/km`;
      else range = `${fastPace}-${slowPace}/km`;
      return { ...meta, pct: Math.round((paceZoneTime[i] / totalPaceZoneTime) * 1000) / 10, range };
    });

    // Day-by-day progression (all activity types) — a GitHub-style heatmap
    // per year, reusing the full-history scan already done above.
    const dailyMinutes = {}; // "YYYY-MM-DD" -> total moving minutes that day
    let minYear = new Date().getFullYear(), maxYear = minYear;
    for (const a of all) {
      const dateStr = a.start_date_local.slice(0, 10);
      const year = Number(dateStr.slice(0, 4));
      if (year < minYear) minYear = year;
      if (year > maxYear) maxYear = year;
      dailyMinutes[dateStr] = (dailyMinutes[dateStr] || 0) + (a.moving_time || 0) / 60;
    }
    function levelFor(min) {
      if (!min) return 0;
      if (min < 20) return 1;
      if (min < 45) return 2;
      if (min < 75) return 3;
      return 4;
    }
    const today = new Date();
    const progression = [];
    for (let y = maxYear; y >= minYear; y--) {
      const start = new Date(Date.UTC(y, 0, 1));
      const end = y === today.getFullYear() ? today : new Date(Date.UTC(y, 11, 31));
      const cells = [];
      let activeDays = 0, totalDays = 0;
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const min = dailyMinutes[dateStr] || 0;
        const level = levelFor(min);
        if (level > 0) activeDays++;
        totalDays++;
        cells.push({ date: dateStr, level });
      }
      progression.push({
        year: y, cells, activeDays, totalDays,
        pct: totalDays ? Math.round((activeDays / totalDays) * 100) : 0,
        restDays: totalDays - activeDays
      });
    }

    // ---------------------------------------------------------------
    // ML #1 — Race time predictor: personalized Riegel-style power-law
    // (time = a * distance^b) fitted on the athlete's OWN PR curve via
    // log-log linear regression, then adjusted by recent pace trend.
    //
    // IMPORTANT: only endurance-range distances (5K+) go into the fit.
    // Sprint distances (400m, 1k, 1 mile...) are dominated by anaerobic
    // capacity, a different physiological system than aerobic endurance —
    // mixing them into the same power-law curve systematically pulled the
    // predicted 10K/Half/Marathon times too fast for a realistic amateur
    // athlete. Restricting to 5K-marathon fixes that.
    // ---------------------------------------------------------------
    const DISTANCE_KM = {
      "5k": 5, "10k": 10, "15k": 15, "10 mile": 16.0934, "20k": 20,
      "Half-Marathon": 21.0975, "30k": 30, "Marathon": 42.195
    };
    const prPoints = Object.entries(prsSeed.seconds || {})
      .filter(([k]) => DISTANCE_KM[k])
      .map(([k, sec]) => ({ x: DISTANCE_KM[k], y: sec }));

    let racePrediction = null;
    if (prPoints.length >= 3) {
      const curve = powerLawFit(prPoints);
      // Recent-form adjustment: compare last 45 days' avg pace to all-time avg pace
      const cutoff45 = new Date(); cutoff45.setDate(cutoff45.getDate() - 45);
      const recentRuns = runs.filter(r => new Date(r.start_date_local) >= cutoff45 && r.distance > 0 && r.moving_time > 0);
      let recentPace = null, overallPace = null, formFactor = 1;
      if (recentRuns.length >= 3) {
        const recentPaces = recentRuns.map(r => r.moving_time / (r.distance / 1000));
        const allPaces = runs.filter(r => r.distance > 0 && r.moving_time > 0).map(r => r.moving_time / (r.distance / 1000));
        recentPace = mean(recentPaces);
        overallPace = mean(allPaces);
        // clamp adjustment to +/-8% so a single rough/great week doesn't swing predictions wildly
        formFactor = Math.max(0.92, Math.min(1.08, recentPace / overallPace));
      }
      const targets = [
        { key: "5k", label: "5K", km: 5, marginPct: 0.02 },
        { key: "10k", label: "10K", km: 10, marginPct: 0.03 },
        { key: "Half-Marathon", label: "Half Marathon", km: 21.0975, marginPct: 0.05 },
        { key: "Marathon", label: "Marathon", km: 42.195, marginPct: 0.08 }
      ];
      const cv = loocvPowerLaw(prPoints); // leave-one-out cross-validation: honest error estimate, not fit-to-same-data
      racePrediction = {
        exponent: Math.round(curve.b * 1000) / 1000,
        r2: Math.round(curve.r2 * 1000) / 1000,
        formFactor: Math.round(formFactor * 1000) / 1000,
        trainingPoints: prPoints.length,
        maeSeconds: cv ? cv.maeSeconds : null,
        mapePct: cv ? cv.mapePct : null,
        // The curve is fit directly through PR times — which are, by definition, best-case
        // outcomes achieved on an ideal day. Predicting that exact pace for every future race
        // implicitly assumes a PR-day outcome every time, which isn't realistic for an amateur
        // runner without professional-level recovery/nutrition support. The marginPct below adds
        // a distance-scaled "reality margin" (more room for things to go wrong over a marathon
        // than a 5K) instead of presenting the raw curve as the expected outcome.
        predictions: targets.map(t => ({
          label: t.label,
          seconds: Math.round(predictTime(curve, t.km) * formFactor * (1 + t.marginPct))
        }))
      };
    }

    const insights = {
      totalActivitiesScanned: all.length,
      totalRunsScanned: runs.length,
      weekday, byHour,
      annualDistance: Object.keys(byYear).sort().map(y => ({ year: y, km: Math.round(byYear[y]) })),
      distanceDistribution: distBuckets.map(b => ({ label: b.label, count: b.count })),
      paceDistribution: { bins: paceBins, meanPace: fmtPace(1000, paceMean) },
      hrZones: hrBins,
      hrObservedMax,
      hrZoneDefs,
      zoneTimePct,
      paceZoneTimePct,
      busiestWeekday: busiest.label,
      avgPace: fmtPace(totalDist, totalMoving),
      avgDistanceKm: runs.length ? Math.round((totalDist / runs.length / 1000) * 10) / 10 : 0,
      totalElevationM: Math.round(totalElevation),
      longestRun: longest ? { name: longest.name, km: Math.round((longest.distance / 1000) * 10) / 10, date: longest.start_date_local } : null,
      bySport,
      annualRunVsStrength,
      progression,
      racePrediction
    };

    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate"); // 6h — was 24h; still a full-history scan, so not shortened all the way to match stats.js's 1h
    res.status(200).json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
