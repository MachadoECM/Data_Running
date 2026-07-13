# api/predict.py
# Python re-implementation of the "ML #1" block in api/insights.js — the
# same personalized Riegel power-law model, same PR seed data, same
# leave-one-out cross-validation — but using numpy + scikit-learn instead
# of hand-rolled JavaScript. Built to compare side by side with the
# original, not to replace it.
#
# Deployed automatically by Vercel's Python runtime (detected by
# requirements.txt at the project root) alongside the existing Node
# functions — no extra configuration needed.

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from lib_py.strava import strava_get
from lib_py.ml import power_law_fit, predict_time, loocv_power_law, mean

DISTANCE_KM = {
    "5k": 5, "10k": 10, "15k": 15, "10 mile": 16.0934, "20k": 20,
    "Half-Marathon": 21.0975, "30k": 30, "Marathon": 42.195,
}

TARGETS = [
    {"key": "5k", "label": "5K", "km": 5, "margin_pct": 0.02},
    {"key": "10k", "label": "10K", "km": 10, "margin_pct": 0.03},
    {"key": "Half-Marathon", "label": "Half Marathon", "km": 21.0975, "margin_pct": 0.05},
    {"key": "Marathon", "label": "Marathon", "km": 42.195, "margin_pct": 0.08},
]


def load_pr_points():
    seed_path = os.path.join(os.path.dirname(__file__), "..", "data", "prs-seed.json")
    with open(seed_path) as f:
        seed = json.load(f)
    seconds = seed.get("seconds", {})
    return [(DISTANCE_KM[k], sec) for k, sec in seconds.items() if k in DISTANCE_KM]


def compute_form_factor():
    """Same as insights.js: last-45-days avg pace vs all-time avg pace,
    clamped to +/-8%. Uses a cheap time-windowed fetch (not the full
    history scan) since only recent runs matter here.
    """
    cutoff_180 = int((datetime.now(timezone.utc) - timedelta(days=180)).timestamp())
    activities = strava_get("/athlete/activities", {"after": cutoff_180, "per_page": 200})
    runs = [a for a in activities if a.get("sport_type") in ("Run", "VirtualRun")
            and a.get("distance", 0) > 0 and a.get("moving_time", 0) > 0]

    cutoff_45 = datetime.now(timezone.utc) - timedelta(days=45)
    recent_runs = [r for r in runs if datetime.fromisoformat(r["start_date_local"].replace("Z", "+00:00")) >= cutoff_45]

    if len(recent_runs) < 3:
        return 1.0

    recent_paces = [r["moving_time"] / (r["distance"] / 1000) for r in recent_runs]
    all_paces = [r["moving_time"] / (r["distance"] / 1000) for r in runs]
    recent_pace = mean(recent_paces)
    overall_pace = mean(all_paces)
    return max(0.92, min(1.08, recent_pace / overall_pace))


def build_prediction():
    pr_points = load_pr_points()
    if len(pr_points) < 3:
        return None

    a, b, r2 = power_law_fit(pr_points)
    form_factor = compute_form_factor()
    cv = loocv_power_law(pr_points)

    predictions = []
    for t in TARGETS:
        seconds = predict_time(a, b, t["km"]) * form_factor * (1 + t["margin_pct"])
        predictions.append({"label": t["label"], "seconds": round(seconds)})

    return {
        "exponent": round(b, 3),
        "r2": round(r2, 3),
        "formFactor": round(form_factor, 3),
        "trainingPoints": len(pr_points),
        "maeSeconds": cv["maeSeconds"] if cv else None,
        "mapePct": cv["mapePct"] if cv else None,
        "predictions": predictions,
        "runtime": "python",
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            result = build_prediction()
            body = json.dumps(result).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "s-maxage=3600, stale-while-revalidate")
            self.end_headers()
            self.wfile.write(body)
        except Exception as err:
            body = json.dumps({"error": str(err)}).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
