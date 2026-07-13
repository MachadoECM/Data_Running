// api/mapdata.js
// Finds the top 5 cities where you've run the most over the years.
// Clusters runs by rough starting location (~5km grid) using start_latlng
// (already included in the list endpoint — no per-activity detail calls),
// reverse-geocodes each cluster via OpenStreetMap's free Nominatim service,
// then MERGES clusters that resolve to the same city+country before
// ranking (a big city like São Paulo spans many 5km clusters, and distinct
// clusters can resolve to the same distant city name too). No API keys
// required.

const { stravaGet } = require("../lib/strava");

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Curaçao, Aruba, Bonaire and Sint Maarten are constituent countries/special
// municipalities of the Kingdom of the Netherlands. Nominatim sometimes
// resolves their country_code as "nl" instead of the island's own ISO code
// — this overrides that for the known bounding boxes.
const CARIBBEAN_NL_OVERRIDES = [
  { code: "cw", name: "Curaçao", latMin: 11.9, latMax: 12.5, lngMin: -69.2, lngMax: -68.6 },
  { code: "aw", name: "Aruba", latMin: 12.4, latMax: 12.7, lngMin: -70.1, lngMax: -69.8 },
  { code: "bq", name: "Bonaire", latMin: 12.0, latMax: 12.4, lngMin: -68.5, lngMax: -68.1 },
  { code: "sx", name: "Sint Maarten", latMin: 18.0, latMax: 18.1, lngMin: -63.15, lngMax: -62.95 }
];

function fixDutchCaribbean(lat, lng, countryCode, country) {
  if (countryCode !== "nl") return { countryCode, country };
  const hit = CARIBBEAN_NL_OVERRIDES.find(z => lat >= z.latMin && lat <= z.latMax && lng >= z.lngMin && lng <= z.lngMax);
  return hit ? { countryCode: hit.code, country: hit.name } : { countryCode, country };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocodeOnce(lat, lng, zoom) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&zoom=${zoom}&format=jsonv2&addressdetails=1`;
  const r = await fetch(url, { headers: { "User-Agent": "split-strava-dashboard/1.0 (personal project)" } });
  if (!r.ok) return null;
  const data = await r.json();
  const addr = data.address || {};
  // Broad fallback chain — small nations/islands (e.g. Curaçao) don't
  // always populate "city", so we fall back progressively.
  const city = addr.city || addr.town || addr.village || addr.municipality
    || addr.county || addr.state_district || addr.island || addr.state
    || data.name || null;
  const country0 = addr.country || null;
  const countryCode0 = addr.country_code || null; // ISO 3166-1 alpha-2, e.g. "br", "cw"
  const { countryCode, country } = fixDutchCaribbean(lat, lng, countryCode0, country0);
  return { city, country, countryCode };
}

// Three layers of resilience, since a single Nominatim call occasionally
// times out, gets rate-limited, or lands somewhere (a highway, a park,
// open water) with no nearby named place at the requested zoom level —
// which previously fell all the way through to showing raw coordinates.
async function reverseGeocode(lat, lng) {
  // 1) Normal attempt, with one retry if the request itself fails.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const geo = await reverseGeocodeOnce(lat, lng, 10);
      if (geo && (geo.city || geo.country)) return geo;
    } catch (_) { /* try again / fall through */ }
    if (attempt === 0) await sleep(1200);
  }
  // 2) Zoom out — a broader query is more likely to at least resolve a
  // country or region even if there's no nearby named settlement.
  try {
    const wide = await reverseGeocodeOnce(lat, lng, 6);
    if (wide && (wide.city || wide.country)) return wide;
  } catch (_) { /* fall through to caller's nearby-cluster fallback */ }
  return null;
}

module.exports = async (req, res) => {
  try {
    const all = [];
    const maxPages = 30; // see insights.js — 8 was truncating older history
    for (let page = 1; page <= maxPages; page++) {
      const batch = await stravaGet(`/athlete/activities?per_page=200&page=${page}`);
      if (!batch.length) break;
      all.push(...batch);
      if (batch.length < 200) break;
    }

    const runs = all.filter(a => (a.sport_type === "Run" || a.sport_type === "VirtualRun") && a.start_latlng && a.start_latlng.length === 2);

    const rawClusters = {};
    for (const r of runs) {
      const [lat, lng] = r.start_latlng;
      const key = `${Math.round(lat / 0.05) * 0.05},${Math.round(lng / 0.05) * 0.05}`;
      if (!rawClusters[key]) rawClusters[key] = { latSum: 0, lngSum: 0, n: 0, km: 0 };
      rawClusters[key].latSum += lat;
      rawClusters[key].lngSum += lng;
      rawClusters[key].n += 1;
      rawClusters[key].km += r.distance / 1000;
    }

    const rawClusterList = Object.values(rawClusters)
      .map(c => ({ lat: c.latSum / c.n, lng: c.lngSum / c.n, km: c.km, count: c.n }))
      .sort((a, b) => b.km - a.km);

    // Pre-merge grid cells that are near each other (same metro area, just
    // split by the 5km grid) BEFORE spending any geocoding calls — a big
    // city like São Paulo can span many grid cells, and without this step
    // a small candidate count gets "used up" on several pieces of the same
    // city before ever reaching smaller, more distant ones.
    const PRE_MERGE_KM = 25;
    const superClusters = [];
    for (const c of rawClusterList) {
      const near = superClusters.find(s => haversineKm(c.lat, c.lng, s.lat, s.lng) <= PRE_MERGE_KM);
      if (near) {
        const totalKm = near.km + c.km;
        near.lat = (near.lat * near.km + c.lat * c.km) / totalKm;
        near.lng = (near.lng * near.km + c.lng * c.km) / totalKm;
        near.km += c.km;
        near.count += c.count;
      } else {
        superClusters.push({ ...c });
      }
    }

    const candidateClusters = superClusters
      .sort((a, b) => b.km - a.km)
      .map(c => ({ ...c, km: Math.round(c.km) }))
      .slice(0, 10);

    const merged = {};
    const unresolved = [];
    for (const c of candidateClusters) {
      const geo = await reverseGeocode(c.lat, c.lng);
      if (geo && (geo.city || geo.country)) {
        const cityName = geo.city || geo.country;
        const key = `${cityName}|${geo.country}`;
        if (!merged[key]) merged[key] = { city: cityName, country: geo.country, countryCode: geo.countryCode, km: 0, count: 0, lat: c.lat, lng: c.lng };
        merged[key].km += c.km;
        merged[key].count += c.count;
      } else {
        unresolved.push(c);
      }
      await sleep(1100);
    }

    // Last resort for anything that never resolved: if it's within 20km of
    // a cluster that DID resolve, it's almost certainly the same metro area
    // just split by the grid — fold it in there rather than ever showing
    // raw coordinates on the site.
    for (const c of unresolved) {
      const nearby = Object.values(merged).sort((a, b) =>
        haversineKm(c.lat, c.lng, a.lat, a.lng) - haversineKm(c.lat, c.lng, b.lat, b.lng)
      )[0];
      if (nearby && haversineKm(c.lat, c.lng, nearby.lat, nearby.lng) <= 20) {
        const key = `${nearby.city}|${nearby.country}`;
        merged[key].km += c.km;
        merged[key].count += c.count;
      } else {
        // Genuinely isolated AND unresolvable — extremely rare. Better to
        // drop it from the ranking than show raw coordinates on the site.
      }
    }

    const cities = Object.values(merged).sort((a, b) => b.km - a.km).slice(0, 5);

    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    res.status(200).json(cities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
