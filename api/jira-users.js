// Vercel Serverless Function: Search Jira users for assignee field
// Uses the user picker API to find users by name/email

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query, email, token } = req.body;

    const siteUrl = process.env.JIRA_SITE_URL || "https://appdirect.jira.com";
    const jiraEmail = email || process.env.JIRA_EMAIL;
    const jiraToken = token || process.env.JIRA_API_TOKEN;

    if (!jiraEmail || !jiraToken) {
      return res.status(400).json({ error: "Jira credentials required" });
    }

    if (!query || query.length < 2) {
      return res.status(200).json({ users: [] });
    }

    const basic = Buffer.from(`${jiraEmail}:${jiraToken}`).toString("base64");

    // Use the user search/assignable endpoint for the COT project
    const searchUrl = `${siteUrl}/rest/api/3/user/assignable/search?project=COT&query=${encodeURIComponent(query)}&maxResults=10`;

    const resp = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: `User search failed: ${text}` });
    }

    const data = await resp.json();

    // Return simplified user list
    const users = data.map((u) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      email: u.emailAddress || "",
      avatarUrl: u.avatarUrls ? u.avatarUrls["24x24"] : "",
    }));

    return res.status(200).json({ users });
  } catch (err) {
    console.error("[api/jira-users] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
