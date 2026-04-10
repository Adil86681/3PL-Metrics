// Vercel Serverless Function: Create Jira tickets in COT project
// Accepts user credentials from request body (session-based auth)
// Falls back to env vars if not provided

export default async function handler(req, res) {
  // CORS headers
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
    const { summary, description, labels, assigneeId, email, token } = req.body;

    // Use request body credentials, fall back to env vars
    const siteUrl = process.env.JIRA_SITE_URL || "https://appdirect.jira.com";
    const jiraEmail = email || process.env.JIRA_EMAIL;
    const jiraToken = token || process.env.JIRA_API_TOKEN;

    if (!jiraEmail || !jiraToken) {
      return res.status(400).json({
        error: "Jira credentials required. Please provide your email and API token.",
      });
    }

    if (!summary) {
      return res.status(400).json({ error: "Summary is required" });
    }

    const basic = Buffer.from(`${jiraEmail}:${jiraToken}`).toString("base64");

    // Build the issue payload
    const issuePayload = {
      fields: {
        project: { key: "COT" },
        issuetype: { id: "3" }, // Task
        summary: summary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: description || "",
                },
              ],
            },
          ],
        },
      },
    };

    // Add labels if provided
    if (labels && Array.isArray(labels) && labels.length > 0) {
      issuePayload.fields.labels = labels;
    }

    // Add assignee if provided
    if (assigneeId) {
      issuePayload.fields.assignee = { accountId: assigneeId };
    }

    const resp = await fetch(`${siteUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
      },
      body: JSON.stringify(issuePayload),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("[api/jira] Jira API error:", JSON.stringify(data));
      return res.status(resp.status).json({
        error: data.errors
          ? Object.values(data.errors).join(", ")
          : data.errorMessages
          ? data.errorMessages.join(", ")
          : "Jira API error",
        details: data,
      });
    }

    // Return the created issue key and URL
    return res.status(201).json({
      key: data.key,
      id: data.id,
      url: `${siteUrl}/browse/${data.key}`,
    });
  } catch (err) {
    console.error("[api/jira] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
