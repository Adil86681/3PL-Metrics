// Vercel Serverless Function: Proxy GraphQL requests to Firstbase API
// Handles OAuth2 token refresh automatically

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 30000) {
    return cachedToken;
  }

  const clientId = process.env.FIRSTBASE_CLIENT_ID;
  const clientSecret = process.env.FIRSTBASE_CLIENT_SECRET;
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
    throw new Error(`Token request failed (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = await getToken();
    const { query, variables } = req.body;

    const resp = await fetch("https://api.firstbasehq.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res
        .status(resp.status)
        .json({ error: `Firstbase API error: ${text}` });
    }

    const data = await resp.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("[api/graphql] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
