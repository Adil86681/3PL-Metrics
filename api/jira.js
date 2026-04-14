/**
 * Vercel Serverless Function — /api/jira
 *
 * Proxies Jira ticket creation requests.
 * Client sends Jira email + API token; this function forwards to Jira Cloud API.
 */

const JIRA_BASE = 'https://appdirect.atlassian.net/rest/api/3';
const JIRA_PROJECT_KEY = 'COT'; // Change if different

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { summary, description, labels, assigneeId, email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'Jira credentials required' });
    }
    if (!summary) {
      return res.status(400).json({ error: 'Summary is required' });
    }

    const auth = Buffer.from(email + ':' + token).toString('base64');

    const issueBody = {
      fields: {
        project: { key: JIRA_PROJECT_KEY },
        summary: summary,
        issuetype: { name: 'Task' },
        labels: labels || []
      }
    };

    if (description) {
      issueBody.fields.description = {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: description }]
        }]
      };
    }

    if (assigneeId) {
      issueBody.fields.assignee = { accountId: assigneeId };
    }

    const apiRes = await fetch(JIRA_BASE + '/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + auth
      },
      body: JSON.stringify(issueBody)
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      const errMsg = data.errorMessages ? data.errorMessages.join('; ') : JSON.stringify(data.errors || data);
      return res.status(apiRes.status).json({ error: errMsg });
    }

    return res.status(200).json({
      key: data.key,
      url: 'https://appdirect.atlassian.net/browse/' + data.key
    });
  } catch (err) {
    console.error('[api/jira] Error:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
};
