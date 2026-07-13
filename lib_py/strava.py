# lib_py/strava.py
# Python port of lib/strava.js — handles Strava OAuth token refresh and
# authenticated requests. Uses the same STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET
# / STRAVA_REFRESH_TOKEN env vars already configured for the Node backend.

import os
import time
import requests

_cached_token = None
_cached_expiry = 0


def get_access_token():
    global _cached_token, _cached_expiry
    now = int(time.time())
    if _cached_token and now < _cached_expiry - 60:
        return _cached_token

    res = requests.post(
        "https://www.strava.com/oauth/token",
        json={
            "client_id": os.environ.get("STRAVA_CLIENT_ID"),
            "client_secret": os.environ.get("STRAVA_CLIENT_SECRET"),
            "grant_type": "refresh_token",
            "refresh_token": os.environ.get("STRAVA_REFRESH_TOKEN"),
        },
    )
    if not res.ok:
        raise RuntimeError(f"Failed to refresh Strava token: {res.status_code} {res.text}")

    data = res.json()
    _cached_token = data["access_token"]
    _cached_expiry = data["expires_at"]
    # NOTE: same caveat as the Node client — Strava may rotate the refresh
    # token; persist data["refresh_token"] somewhere durable for production use.
    return _cached_token


def strava_get(path, params=None):
    token = get_access_token()
    res = requests.get(
        f"https://www.strava.com/api/v3{path}",
        headers={"Authorization": f"Bearer {token}"},
        params=params or {},
    )
    if not res.ok:
        raise RuntimeError(f"Strava API {path} -> {res.status_code} {res.text}")
    return res.json()
