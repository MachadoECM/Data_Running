# split. — personal running dashboard (Strava)

Static site + serverless functions that pull your data **directly from the Strava API**:
lifetime totals (since your very first activity), weekly volume, recent runs, and the
route of your last run drawn from the real GPS stream.

## Why "lifetime totals" instead of a list of every activity?

Strava has a dedicated endpoint — `GET /athletes/{id}/stats` — that returns distance and
run count **since account creation** in a single call. That's what `api/stats.js` uses. We
don't need to (and shouldn't) paginate through thousands of activities every time the home
page loads — that would be slow and unnecessary.

## Structure

```
index.html        single, minimalist page
style.css
app.js             fetches /api/stats, /api/activities, /api/weekly, /api/route
                    and falls back to sample data if the backend doesn't respond
api/
  stats.js         lifetime + year-to-date totals (GET /athletes/{id}/stats)
  activities.js    every activity since Jan 1st of the current year (paginated) — feeds
                   both the recent-activities table AND the pie chart, with period
                   filtering (7 days / last week / month / year) done client-side
  weekly.js        aggregates the last ~9 weeks into km/week (running) + time by
                   activity type for the current week, for the pie chart
  insights.js      full history: weekdays, average pace, summary by activity type,
                   and the daily progression (GitHub-style heatmap) by year
  prs.js           personal records (400m through marathon)
  gear.js          active and retired shoes (accumulated km), with client-side filtering
  mapdata.js       the city you run in most (clustering + Nominatim), no routes/tracks
  auth/login.js    starts the Strava OAuth flow
  auth/callback.js receives the code and returns the refresh_token
lib/strava.js       token refresh + HTTP client
```

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

Open the site — the top cards, the weekly chart, the runs table, and the route should all
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
  thresholds were copied once from your account and live in that JSON. Update it manually
  if your half-marathon reference time changes.
- **`api/insights.js`**: paginates up to 6,000 activities (30 pages of 200) to cover your
  entire history — this cap used to be 1,600 (8 pages) and was truncating very old
  activities (e.g. early 2022) because Strava paginates from newest to oldest; if your
  account keeps growing a lot, raise `maxPages` in the file.
- **QR code**: generated in the browser via an external library (cdnjs). Works normally on
  the deployed site (which has internet), but may not render in a fully offline preview —
  the link below the QR always works as a fallback.
- **Rate limits**: Strava's API caps out at 200 requests/15min and 2,000/day per app. The
  "heaviest" routes are `prs.js` (fetches detail for up to 8 activities) and `insights.js`
  (up to 30 pages of listings) — the 24h `Cache-Control` on each helps a lot.

## Maps (MapLibre + OpenStreetMap — free, no token)

Two maps on the site, both using **MapLibre GL** (open-source fork of Mapbox GL JS) + a
free CARTO style, no account or API key required:

1. **PR stats** (right below "Personal records") — click on 5K/10K/15K/10 mile/half/30K/
   marathon to see distance, average pace, moving time, elevation, calories, and average HR
   for that run (real data in `data/prs-seed.json`, copied from Strava's share cards).
   **Updates itself**: since `api/prs.js` already fetches the full detail of every candidate
   activity during its scan, a new PR within that window automatically overwrites both the
   time and these stats — no manual editing needed.
2. **Top 5 cities I've run in** — clusters your entire running history by approximate
   location (~5km grid), reverse-geocodes each cluster via Nominatim (OpenStreetMap, free)
   — grabbing city **and** country — and **merges clusters that resolve to the same
   city+country** before ranking — without this, a big city like São Paulo would show up
   split into several different "places," and distant clusters that geocode to the same
   name (e.g. two neighborhoods of a small town) would show up as duplicates. For small or
   unusual locations (e.g. islands like Curaçao) where Nominatim doesn't populate the
   standard "city" field, there's a fallback chain (municipality → island → state) so it
   never falls back to raw coordinates. The little flag next to the name comes from the
   `country_code` (ISO 3166-1) Nominatim returns, converted to a flag emoji on the
   front-end — more reliable than trying to map the country name as text.

**Nominatim usage limit**: max 1 request/second. Since we geocode up to 10 raw clusters
before merging (to comfortably end up with at least 5 distinct cities afterward), this adds
roughly 11 seconds to `api/mapdata.js`'s response (with a `sleep` between calls). This is
cached for 24h (`Cache-Control`), so it doesn't repeat on every visit — but if the Vercel
function times out, lower the `.slice(0, 10)` in the file.

## Browser cache (important when editing)

`index.html` references `style.css?v=3` and `app.js?v=3` — that `?v=` only exists to force
the browser to fetch the new version after a redeploy. **Whenever you edit `style.css` or
`app.js`, bump that number in `index.html`** (`v=4`, `v=5`...), or a returning visitor's
browser may keep using an old cached copy even after `vercel --prod`.

## Machine learning features

One from-scratch ML feature, implemented in **Python** (`lib_py/ml.py`, `api/predict.py`) using
numpy + scikit-learn — the site's only language-agnostic serverless function, running
alongside the Node.js backend on Vercel (auto-detected via `requirements.txt`). Both the
dashboard and the Model Lab page fetch results from this single endpoint, so there's one
canonical implementation, not a JS/Python comparison.

1. **Race time predictor** — personalized Riegel-style power-law fit (`time = a * distance^b`)
   via log-log linear regression (`sklearn.linear_model.LinearRegression`) on the athlete's
   own PR distances, adjusted by a recent-form factor (last 45 days' avg pace vs. all-time avg
   pace, clamped to ±8%). Evaluated via leave-one-out cross-validation
   (`sklearn.model_selection.LeaveOneOut`) — Mean Absolute Error, Mean Absolute Percentage
   Error, and R² are all reported on the Model Lab page.

Limitations worth knowing:
- The race predictor needs at least 3 of the athlete's PR distances to fit a curve.

**Note**: a workout-type auto-classification model (k-means clustering on pace, duration,
speed burst, and heart rate) was built, tuned across several iterations (feature selection,
k-means++ init, multi-restart, robust scaling), and ultimately removed — it never reliably
matched the athlete's real training structure well enough to keep on the site. `lib/ml.js`
was trimmed back down to just what the race predictor needs.

## Model Lab page (ml.html)

A separate page, linked from the dashboard header ("Model Lab"), with a deeper technical
write-up of the ML feature — the math, the reasoning, small pseudocode blocks — following a
CRISP-DM-style structure (Problem, Why is it difficult, Model, Results, Model Evaluation,
Limitations, Future Improvements, Business Impact, Lessons Learned). It pulls the same live
`/api/predict` results shown on the dashboard, so the numbers always match.

Files involved:
- `ml.html` — the page itself, using the same design system as the dashboard
- `ml-page.js` — small script just for this page (separate from `app.js` on purpose, since
  `app.js` assumes dashboard-only elements exist and would throw errors here)
- `theme.js` — the dark/light toggle logic, extracted out of `app.js` since both pages need it

## Python: the race predictor's implementation

The rest of the backend runs on Node.js, but Vercel also supports Python serverless
functions in the same project — so `api/predict.py` implements the race-prediction model
(`lib_py/ml.py`) using **numpy + scikit-learn**. Both the dashboard (`index.html`/`app.js`)
and the Model Lab page (`ml.html`/`ml-page.js`) fetch this single endpoint for the Race
Time Predictor — there's no separate JS implementation of this model anymore, so the two
pages always show the same numbers.

Setup:
- `requirements.txt` at the project root lists `numpy`, `scikit-learn`, `requests` — Vercel
  auto-detects this and builds the Python runtime alongside the Node functions, no extra
  config needed.
- `lib_py/strava.py` is a Python port of `lib/strava.js`'s OAuth token refresh, using the
  same `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` / `STRAVA_REFRESH_TOKEN` env vars already
  configured — nothing new to set up.
- `api/predict.py` computes its own recent-form factor via a lightweight 180-day activity
  fetch (not the full-history scan `api/insights.js` does), since that's all the form-factor
  calculation needs.

## Custom domain

To switch from `split-strava.vercel.app` to something like `everson-data-running.vercel.app`
(a free Vercel subdomain):

1. Go to https://vercel.com/everson-cardozo/split-strava/settings/domains
2. Under **Add Domain**, type `everson-data-running.vercel.app` and confirm
3. Done — the site now also responds at that address (the old one keeps working too)

If you'd rather use a real domain (e.g. `eversoncardozo.run`), you need to register it
first with a service like Namecheap, GoDaddy, or Registro.br, then add it the same way
under the Domains tab — Vercel will show you the DNS records to point at from your
registrar.

## Running stats (charts)

Inspired by the "Statistics" page of the reference site. Everything is drawn in pure SVG
(no charting library), using data from `api/insights.js`:

- Annual distance, activity by time of day (polar radar), average distance by weekday
  (radar), distance distribution, indoor vs. outdoor (uses Strava's `trainer` field), pace
  distribution, heart rate zones, pace vs. HR (scatter)
- **Not included**: temperature and weather conditions — same limitation noted above
  (Strava's API doesn't expose this)
- HR only shows up in charts for activities with `has_heartrate: true` (a connected monitor)

## Running locally

```bash
vercel dev
```

This simulates the serverless functions locally at `http://localhost:3000`.
