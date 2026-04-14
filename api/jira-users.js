/**
 * Vercel Serverless Function — /api/jira-users
 *
 * Proxies Jira user search for assignee lookup.
 * Client sends query + Jira email/token.
 */

const JIRA_BASE = 'https://appdirect.atlassian.net/rest/api/3';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'Jira credentials required' });
    }

    const auth = Buffer.from(email + ':' + token).toString('base64');

    const searchUrl = JIRA_BASE + '/user/search?query=' + encodeURIComponent(query || '') + '&maxResults=10';

    const apiRes = await fetch(searchUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + auth
      }
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: 'Jira user search failed' });
    }

    const users = data.map(function(u) {
      return {
        accountId: u.accountId,
        displayName: u.displayName,
        email: u.emailAddress || '',
        avatarUrl: u.avatarUrls ? u.avatarUrls['24x24'] : ''
      };
    });

    return res.status(200).json({ users: users });
  } catch (err) {
    console.error('[api/jira-users] Error:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
};
