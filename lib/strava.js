// lib/strava.js
// Handles token refresh and authenticated requests to the Strava API.
// Strava access tokens expire every 6h — this refreshes on every cold start
// using the long-lived refresh token stored in env vars.

let cachedToken = null;
let cachedExpiry = 0;

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedExpiry - 60) {
    return cachedToken;
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: process.env.STRAVA_REFRESH_TOKEN
    })
  });

  if (!res.ok) {
    throw new Error(`Falha ao renovar token Strava: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedExpiry = data.expires_at;

  // NOTE: Strava may rotate the refresh_token. In production, persist
  // data.refresh_token somewhere durable (Vercel KV, a small DB, etc.)
  // instead of relying solely on the static env var. See README.

  return cachedToken;
}

async function stravaGet(path) {
  const token = await getAccessToken();
  const res = await fetch(`https://www.strava.com/api/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Strava API ${path} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

module.exports = { getAccessToken, stravaGet };
