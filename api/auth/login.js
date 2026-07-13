// api/auth/login.js
// Visit /api/auth/login once to authorize the app and land on the callback
// route, which gives you the refresh_token to put in your env vars.

module.exports = (req, res) => {
  const redirectUri = `https://${req.headers.host}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all,profile:read_all"
  });
  res.writeHead(302, { Location: `https://www.strava.com/oauth/authorize?${params}` });
  res.end();
};
