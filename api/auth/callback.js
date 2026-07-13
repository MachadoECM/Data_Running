// api/auth/callback.js
// One-time-use route: after you authorize the app on Strava, it redirects
// here with a `code`. This exchanges it for a refresh_token, which you then
// copy into your STRAVA_REFRESH_TOKEN env var. You can delete/disable this
// route after setup if you want.

module.exports = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("Faltando ?code — inicie o fluxo em /api/auth/login");
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code"
    })
  });

  const data = await tokenRes.json();

  if (!tokenRes.ok) {
    return res.status(500).json(data);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`
    <pre style="font-family:monospace; padding:24px; line-height:1.6;">
Autorizado com sucesso.

Copie o valor abaixo para a variável de ambiente STRAVA_REFRESH_TOKEN
no painel da Vercel (Project Settings -> Environment Variables),
depois faça um redeploy.

STRAVA_REFRESH_TOKEN=${data.refresh_token}

Atleta: ${data.athlete?.firstname} ${data.athlete?.lastname}
Escopo concedido: ${req.query.scope || "(verifique no painel do app Strava)"}
    </pre>
  `);
};
