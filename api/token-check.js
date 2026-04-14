/**
 * Vercel Serverless Function — /api/token-check
 *
 * Verifies that the OAuth token can be obtained successfully.
 */

const AUTH_TOKEN_URL = 'https://auth.firstbasehq.com/oauth2/default/v1/token';
const AUTH_BASIC     = 'Basic MG9hdTA0ajNic3ZlNnZwanc1ZDc6TWl3RTBtU3g5TWlDRFQ1c2M5TlJDZktNMnN2SjBkZ0dZUWxqQTc3ZHhkNUNuZU0tSnpmSF9PS1c2b1AzZk1HSQ==';
const AUTH_SCOPE     = 'firstbase:service-accounts';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const tokenRes = await fetch(AUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': AUTH_BASIC
      },
      body: 'grant_type=client_credentials&scope=' + encodeURIComponent(AUTH_SCOPE)
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      return res.status(200).json({ ok: false, error: 'Token failed (' + tokenRes.status + '): ' + errBody });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/token-check] Error:', err);
    return res.status(200).json({ ok: false, error: String(err.message || err) });
  }
};
