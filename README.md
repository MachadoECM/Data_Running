# Data × Running

I'm a Data Scientist and a marathon runner, and I got tired of my training data just sitting
inside the Strava app doing nothing. So I built this: a personal dashboard that connects
live to my Strava account and turns years of running into something I can actually learn
from — and a machine learning model that predicts my race times based on my own data,
instead of a generic calculator.

**Live site:** https://everson-data-running.vercel.app

## What's on the dashboard

Everything here is pulled live from my Strava account — no spreadsheets, no manual exports,
no copy-pasting numbers. Open the site and it's always current.

- **Lifetime stats** — total distance, total runs, hours moving, this year's mileage
- **Weekly volume** — my last 8 weeks of training, at a glance
- **Personal records** — 5K through marathon, with the full stats card for each (pace,
  time, elevation, calories, heart rate) pulled straight from that actual race
- **Shoe rotation** — how many km are on each pair, active and retired
- **Training patterns** — which days I run most, what time of day, how my pace and heart
  rate are distributed, indoor vs. outdoor
- **Heart rate zones** — how much time I spend in each zone, and which ones I train in most
- **Map of the cities I've run in** — clustered and geocoded from my actual GPS data
- **A full year-by-year "progression" heatmap** — every single day, going back to when I
  started logging on Strava
- **Recent activities**, filterable by period, with a breakdown by activity type

## The part I'm most proud of: a real prediction model

The dashboard tells me what I *did*. I wanted something that could also tell me what I'm
*capable of* — so I built a Race Time Predictor: given my own personal bests, it estimates
what I could realistically run for a 5K, 10K, half marathon, or marathon right now.

I built this the way I'd approach any real data science problem, not just a quick script:

1. **Problem** — race-time calculators you find online assume every runner slows down over
   distance at exactly the same rate. That's a decent baseline, but it ignores that
   endurance, training history, and current fitness are different for everyone.
2. **Approach** — instead of using a fixed formula, I fit the fatigue curve directly from
   my own race results, using log-log linear regression on the classic Riegel relationship
   (`time = a × distance^b`). The exponent `b` — how much I slow down as distance increases —
   comes from *my* data, not an assumption.
3. **Adjustment for current fitness** — the raw curve is fit through my personal bests,
   which are best-case performances by definition. I layer a "recent form" factor on top
   (comparing my last 45 days of training pace to my all-time average) plus a small
   distance-scaled "reality margin," so the prediction reflects a realistic race outcome,
   not an assumption that I'll repeat my all-time best every single time.
4. **Evaluation** — I validated the model with leave-one-out cross-validation (refitting
   the curve with one PR held out at a time, to see how well it predicts data it hasn't
   seen) and report Mean Absolute Error, Mean Absolute Percentage Error, and R² — not just
   "trust me," actual numbers.
5. **Why not something fancier?** — with only a handful of race results to learn from, a
   simple, interpretable regression model is both more robust and easier to explain than a
   neural network would be. Picking the simplest model that solves the problem well is a
   real data science principle, not a limitation.

I wrote all of this up properly on a dedicated **Model Lab** page on the site
(`/ml.html`) — the problem statement, the assumptions, the model, the evaluation metrics,
the limitations, and what I'd improve next. It's built to be read like an actual project
write-up, not just a footnote.

**Built in Python**, using:
- **numpy** for the numerical work
- **scikit-learn** — `LinearRegression` to fit the curve, `LeaveOneOut` for cross-validation
- **requests** to talk to the Strava API

It runs as its own serverless function (`api/predict.py`) right alongside the rest of the
site's Node.js backend — Vercel supports both in the same project.

## How it's built

- **Frontend**: plain HTML/CSS/JavaScript, no framework. All the charts are hand-drawn SVG.
- **Backend**: serverless functions on Vercel — most of it in Node.js, the prediction model
  in Python.
- **Data source**: the Strava API, authenticated via OAuth, refreshed automatically.
- **Hosting**: Vercel, free tier.

```
index.html, ml.html      the two pages
style.css                shared design
app.js, ml-page.js       frontend logic (data fetching + rendering)
theme.js                 dark/light mode toggle

api/                     Node.js endpoints — stats, activities, weekly volume,
                          personal records, gear, full-history insights, city map
api/predict.py           the Python prediction model
lib/, lib_py/            shared helpers (Strava client, the model math)
data/                    a few small seed files for data Strava's API doesn't expose
```

## Setting it up yourself

If you want to run your own version of this:

1. **Create a Strava app** at strava.com/settings/api, and note the Client ID/Secret.
2. **Deploy to Vercel**: `vercel` from inside this folder.
3. **Add your Strava credentials** as environment variables in the Vercel dashboard.
4. **Authorize once**: visit `/api/auth/login` on your deployed site, approve access, and
   copy the refresh token it gives you back into the environment variables.
5. Redeploy, and the dashboard should populate with your own data.

Full technical details, including a few known limitations (Strava doesn't expose weather or
lifetime PRs through its public API, for example), are in `SETUP.md`.
