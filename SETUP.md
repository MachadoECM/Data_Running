# Setup & technical notes

Deeper technical reference for maintaining this project — full setup steps, known
limitations, and implementation notes that don't belong in the main README's project
overview.

## Step-by-step setup

### 1. Create the Strava app

1. Go to https://www.strava.com/settings/api
2. Create an app (any name/icon). Under **Authorization Callback Domain**, put the domain
   you'll deploy to (e.g. `split-everson.vercel.app`) — without `https://`.
3. Note down the `Client ID` and `Client Secret`.

### 2. Deploy to Vercel

```bash
npm install -g vercel   # if you don't already have it
cd site
vercel                  # follow the prompts, accept the defaults
```

This deploys both the frontend and the functions under `/api`. Note the generated URL
(e.g. `https://split-everson.vercel.app`).

### 3. Set the environment variables

In the Vercel dashboard → your project → **Settings → Environment Variables**, add:

```
STRAVA_CLIENT_ID=<from step 1>
STRAVA_CLIENT_SECRET=<from step 1>
```

Redeploy (`vercel --prod`) so the variables become available.

### 4. Authorize your account (one-time)

Visit `https://YOUR-DOMAIN/api/auth/login`, approve access on Strava. The callback page
will show you a `STRAVA_REFRESH_TOKEN`. Copy that value, paste it into Vercel's
environment variables too, and do one final `vercel --prod`.

### 5. Done

Open the site — the top cards, the weekly chart, the runs table, and the map should all
load with your real data. The dot next to your name turns green when the data is live
(and yellow if it falls back to sample mode, which happens if the env vars aren't set).

## Known limitations / next steps

- **refresh_token rotation**: Strava may issue a new `refresh_token` on every renewal. For
  personal use (a handful of renewals a day) this rarely causes an issue, but for real
  robustness, swap the env-var storage for something persistent and writable at runtime —
  Vercel KV, Upstash Redis, or even a file in an S3/Supabase bucket. `lib/strava.js` already
  has a comment marking where to plug that in.
- **PRs (`api/prs.js`)**: Strava doesn't expose a "lifetime best marks" endpoint (the table
  you see on your profile at strava.com). That's why `data/prs-seed.json` stores those real
  values (copied from there once), and the route only overwrites a distance if it finds a
  faster recent run — so a new PR is detected automatically, but the baseline is always
  real data. To resync after a race, just update that JSON with the current values from
  your profile's "Best Efforts" page.
- **Weather**: Strava's public API doesn't expose weather conditions per activity — that
  data only exists inside their own app, it isn't released to third-party apps. To get
  this, you'd need to integrate a separate historical-weather API (e.g. Open-Meteo, Visual
  Crossing) by cross-referencing each run's coordinates + date/time — not included here.
- **Pace zones (`data/pace-zones-seed.json`)**: same limitation as PRs — Strava's public
  API doesn't expose running pace zones (only `heart_rate` and `power`). The 6 pace
  thresholds were copied once from the account and live in that JSON. Update it manually
  if the half-marathon reference time changes.
- **`api/insights.js`**: paginates up to 6,000 activities (30 pages of 200) to cover the
  entire history — this cap used to be 1,600 (8 pages) and was truncating very old
  activities because Strava paginates from newest to oldest; if the account keeps growing
  a lot, raise `maxPages` in the file.
- **QR code**: generated in the browser via an external library (cdnjs). Works normally on
  the deployed site (which has internet), but may not render in a fully offline preview —
  the link below the QR always works as a fallback.
- **Rate limits**: Strava's API caps out at 200 requests/15min and 2,000/day per app. The
  "heaviest" routes are `prs.js` (fetches detail for up to 8 activities) and `insights.js`
  (up to 30 pages of listings) — the multi-hour `Cache-Control` on each helps a lot.

## Maps (MapLibre + OpenStreetMap — free, no token)

Two maps on the site, both using **MapLibre GL** (open-source fork of Mapbox GL JS) + a
free CARTO style, no account or API key required:

1. **PR stats** (right below "Personal records") — click on 5K/10K/15K/10 mile/half/30K/
   marathon to see distance, average pace, moving time, elevation, calories, and average HR
   for that run (real data in `data/prs-seed.json`, copied from Strava's share cards).
   **Updates itself**: since `api/prs.js` already fetches the full detail of every candidate
   activity during its scan, a new PR within that window automatically overwrites both the
   time and these stats — no manual editing needed.
2. **Top 5 cities I've run in** — clusters the entire running history by approximate
   location (~5km grid), pre-merges clusters within ~25km of each other (so a big city
   doesn't eat up multiple candidate slots), reverse-geocodes each via Nominatim
   (OpenStreetMap, free) — grabbing city **and** country — with retries and a proximity
   fallback for anything that fails to geocode, so it never falls back to showing raw
   coordinates.

**Nominatim usage limit**: max 1 request/second. Since we geocode up to 10 pre-merged
clusters, this adds roughly 11 seconds to `api/mapdata.js`'s response on a cache miss. This
is cached for 24h, so it doesn't repeat on every visit — but if the Vercel function times
out, lower the `.slice(0, 10)` in the file.

## Browser cache (important when editing)

`index.html` and `ml.html` reference `style.css?v=N` and `app.js?v=N` — that `?v=` exists
only to force the browser to fetch the new version after a redeploy. **Whenever you edit
`style.css`, `app.js`, or `ml-page.js`, bump that number** in the HTML files, or a returning
visitor's browser may keep using an old cached copy even after `vercel --prod`.

## Running stats (charts)

Everything is drawn in pure SVG (no charting library), using data from `api/insights.js`:
annual distance, activity by time of day (polar radar), average distance by weekday
(radar), distance distribution, pace distribution, heart rate zones, pace zones, and
running vs. strength vs. workout time by year. Heart rate only shows up in charts for
activities with `has_heartrate: true` (a connected monitor).

## Running locally

```bash
vercel dev
```

This simulates the serverless functions locally at `http://localhost:3000`.
