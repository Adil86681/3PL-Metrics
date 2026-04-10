// Vercel Serverless Function: Verify Firstbase API credentials are configured and working

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const clientId = process.env.FIRSTBASE_CLIENT_ID;
  const clientSecret = process.env.FIRSTBASE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(200).json({
      ok: false,
      error: "FIRSTBASE_CLIENT_ID and FIRSTBASE_CLIENT_SECRET env vars not set",
    });
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const resp = await fetch(
      "https://auth.firstbasehq.com/oauth2/default/v1/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`,
        },
        body: "grant_type=client_credentials&scope=firstbase:m2m:read-only",
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(200).json({
        ok: false,
        error: `Token exchange failed (${resp.status}): ${text}`,
      });
    }

    const data = await resp.json();
    return res.status(200).json({
      ok: true,
      expiresIn: data.expires_in,
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      error: err.message,
    });
  }
}
