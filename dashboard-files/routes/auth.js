/**
 * routes/auth.js — Auth routes
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const h = require('../lib/helpers');
const st = require('../lib/state');

const router = Router();

// ═══ AUTH / OAUTH ═══
router.get('/api/profiles/:id/auth', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const settings = st.getSettings();
  const env = fs.existsSync(pp.envPath) ? h.readEnv(pp.envPath) : {};
  const hasApiKey = !!(env.OPENAI_API_KEY || settings.openaiApiKey);
  const hasOAuthToken = !!(env.OPENAI_OAUTH_TOKEN || env.OPENAI_CODEX_TOKEN || settings.openaiOAuthEnabled);
  const oauthExpiry = env.OPENAI_OAUTH_EXPIRY || env.OPENAI_CODEX_EXPIRY || settings.openaiOAuthExpiry || null;
  const envMethod = env.OPENAI_AUTH_METHOD || null;
  const method = envMethod || (hasOAuthToken ? 'codex-oauth' : (hasApiKey ? 'api-key' : 'none'));
  res.json({ method, hasApiKey, hasOAuthToken, oauthExpiry, oauthValid: hasOAuthToken && (!oauthExpiry || new Date(oauthExpiry) > new Date()), oauthConnectedAt: settings.openaiOAuthConnectedAt || null, openai: { oauthEnabled: hasOAuthToken, hasApiKey }, anthropic: { hasApiKey: !!settings.anthropicApiKey } });
});

const oauthSessions = {};
const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const CODEX_REDIRECT_URI = `http://localhost:${h.PORT}/oauth/callback`;
const CODEX_AUTH_ENDPOINT = 'https://auth.openai.com/oauth/authorize';
const CODEX_TOKEN_ENDPOINT = 'https://auth.openai.com/oauth/token';

router.post('/api/profiles/:id/auth/oauth/start', (req, res) => {
  const id = req.params.id;
  const clientId = req.body.clientId || st.getSettings().openaiOAuthClientId || CODEX_CLIENT_ID;
  const redirectUri = req.body.redirectUri || CODEX_REDIRECT_URI;
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(32).toString('hex');
  const authUrl = CODEX_AUTH_ENDPOINT + '?' + 'client_id=' + encodeURIComponent(clientId) + '&redirect_uri=' + encodeURIComponent(redirectUri) + '&response_type=code' + '&scope=' + encodeURIComponent('openid profile email offline_access') + '&code_challenge=' + codeChallenge + '&code_challenge_method=S256' + '&id_token_add_organizations=true' + '&state=' + state;
  oauthSessions[id] = { codeVerifier, clientId, redirectUri, state, startedAt: new Date().toISOString() };
  st.saveSettings({ openaiOAuthClientId: clientId, openaiOAuthLastState: state, openaiOAuthPkceVerifier: codeVerifier, openaiOAuthRedirectUri: redirectUri });
  res.json({ success: true, authUrl, state });
});

router.post('/api/profiles/:id/auth/oauth/complete', async (req, res) => {
  const id = req.params.id;
  const session = oauthSessions[id];
  if (!session) return res.status(400).json({ error: 'No active OAuth session — click Start first' });
  const { callbackUrl, code: directCode } = req.body;
  let code = directCode;
  if (!code && callbackUrl) { try { code = new URL(callbackUrl).searchParams.get('code'); } catch {} if (!code) { const m = callbackUrl.match(/[?&]code=([^&]+)/); if (m) code = m[1]; } }
  if (!code) return res.status(400).json({ error: 'Could not extract authorization code.' });
  try {
    const https = require('https');
    const tokenData = await new Promise((resolve, reject) => {
      const postData = new URLSearchParams({ grant_type: 'authorization_code', client_id: session.clientId, code, redirect_uri: session.redirectUri, code_verifier: session.codeVerifier }).toString();
      const req = https.request(CODEX_TOKEN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) } }, (resp) => {
        let body = ''; resp.on('data', c => body += c);
        resp.on('end', () => { try { const j = JSON.parse(body); if (j.error) reject(new Error(j.error_description || j.error)); else resolve(j); } catch { reject(new Error('Invalid response')); } });
      });
      req.on('error', reject); req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timed out')); }); req.write(postData); req.end();
    });
    // Save tokens
    const pp = st.profilePaths(id);
    if (fs.existsSync(pp.envPath)) {
      const env = h.readEnv(pp.envPath);
      if (tokenData.access_token) { env.OPENAI_OAUTH_TOKEN = tokenData.access_token; env.OPENAI_CODEX_TOKEN = tokenData.access_token; }
      if (tokenData.refresh_token) { env.OPENAI_OAUTH_REFRESH = tokenData.refresh_token; env.OPENAI_CODEX_REFRESH = tokenData.refresh_token; }
      if (tokenData.expires_in) { const exp = new Date(Date.now() + tokenData.expires_in * 1000).toISOString(); env.OPENAI_OAUTH_EXPIRY = exp; env.OPENAI_CODEX_EXPIRY = exp; }
      env.OPENAI_AUTH_METHOD = 'codex-oauth'; h.writeEnv(pp.envPath, env);
    }
    st.saveSettings({ openaiOAuthEnabled: true, openaiOAuthConnectedAt: new Date().toISOString() });
    // Save to ~/.codex/auth.json
    try { const codexDir = path.join(h.HOME, '.codex'); fs.mkdirSync(codexDir, { recursive: true }); fs.writeFileSync(path.join(codexDir, 'auth.json'), JSON.stringify({ access_token: tokenData.access_token, refresh_token: tokenData.refresh_token || '', id_token: tokenData.id_token || '', expires: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : 0 }, null, 2)); } catch {}
    delete oauthSessions[id];
    res.json({ success: true, message: 'OAuth connected! Tokens saved.', expiresIn: tokenData.expires_in });
  } catch (err) { res.status(400).json({ error: 'Token exchange failed: ' + err.message }); }
});

router.get('/api/profiles/:id/auth/oauth/status', (req, res) => { const s = oauthSessions[req.params.id]; res.json({ active: !!s, startedAt: s?.startedAt || null }); });
router.post('/api/profiles/:id/auth/oauth/manual', (req, res) => {
  const { accessToken, refreshToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: 'accessToken required' });
  const pp = st.profilePaths(req.params.id);
  if (fs.existsSync(pp.envPath)) {
    const env = h.readEnv(pp.envPath); env.OPENAI_OAUTH_TOKEN = accessToken; env.OPENAI_CODEX_TOKEN = accessToken;
    if (refreshToken) { env.OPENAI_OAUTH_REFRESH = refreshToken; env.OPENAI_CODEX_REFRESH = refreshToken; }
    env.OPENAI_AUTH_METHOD = 'codex-oauth'; h.writeEnv(pp.envPath, env);
  }
  st.saveSettings({ openaiOAuthEnabled: true });
  res.json({ success: true, message: 'Tokens saved.' });
});
router.post('/api/profiles/:id/auth/toggle', (req, res) => {
  const method = req.body?.method || 'api-key';
  const pp = st.profilePaths(req.params.id);
  if (fs.existsSync(pp.envPath)) { const env = h.readEnv(pp.envPath); env.OPENAI_AUTH_METHOD = method; h.writeEnv(pp.envPath, env); }
  st.saveSettings({ openaiOAuthEnabled: method === 'codex-oauth' });
  res.json({ success: true, message: `Auth mode switched to ${method}` });
});
router.post('/api/profiles/:id/auth/oauth/revoke', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  if (fs.existsSync(pp.envPath)) {
    const env = h.readEnv(pp.envPath);
    ['OPENAI_OAUTH_TOKEN', 'OPENAI_CODEX_TOKEN', 'OPENAI_OAUTH_REFRESH', 'OPENAI_CODEX_REFRESH', 'OPENAI_OAUTH_EXPIRY', 'OPENAI_CODEX_EXPIRY', 'OPENAI_AUTH_METHOD'].forEach(k => delete env[k]);
    h.writeEnv(pp.envPath, env);
  }
  st.saveSettings({ openaiOAuthEnabled: false, openaiOAuthConnectedAt: null });
  res.json({ success: true, message: 'OAuth revoked.' });
});
router.post('/api/profiles/:id/auth/oauth/share', (req, res) => res.json({ success: true, message: 'OAuth sharing: copy .env tokens between profiles manually in local mode.' }));
router.post('/api/profiles/:id/auth/oauth/cancel', (req, res) => { delete oauthSessions[req.params.id]; res.json({ success: true }); });

// ═══ OAUTH CALLBACK PAGE ═══
router.get('/oauth/callback', (req, res) => {
  const code = String(req.query.code || ''); const state = String(req.query.state || '');
  const err = String(req.query.error || ''); const desc = String(req.query.error_description || '');
  if (err) return res.redirect(`/?tab=auth&oauthError=${encodeURIComponent(err + (desc ? ': ' + desc : ''))}`);
  const callbackUrl = `http://localhost:${h.PORT}/oauth/callback?` + new URLSearchParams(req.query).toString();
  const q = new URLSearchParams({ tab: 'auth', oauthCallback: callbackUrl, oauthCode: code, oauthState: state });
  return res.redirect('/?' + q.toString() + '#auth');
});
router.get('/oauth/start-codex', (req, res) => {
  const profile = String(req.query.profile || 'default');
  const localCmd = `${h.LOCAL_OPENCLAW} onboard --auth-choice openai-codex`;
  const globalCmd = 'openclaw onboard --auth-choice openai-codex';
  const cmd = `(${globalCmd}) || (${localCmd})`;
  let launched = false;
  try { if (process.platform === 'darwin') { execSync(`osascript -e 'tell application "Terminal" to do script "${cmd.replace(/"/g, '\\"')}"'`, { stdio: 'ignore' }); launched = true; } } catch {}
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>OpenAI Connect</title><style>body{font-family:system-ui;background:#0f1115;color:#e7e9ee;padding:24px;max-width:820px;margin:0 auto}code{background:#1a1f2a;padding:4px 8px;border-radius:6px}.card{background:#161b22;border:1px solid #2d333b;border-radius:12px;padding:16px;margin:12px 0}.btn{display:inline-block;background:#1f6feb;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none}</style></head><body><h2>Connect OpenAI</h2><div class="card"><p>${launched ? 'Terminal opened. Complete login there.' : 'Run this command in Terminal:'}</p><code>${cmd}</code></div><div class="card"><a class="btn" href="http://localhost:${h.PORT}/?tab=auth&oauth=codex&profile=${encodeURIComponent(profile)}#auth">I finished login</a> <a style="margin-left:10px" href="http://localhost:${h.PORT}">Back to Dashboard</a></div></body></html>`);
});


module.exports = router;
