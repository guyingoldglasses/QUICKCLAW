/**
 * routes/chat.js — Chat interface backend
 *
 * Routes messages through:
 *   1. OpenClaw gateway WebSocket (ws://localhost:18789) if running
 *   2. Direct OpenAI API if key/OAuth token exists
 *   3. Direct Anthropic API if key exists
 *   4. Returns onboarding guidance if nothing is configured
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const h = require('../lib/helpers');
const st = require('../lib/state');

const router = Router();

// ═══ FIRST-RUN DETECTION ═══
const SETUP_MARKER = path.join(h.DATA_DIR, '.setup-complete');

router.get('/api/chat/first-run', (req, res) => {
  const isFirstRun = !fs.existsSync(SETUP_MARKER);
  res.json({ firstRun: isFirstRun });
});

router.post('/api/chat/complete-setup', (req, res) => {
  try { fs.writeFileSync(SETUP_MARKER, new Date().toISOString()); } catch {}
  res.json({ ok: true });
});

// ═══ SETUP STATUS — what's configured? ═══
router.get('/api/chat/status', async (req, res) => {
  try {
    const gw = await h.gatewayState();
    const settings = st.getSettings();
    const profiles = st.getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    const pp = active ? st.profilePaths(active.id) : null;

    // Check for API keys in multiple locations
    let hasOpenaiKey = !!settings.openaiApiKey;
    let hasAnthropicKey = !!settings.anthropicApiKey;
    let hasOauthToken = !!settings.openaiOAuthEnabled;
    let hasTelegram = !!settings.telegramBotToken;

    // Also check profile .env files
    if (pp) {
      const env = h.readEnv(pp.envPath);
      if (!hasOpenaiKey && env.OPENAI_API_KEY) hasOpenaiKey = true;
      if (!hasAnthropicKey && env.ANTHROPIC_API_KEY) hasAnthropicKey = true;
      if (!hasTelegram && env.TELEGRAM_BOT_TOKEN) hasTelegram = true;
      if (!hasTelegram && env.TELEGRAM_TOKEN) hasTelegram = true;
      // Also check clawdbot.json channels config
      if (!hasTelegram) {
        try {
          const cfg = h.readJson(pp.configJson, {});
          if (cfg?.channels?.telegram?.botToken) hasTelegram = true;
        } catch {}
      }

      // Check codex auth.json for OAuth
      const codexAuth = path.join(h.HOME, '.codex', 'auth.json');
      if (!hasOauthToken && fs.existsSync(codexAuth)) {
        try {
          const auth = JSON.parse(fs.readFileSync(codexAuth, 'utf-8'));
          if (auth.access_token || auth.token) hasOauthToken = true;
        } catch {}
      }
    }

    // Determine best available chat method
    let chatMethod = 'none';
    let chatReady = false;
    if (gw.running) {
      chatMethod = 'gateway';
      chatReady = true;
    } else if (hasOpenaiKey) {
      chatMethod = 'openai-direct';
      chatReady = true;
    } else if (hasAnthropicKey) {
      chatMethod = 'anthropic-direct';
      chatReady = true;
    } else if (hasOauthToken) {
      chatMethod = 'oauth';
      chatReady = true;
    }

    // Determine onboarding step
    let onboardingStep = 'complete';
    if (!chatReady) onboardingStep = 'need-api-key';
    else if (!gw.running) onboardingStep = 'start-gateway';
    else if (!hasTelegram) onboardingStep = 'add-telegram';

    const isFirstRun = !fs.existsSync(SETUP_MARKER);

    res.json({
      chatReady,
      chatMethod,
      gateway: { running: gw.running, statusText: gw.statusText },
      keys: { openai: hasOpenaiKey, anthropic: hasAnthropicKey, oauth: hasOauthToken, telegram: hasTelegram },
      onboardingStep,
      activeProfile: active ? active.id : null,
      firstRun: isFirstRun
    });
  } catch (e) {
    res.json({ chatReady: false, chatMethod: 'none', error: e.message, onboardingStep: 'need-api-key' });
  }
});

// ═══ SEND MESSAGE ═══
router.post('/api/chat/send', async (req, res) => {
  const { message, history, model } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ ok: false, error: 'No message provided' });
  }
  const userMessage = message.trim();

  try {
    const settings = st.getSettings();
    const profiles = st.getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    const pp = active ? st.profilePaths(active.id) : null;
    const gw = await h.gatewayState();

    // Gather keys — check multiple locations
    let openaiKey = settings.openaiApiKey || '';
    let anthropicKey = settings.anthropicApiKey || '';
    if (pp) {
      try {
        const env = h.readEnv(pp.envPath);
        if (!openaiKey && env.OPENAI_API_KEY) openaiKey = env.OPENAI_API_KEY;
        if (!anthropicKey && env.ANTHROPIC_API_KEY) anthropicKey = env.ANTHROPIC_API_KEY;
      } catch (envErr) { console.log('[chat/send] Could not read profile env:', pp.envPath, envErr.message); }
    }
    // Also check global .env files
    if (!openaiKey || !anthropicKey) {
      for (const envPath of [
        path.join(h.OPENCLAW_STATE_DIR, '.env'),
        path.join(h.HOME, '.openclaw', '.env')
      ]) {
        try {
          const gEnv = h.readEnv(envPath);
          if (!openaiKey && gEnv.OPENAI_API_KEY) openaiKey = gEnv.OPENAI_API_KEY;
          if (!anthropicKey && gEnv.ANTHROPIC_API_KEY) anthropicKey = gEnv.ANTHROPIC_API_KEY;
        } catch {}
      }
    }
    // Check process env (set by launch script)
    if (!openaiKey && process.env.OPENAI_API_KEY) openaiKey = process.env.OPENAI_API_KEY;
    if (!anthropicKey && process.env.ANTHROPIC_API_KEY) anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Trim keys (env files may have trailing whitespace/newlines)
    openaiKey = openaiKey.trim();
    anthropicKey = anthropicKey.trim();

    console.log('[chat/send] msg="' + userMessage.substring(0, 30) + '" openai=' + (openaiKey ? 'yes(' + openaiKey.substring(0, 12) + '...)' : 'NO') +
      ' anthropic=' + (anthropicKey ? 'yes' : 'no') + ' gw=' + gw.running);

    // Load soul/system prompt if available
    let systemPrompt = 'You are a helpful AI assistant running via OpenClaw. Be friendly and concise.';
    if (pp) {
      const soulPath = st.findSoul(pp);
      if (soulPath && fs.existsSync(soulPath)) {
        const soul = fs.readFileSync(soulPath, 'utf-8').trim();
        if (soul) systemPrompt = soul;
      }
    }

    // Build conversation — filter out errors and ensure valid content
    const messages = [];
    if (Array.isArray(history)) {
      history.slice(-20).forEach(m => {
        if (!m || !m.role || !m.content) return;
        const content = String(m.content).trim();
        if (!content) return;
        // Skip error messages from history
        if (content.startsWith('\u26A0') || content.startsWith('⚠')) return;
        const role = m.role === 'user' ? 'user' : 'assistant';
        messages.push({ role, content });
      });
    }
    messages.push({ role: 'user', content: userMessage });

    // Try gateway API first (most reliable — same as Telegram uses)
    if (gw.running && gw.ws18789) {
      try {
        const gwReply = await callGatewayAPI(18789, null, userMessage);
        if (gwReply) {
          console.log('[chat/send] Gateway API success');
          saveChatMessage(userMessage, gwReply);
          return res.json({ ok: true, reply: gwReply, method: 'gateway-api' });
        }
      } catch (gwErr) {
        console.log('[chat/send] Gateway API failed:', gwErr.message);
      }
    }

    // Try OpenAI-compatible API
    if (openaiKey) {
      try {
        console.log('[chat/send] Trying OpenAI direct...');
        const reply = await callOpenAI(openaiKey, messages, systemPrompt, model || 'gpt-4o-mini');
        saveChatMessage(userMessage, reply);
        return res.json({ ok: true, reply, method: 'openai' });
      } catch (oaiErr) {
        console.error('[chat/send] OpenAI direct failed:', oaiErr.message, oaiErr.stack);
        // Fall through to try Anthropic or gateway CLI
      }
    } else {
      console.log('[chat/send] No OpenAI key found');
    }

    // Try Anthropic
    if (anthropicKey) {
      try {
        const reply = await callAnthropic(anthropicKey, messages, systemPrompt, model || 'claude-sonnet-4-20250514');
        saveChatMessage(userMessage, reply);
        return res.json({ ok: true, reply, method: 'anthropic' });
      } catch (antErr) {
        console.error('Anthropic direct failed:', antErr.message);
      }
    }

    // Try gateway CLI as last resort
    if (gw.running) {
      const result = await h.run(`echo ${JSON.stringify(userMessage)} | ${h.cliBin()} chat --no-interactive 2>/dev/null`, { timeout: 30000 });
      if (result.ok && result.output) {
        saveChatMessage(userMessage, result.output);
        return res.json({ ok: true, reply: result.output, method: 'gateway-cli' });
      }
    }

    res.json({ ok: false, error: 'No working API connection found. Make sure your API key is valid or the gateway is running.' });
  } catch (e) {
    console.error('Chat send error:', e.message);
    res.json({ ok: false, error: e.message || 'Chat request failed' });
  }
});

// ═══ CHAT HISTORY ═══
router.get('/api/chat/history', (req, res) => {
  const history = h.readJson(h.CHAT_HISTORY_PATH, []);
  res.json({ messages: history.slice(-100) });
});

router.delete('/api/chat/history', (req, res) => {
  h.writeJson(h.CHAT_HISTORY_PATH, []);
  res.json({ ok: true });
});

// ═══ QUICK KEY SAVE — from onboarding ═══
router.post('/api/chat/save-key', async (req, res) => {
  try {
    const { provider, key } = req.body;
    if (!provider || !key) return res.status(400).json({ ok: false, error: 'Provider and key required' });

    if (provider === 'openai' || provider === 'anthropic') {
      // Direct file write — avoids read-merge cycle that can fail with corrupt files
      try {
        let current = {};
        try { current = JSON.parse(fs.readFileSync(h.SETTINGS_PATH, 'utf-8')); } catch {}
        if (!current || typeof current !== 'object' || Array.isArray(current)) current = {};
        // Only keep known safe keys
        const safe = {
          openaiApiKey: String(current.openaiApiKey || ''),
          openaiOAuthEnabled: !!current.openaiOAuthEnabled,
          anthropicApiKey: String(current.anthropicApiKey || ''),
          telegramBotToken: String(current.telegramBotToken || ''),
          ftpHost: String(current.ftpHost || ''),
          ftpUser: String(current.ftpUser || ''),
          emailUser: String(current.emailUser || '')
        };
        // Apply the new key
        if (provider === 'openai') safe.openaiApiKey = String(key);
        else safe.anthropicApiKey = String(key);
        // Write directly
        const dir = path.dirname(h.SETTINGS_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(h.SETTINGS_PATH, JSON.stringify(safe, null, 2));
        console.log('✓ API key saved for', provider);
      } catch (writeErr) {
        console.error('settings.json write error:', writeErr.message);
        return res.status(500).json({ ok: false, error: 'Could not write settings: ' + writeErr.message });
      }

      // Also write to active profile .env
      try {
        const profiles = st.getProfiles();
        const active = profiles.find(p => p.active) || profiles[0];
        if (active) {
          const pp = st.profilePaths(active.id);
          if (fs.existsSync(pp.configDir)) {
            const env = h.readEnv(pp.envPath);
            if (provider === 'openai') env.OPENAI_API_KEY = key;
            else env.ANTHROPIC_API_KEY = key;
            h.writeEnv(pp.envPath, env);
          }
        }
      } catch (envErr) { console.error('Warning: could not write to profile .env:', envErr.message); }

      // ── CRITICAL: Set gateway.mode=local + matching model in openclaw.json ──
      // Without gateway.mode=local, gateway refuses to start
      try {
        const model = provider === 'openai' ? 'openai/gpt-4o' : 'anthropic/claude-sonnet-4-5-20250929';
        const configPaths = [
          path.join(h.OPENCLAW_STATE_DIR, 'openclaw.json'),
          path.join(h.HOME, '.openclaw', 'openclaw.json'),
        ];
        for (const cfgPath of configPaths) {
          if (fs.existsSync(cfgPath)) {
            const cfg = h.readJson(cfgPath, {});
            // Set gateway mode
            if (!cfg.gateway) cfg.gateway = {};
            cfg.gateway.mode = 'local';
            // Set model to match provider
            if (!cfg.agents) cfg.agents = {};
            if (!cfg.agents.defaults) cfg.agents.defaults = {};
            if (!cfg.agents.defaults.model) cfg.agents.defaults.model = {};
            cfg.agents.defaults.model.primary = model;
            h.writeJson(cfgPath, cfg);
            console.log('✓ Set gateway.mode=local + model=' + model + ' in ' + cfgPath);
          }
        }
      } catch (cfgErr) { console.error('Warning: openclaw.json update error:', cfgErr.message); }

      // Regenerate YAML config
      try { st.applySettingsToConfigFile(); } catch {}

      return res.json({ ok: true, provider });

    } else if (provider === 'telegram') {
      const token = String(key).trim();
      if (!token.includes(':')) return res.status(400).json({ ok: false, error: 'Invalid Telegram bot token. It should look like 123456789:ABCdef...' });
      // Write token to ALL config locations OpenClaw might read from
      const writeResults = st.writeTelegramTokenEverywhere(token);
      // Return immediately — frontend will call /telegram-activate for the slow restart
      return res.json({
        ok: true, provider: 'telegram',
        writeResults,
        note: 'Token saved. Call /telegram-activate to restart gateway.'
      });

    } else {
      return res.status(400).json({ ok: false, error: 'Unknown provider: ' + provider });
    }
  } catch (err) {
    console.error('save-key error:', err);
    res.status(500).json({ ok: false, error: 'Save failed: ' + (err.message || String(err)) });
  }
});

// ═══ TELEGRAM ACTIVATE — full restart + verify (called after save-key) ═══
router.post('/api/chat/telegram-activate', async (req, res) => {
  try {
    const steps = [];
    const { execSync } = require('child_process');
    const freshInstall = req.body && req.body.freshInstall;
    const userId = req.body && req.body.userId ? String(req.body.userId).trim() : '';

    // Step 1: Stop gateway
    steps.push({ step: 'stop', status: 'running' });
    try { await h.gatewayExec(`${h.gatewayStopCommand()} 2>&1`); } catch {}
    await new Promise(r => setTimeout(r, 1500));

    // Hard kill anything on gateway ports
    for (const port of [18789, 5000]) {
      try {
        const pids = execSync(`lsof -ti tcp:${port}`, { stdio: 'pipe' }).toString().trim();
        for (const pid of pids.split('\n').filter(Boolean)) {
          try { process.kill(parseInt(pid), 'SIGKILL'); } catch {}
        }
      } catch {}
    }
    try {
      const pids = execSync(`pgrep -f "openclaw.*gateway" || true`, { stdio: 'pipe' }).toString().trim();
      for (const pid of pids.split('\n').filter(Boolean)) {
        const n = parseInt(pid);
        if (n && n !== process.pid) { try { process.kill(n, 'SIGKILL'); } catch {} }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
    steps[0].status = 'done';

    // Step 2: Clear old telegram session data for fresh pairing
    if (freshInstall) {
      // Clean from ALL possible locations (symlink + state dir + profile dir)
      const cleanRoots = [
        path.join(h.HOME, '.openclaw'),
        h.OPENCLAW_STATE_DIR,
      ];
      try {
        const profiles = st.getProfiles();
        const active = profiles.find(p => p.active) || profiles[0];
        if (active) cleanRoots.push(st.profilePaths(active.id).configDir);
      } catch {}

      const cleanDirs = ['telegram', 'devices', 'completions', 'cron', 'media'];
      for (const root of cleanRoots) {
        for (const sub of cleanDirs) {
          const dir = path.join(root, sub);
          try { if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
        }
      }

      // Clear the Telegram bot's pending updates so old messages don't replay
      const settings = st.getSettings();
      const token = settings.telegramBotToken || '';
      if (token) {
        try {
          await new Promise((resolve) => {
            const req = https.get(`https://api.telegram.org/bot${token}/getUpdates?offset=-1&timeout=0`, { timeout: 5000 }, (resp) => {
              let d = ''; resp.on('data', c => d += c); resp.on('end', () => resolve(d));
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
          });
        } catch {}
      }
      steps.push({ step: 'clean', status: 'done' });
    }

    // Step 3: Re-register telegram channel + enforce config in ALL locations
    const settings = st.getSettings();
    const token = settings.telegramBotToken || '';
    const profiles = st.getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    const profileEnv = active ? st.profileEnvVars(active.id) : {};

    // Re-run channels add with proper env vars (critical after cleanup)
    if (token) {
      try {
        const cliResult = await h.run(
          `${h.cliBin()} channels add --channel telegram --token "${token}" 2>&1`,
          { cwd: h.INSTALL_DIR, timeout: 15000, env: { ...profileEnv } }
        );
        console.log('channels add (activate): ok=' + cliResult.ok + ' output=' + (cliResult.output || '').slice(0, 200));
      } catch (e) { console.log('channels add error:', e.message); }
    }

    // Write telegram config to ALL possible openclaw.json locations
    const configLocations = [
      path.join(h.OPENCLAW_STATE_DIR, 'openclaw.json'),
      path.join(h.HOME, '.openclaw', 'openclaw.json'),
    ];
    if (active) {
      const pp = st.profilePaths(active.id);
      const profPath = path.join(pp.configDir, 'openclaw.json');
      if (!configLocations.includes(profPath)) configLocations.push(profPath);
    }

    for (const ocPath of configLocations) {
      try {
        const dir = path.dirname(ocPath);
        fs.mkdirSync(dir, { recursive: true });
        const oc = fs.existsSync(ocPath) ? h.readJson(ocPath, {}) : {};
        // Gateway MUST have mode=local
        if (!oc.gateway) oc.gateway = {};
        oc.gateway.mode = 'local';
        // Telegram channel — locked to user by default
        oc.channels = oc.channels || {};
        oc.channels.telegram = oc.channels.telegram || {};
        oc.channels.telegram.botToken = token || oc.channels.telegram.botToken;
        oc.channels.telegram.enabled = true;
        if (userId) {
          oc.channels.telegram.dmPolicy = 'allowlist';
          oc.channels.telegram.allowFrom = [userId];
        } else {
          oc.channels.telegram.dmPolicy = 'open';
          oc.channels.telegram.allowFrom = ['*'];
        }
        oc.channels.telegram.groupPolicy = 'allowlist';
        oc.channels.telegram.streaming = 'partial';
        // Audio transcription (STT via OpenAI Whisper)
        oc.tools = oc.tools || {};
        oc.tools.media = oc.tools.media || {};
        oc.tools.media.audio = {
          enabled: true,
          maxBytes: 20971520,
          models: [{ provider: 'openai', model: 'gpt-4o-mini-transcribe' }]
        };
        // TTS for voice replies
        oc.messages = oc.messages || {};
        oc.messages.tts = { auto: 'inbound', provider: 'edge' };
        // Clean up any invalid "voice" key from previous versions
        delete oc.voice;
        // Plugins
        oc.plugins = oc.plugins || {};
        oc.plugins.entries = oc.plugins.entries || {};
        oc.plugins.entries.telegram = oc.plugins.entries.telegram || {};
        oc.plugins.entries.telegram.enabled = true;
        h.writeJson(ocPath, oc);
        console.log('✓ Wrote telegram config to: ' + ocPath);
      } catch (e) {
        console.log('⚠ Config write failed: ' + ocPath + ' — ' + e.message);
      }
    }
    steps.push({ step: 'config', status: 'done' });

    // Write user to credentials file (Comms tab reads this)
    if (userId) {
      try {
        const profiles = st.getProfiles();
        const active = profiles.find(p => p.active) || profiles[0];
        if (active) {
          const pp = st.profilePaths(active.id);
          const credDir = path.join(pp.configDir, 'credentials');
          fs.mkdirSync(credDir, { recursive: true });
          const allowFile = path.join(credDir, 'telegram-allowFrom.json');
          const allow = h.readJson(allowFile, null) || { version: 1, allowFrom: [] };
          if (!Array.isArray(allow.allowFrom)) allow.allowFrom = [];
          if (!allow.allowFrom.includes(userId)) allow.allowFrom.push(userId);
          h.writeJson(allowFile, allow);
          console.log('✓ Wrote credentials allowFrom for user: ' + userId);
        }
      } catch (e) { console.log('⚠ Credentials write error:', e.message); }
    }

    // Step 4: Full start (install LaunchAgent + patch plist + start)
    steps.push({ step: 'start', status: 'running' });
    const startResult = await h.gatewayFullStart(path.join(h.LOG_DIR, 'gateway.log'));
    steps[steps.length - 1].status = startResult.ok ? 'done' : 'failed';

    // Step 5: Wait for telegram to initialize (gateway needs time to connect)
    if (startResult.ok) {
      // Re-enforce config in ALL locations after gateway install (it might have reset values)
      for (const ocPath2 of configLocations) {
        try {
          if (fs.existsSync(ocPath2)) {
            const oc2 = h.readJson(ocPath2, {});
            let needsWrite = false;
            if (!oc2.gateway?.mode) {
              oc2.gateway = oc2.gateway || {};
              oc2.gateway.mode = 'local';
              needsWrite = true;
            }
            if (!oc2.channels?.telegram?.enabled) {
              oc2.channels = oc2.channels || {};
              oc2.channels.telegram = oc2.channels.telegram || {};
              oc2.channels.telegram.enabled = true;
              needsWrite = true;
            }
            // Don't overwrite lock — only fix if missing entirely
            if (!oc2.channels?.telegram?.dmPolicy) {
              oc2.channels.telegram.dmPolicy = userId ? 'allowlist' : 'open';
              oc2.channels.telegram.allowFrom = userId ? [userId] : ['*'];
              needsWrite = true;
            }
            if (!oc2.plugins?.entries?.telegram?.enabled) {
              oc2.plugins = oc2.plugins || {};
              oc2.plugins.entries = oc2.plugins.entries || {};
              oc2.plugins.entries.telegram = oc2.plugins.entries.telegram || {};
              oc2.plugins.entries.telegram.enabled = true;
              needsWrite = true;
            }
            // Audio transcription
            if (!oc2.tools?.media?.audio?.enabled) {
              oc2.tools = oc2.tools || {};
              oc2.tools.media = oc2.tools.media || {};
              oc2.tools.media.audio = { enabled: true, maxBytes: 20971520, models: [{ provider: 'openai', model: 'gpt-4o-mini-transcribe' }] };
              needsWrite = true;
            }
            // TTS
            if (!oc2.messages?.tts) {
              oc2.messages = oc2.messages || {};
              oc2.messages.tts = { auto: 'inbound', provider: 'edge' };
              needsWrite = true;
            }
            // Clean invalid voice key
            if (oc2.voice) { delete oc2.voice; needsWrite = true; }
            if (needsWrite) h.writeJson(ocPath2, oc2);
          }
        } catch {}
      }

      steps.push({ step: 'connecting', status: 'running' });
      await new Promise(r => setTimeout(r, 5000));

      // Check if telegram is actually polling
      const settings = st.getSettings();
      const token = settings.telegramBotToken || '';
      let telegramConnected = false;
      let botInfo = null;
      let pairingInfo = null;

      if (token) {
        // Validate token
        try {
          const info = await new Promise((resolve, reject) => {
            const treq = https.get(`https://api.telegram.org/bot${token}/getMe`, { timeout: 8000 }, (resp) => {
              let data = '';
              resp.on('data', c => data += c);
              resp.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Bad JSON')); } });
            });
            treq.on('error', reject);
            treq.on('timeout', () => { treq.destroy(); reject(new Error('timeout')); });
          });
          if (info.ok) botInfo = { username: info.result.username, firstName: info.result.first_name };
        } catch {}

        // Check updates to see if gateway is now polling
        // Gateway running + valid token = connected (we can't directly verify polling)
        try {
          const updates = await new Promise((resolve, reject) => {
            const ureq = https.get(`https://api.telegram.org/bot${token}/getUpdates?limit=1&timeout=0`, { timeout: 8000 }, (resp) => {
              let data = '';
              resp.on('data', c => data += c);
              resp.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Bad JSON')); } });
            });
            ureq.on('error', reject);
            ureq.on('timeout', () => { ureq.destroy(); reject(new Error('timeout')); });
          });
          // If getUpdates succeeds, the token works and Telegram can reach the bot
          // Gateway is running (we verified above), so consider it connected
          telegramConnected = updates.ok === true;
        } catch {}
      }

      // Check openclaw.json for dm policy
      try {
        const ocPath = st.openclawConfigPath();
        const oc = h.readJson(ocPath, {});
        const dmPolicy = oc.channels?.telegram?.dmPolicy || 'open';
        const allowFrom = oc.channels?.telegram?.allowFrom || [];
        pairingInfo = {
          mode: dmPolicy,
          locked: dmPolicy === 'allowlist' && allowFrom.length > 0 && !allowFrom.includes('*'),
          allowFrom,
          note: dmPolicy === 'allowlist'
            ? 'Your bot is locked — only approved users can chat with it.'
            : 'Your bot is live — send any message in Telegram and your AI will reply!'
        };
      } catch {}

      steps[steps.length - 1].status = 'done';

      return res.json({
        ok: true,
        gatewayRunning: startResult.ok,
        telegramConnected,
        botInfo,
        pairingInfo,
        steps,
        startLog: startResult.log
      });
    }

    return res.json({
      ok: false,
      gatewayRunning: false,
      steps,
      startLog: startResult.log,
      error: 'Gateway failed to start'
    });
  } catch (err) {
    console.error('telegram-activate error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══ TELEGRAM PAIRING — approve a code from the dashboard ═══
router.post('/api/chat/telegram-pair', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !String(code).trim()) return res.status(400).json({ ok: false, error: 'Pairing code required' });

    const cleanCode = String(code).trim();
    const profiles = st.getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    const env = active ? st.profileEnvVars(active.id) : {};

    // Try multiple approaches — different OpenClaw versions use different commands
    let result = null;
    const cmds = [
      `${h.cliBin()} pairing approve telegram ${cleanCode}`,
      `${h.cliBin()} channels login --channel telegram --code ${cleanCode}`,
      `${h.cliBin()} channels approve --channel telegram --code ${cleanCode}`,
    ];

    for (const cmd of cmds) {
      result = await h.run(`${cmd} 2>&1`, { env, timeout: 15000 });
      console.log(`pairing cmd: ${cmd.split('/').pop()} → ok=${result.ok}, output=${(result.output || '').slice(0, 200)}`);
      if (result.ok && result.output && !result.output.includes('unknown command') && !result.output.includes('not found')) break;
    }

    if (result && result.ok) {
      res.json({ ok: true, message: 'Pairing approved! You can now chat with your bot.', output: h.cleanCli(result.output) });
    } else {
      // Check if maybe we need to also write to allowFrom directly
      const allowResult = tryDirectAllowlistApproval(cleanCode, active);
      if (allowResult.ok) {
        res.json({ ok: true, message: 'User approved via allowlist.', output: allowResult.output });
      } else {
        res.json({ ok: false, error: 'Pairing failed — the code may have expired. Send /start again in Telegram to get a new code.', output: h.cleanCli(result?.output || '') });
      }
    }
  } catch (err) {
    console.error('telegram-pair error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══ TELEGRAM PAIRING STATUS — check for pending requests ═══
router.get('/api/chat/telegram-pairing-status', async (req, res) => {
  try {
    const profiles = st.getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    const env = active ? st.profileEnvVars(active.id) : {};

    // Check pending pairing requests
    const r = await h.run(`${h.cliBin()} pairing list telegram 2>&1`, { env, timeout: 10000 });

    // Check approved users
    let approvedUsers = [];
    if (active) {
      const pp = st.profilePaths(active.id);
      const allowFile = path.join(pp.configDir, 'credentials', 'telegram-allowFrom.json');
      const allow = h.readJson(allowFile, null);
      approvedUsers = allow?.allowFrom || [];
    }

    // Also check ~/.openclaw/devices/ for paired devices
    const devDir = path.join(h.HOME, '.openclaw', 'devices');
    let pairedDevices = [];
    try {
      if (fs.existsSync(devDir)) {
        pairedDevices = fs.readdirSync(devDir).filter(f => f.endsWith('.json')).map(f => {
          try { return h.readJson(path.join(devDir, f), null); } catch { return null; }
        }).filter(Boolean);
      }
    } catch {}

    res.json({
      ok: true,
      pending: h.cleanCli(r.output || ''),
      approvedUsers,
      pairedDevices,
      hasPaired: approvedUsers.length > 0 || pairedDevices.length > 0
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ═══ TELEGRAM LOCK — add a user ID to the allowlist and lock the bot ═══
router.post('/api/chat/telegram-lock', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !String(userId).trim()) {
      return res.status(400).json({ ok: false, error: 'Telegram user ID required' });
    }
    const uid = String(userId).trim();
    // Validate it looks like a Telegram user ID (numeric)
    if (!/^\d+$/.test(uid)) {
      return res.status(400).json({ ok: false, error: 'Invalid Telegram user ID. It should be a number (e.g. 123456789). Message @userinfobot in Telegram to get yours.' });
    }

    const profiles = st.getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];

    // Write to credentials file (Comms tab reads this)
    if (active) {
      const pp = st.profilePaths(active.id);
      const credDir = path.join(pp.configDir, 'credentials');
      fs.mkdirSync(credDir, { recursive: true });
      const allowFile = path.join(credDir, 'telegram-allowFrom.json');
      const allow = h.readJson(allowFile, null) || { version: 1, allowFrom: [] };
      if (!Array.isArray(allow.allowFrom)) allow.allowFrom = [];
      if (!allow.allowFrom.includes(uid)) allow.allowFrom.push(uid);
      h.writeJson(allowFile, allow);
    }

    // Write to ALL openclaw.json locations (gateway reads this)
    const configLocations = [
      path.join(h.OPENCLAW_STATE_DIR, 'openclaw.json'),
      path.join(h.HOME, '.openclaw', 'openclaw.json'),
    ];
    if (active) {
      const pp = st.profilePaths(active.id);
      const profPath = path.join(pp.configDir, 'openclaw.json');
      if (!configLocations.includes(profPath)) configLocations.push(profPath);
    }
    for (const cfgPath of configLocations) {
      try {
        if (fs.existsSync(cfgPath)) {
          const cfg = h.readJson(cfgPath, {});
          if (cfg.channels?.telegram) {
            cfg.channels.telegram.allowFrom = [uid];
            cfg.channels.telegram.dmPolicy = 'allowlist';
            h.writeJson(cfgPath, cfg);
          }
        }
      } catch {}
    }

    console.log('✓ Telegram locked to user ID: ' + uid);
    return res.json({
      ok: true,
      userId: uid,
      note: 'Bot locked. Only Telegram user ID ' + uid + ' can chat with it. Manage users in Profile → Comms tab.'
    });
  } catch (err) {
    console.error('telegram-lock error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══ ENABLE VOICE REPLIES — auto-configure soul.md + audio/tts config ═══
router.post('/api/chat/enable-voice-replies', async (req, res) => {
  try {
    const profiles = st.getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    if (!active) return res.status(400).json({ ok: false, error: 'No active profile' });

    const pp = st.profilePaths(active.id);
    const soulPath = st.findSoul(pp) || path.join(pp.workspace, 'soul.md');
    const voiceLine = 'When the user sends a voice message, always reply with a voice note.';

    // Read existing or create new
    let content = '';
    try { content = fs.readFileSync(soulPath, 'utf-8'); } catch {}

    // Append voice instruction to soul.md if not already present
    if (!content.includes('voice note') && !content.includes('voice message') && !content.includes('reply with a voice')) {
      fs.mkdirSync(path.dirname(soulPath), { recursive: true });
      const newContent = content.trim() ? content.trim() + '\n\n' + voiceLine + '\n' : voiceLine + '\n';
      fs.writeFileSync(soulPath, newContent);
      console.log('✓ Voice instruction added to: ' + soulPath);
    }

    // Ensure audio transcription + TTS in ALL openclaw.json locations
    const configLocations = [
      path.join(h.OPENCLAW_STATE_DIR, 'openclaw.json'),
      path.join(h.HOME, '.openclaw', 'openclaw.json'),
    ];
    const profPath = path.join(pp.configDir, 'openclaw.json');
    if (!configLocations.includes(profPath)) configLocations.push(profPath);

    for (const cfgPath of configLocations) {
      try {
        if (fs.existsSync(cfgPath)) {
          const cfg = h.readJson(cfgPath, {});
          let changed = false;
          // Audio transcription (STT)
          if (!cfg.tools?.media?.audio?.enabled) {
            cfg.tools = cfg.tools || {};
            cfg.tools.media = cfg.tools.media || {};
            cfg.tools.media.audio = { enabled: true, maxBytes: 20971520, models: [{ provider: 'openai', model: 'gpt-4o-mini-transcribe' }] };
            changed = true;
          }
          // TTS for voice replies
          if (!cfg.messages?.tts) {
            cfg.messages = cfg.messages || {};
            cfg.messages.tts = { auto: 'inbound', provider: 'edge' };
            changed = true;
          }
          // Clean invalid voice key
          if (cfg.voice) { delete cfg.voice; changed = true; }
          if (changed) {
            h.writeJson(cfgPath, cfg);
            console.log('✓ Audio/TTS config written to: ' + cfgPath);
          }
        }
      } catch {}
    }

    return res.json({ ok: true, note: 'Voice replies enabled! Your bot will now transcribe voice messages and respond with voice notes.' });
  } catch (err) {
    console.error('enable-voice-replies error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══ SAVE INTEGRATION — save credentials for GitHub, Vercel, FTP, Email, Slack, Discord ═══
router.post('/api/chat/save-integration', async (req, res) => {
  try {
    const { type, credentials } = req.body;
    if (!type || !credentials) return res.status(400).json({ ok: false, error: 'Missing type or credentials' });

    const profiles = st.getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    if (!active) return res.status(400).json({ ok: false, error: 'No active profile' });

    const pp = st.profilePaths(active.id);
    const credDir = path.join(pp.configDir, 'credentials');
    fs.mkdirSync(credDir, { recursive: true });

    // Save based on type
    switch (type) {
      case 'github': {
        // Save to .env as GITHUB_TOKEN
        const env = h.readEnv(pp.envPath);
        env.GITHUB_TOKEN = credentials.token;
        if (credentials.username) env.GITHUB_USERNAME = credentials.username;
        h.writeEnv(pp.envPath, env);
        return res.json({ ok: true, note: 'GitHub connected! Your bot can now interact with GitHub repos.' });
      }
      case 'vercel': {
        const env = h.readEnv(pp.envPath);
        env.VERCEL_TOKEN = credentials.token;
        h.writeEnv(pp.envPath, env);
        return res.json({ ok: true, note: 'Vercel connected! Your bot can deploy projects.' });
      }
      case 'ftp': {
        h.writeJson(path.join(credDir, 'ftp.json'), {
          host: credentials.host, port: parseInt(credentials.port) || 21,
          username: credentials.username, password: credentials.password,
          secure: credentials.secure || false
        });
        return res.json({ ok: true, note: 'FTP credentials saved! Your bot can upload files to your server.' });
      }
      case 'email': {
        h.writeJson(path.join(credDir, 'smtp.json'), {
          host: credentials.host, port: parseInt(credentials.port) || 587,
          username: credentials.username, password: credentials.password,
          secure: credentials.secure || false, from: credentials.from || credentials.username
        });
        return res.json({ ok: true, note: 'Email configured! Your bot can send emails.' });
      }
      case 'slack': {
        const env = h.readEnv(pp.envPath);
        env.SLACK_BOT_TOKEN = credentials.token;
        if (credentials.signingSecret) env.SLACK_SIGNING_SECRET = credentials.signingSecret;
        h.writeEnv(pp.envPath, env);
        // Also enable in openclaw.json channels
        try {
          const ocPath = st.openclawConfigPath();
          const oc = h.readJson(ocPath, {});
          oc.channels = oc.channels || {};
          oc.channels.slack = { enabled: true, botToken: credentials.token };
          oc.plugins = oc.plugins || {};
          oc.plugins.entries = oc.plugins.entries || {};
          oc.plugins.entries.slack = { enabled: true };
          h.writeJson(ocPath, oc);
        } catch {}
        return res.json({ ok: true, note: 'Slack connected! Restart gateway for changes to take effect.' });
      }
      case 'discord': {
        const env = h.readEnv(pp.envPath);
        env.DISCORD_BOT_TOKEN = credentials.token;
        h.writeEnv(pp.envPath, env);
        try {
          const ocPath = st.openclawConfigPath();
          const oc = h.readJson(ocPath, {});
          oc.channels = oc.channels || {};
          oc.channels.discord = { enabled: true, botToken: credentials.token };
          oc.plugins = oc.plugins || {};
          oc.plugins.entries = oc.plugins.entries || {};
          oc.plugins.entries.discord = { enabled: true };
          h.writeJson(ocPath, oc);
        } catch {}
        return res.json({ ok: true, note: 'Discord connected! Restart gateway for changes to take effect.' });
      }
      default:
        return res.status(400).json({ ok: false, error: 'Unknown integration type: ' + type });
    }
  } catch (err) {
    console.error('save-integration error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══ GET INTEGRATION STATUS — check which integrations are configured ═══
router.get('/api/chat/integrations', async (req, res) => {
  try {
    const profiles = st.getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    const result = { github: false, vercel: false, ftp: false, email: false, slack: false, discord: false };

    if (active) {
      const pp = st.profilePaths(active.id);
      const env = h.readEnv(pp.envPath);
      // Also check global envs
      let gEnv = {};
      try { gEnv = h.readEnv(path.join(h.OPENCLAW_STATE_DIR, '.env')); } catch {}

      result.github = !!(env.GITHUB_TOKEN || gEnv.GITHUB_TOKEN);
      result.vercel = !!(env.VERCEL_TOKEN || gEnv.VERCEL_TOKEN);
      result.slack = !!(env.SLACK_BOT_TOKEN || gEnv.SLACK_BOT_TOKEN);
      result.discord = !!(env.DISCORD_BOT_TOKEN || gEnv.DISCORD_BOT_TOKEN);

      const credDir = path.join(pp.configDir, 'credentials');
      result.ftp = fs.existsSync(path.join(credDir, 'ftp.json'));
      result.email = fs.existsSync(path.join(credDir, 'smtp.json'));
    }
    res.json({ ok: true, integrations: result });
  } catch (err) {
    res.json({ ok: true, integrations: {} });
  }
});

// ═══ TELEGRAM DIAGNOSTICS — check all config locations + gateway status ═══
router.get('/api/chat/telegram-diagnostics', async (req, res) => {
  try {
    const profiles = st.getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    const profileEnv = active ? st.profileEnvVars(active.id) : {};

    // Check all config locations
    const configLocations = [
      { label: 'OPENCLAW_STATE_DIR', path: path.join(h.OPENCLAW_STATE_DIR, 'openclaw.json') },
      { label: '~/.openclaw', path: path.join(h.HOME, '.openclaw', 'openclaw.json') },
    ];
    if (active) {
      const pp = st.profilePaths(active.id);
      configLocations.push({ label: 'profile configDir', path: path.join(pp.configDir, 'openclaw.json') });
    }

    const configs = configLocations.map(loc => {
      const exists = fs.existsSync(loc.path);
      let telegram = null;
      if (exists) {
        try {
          const cfg = h.readJson(loc.path, {});
          telegram = {
            enabled: cfg.channels?.telegram?.enabled,
            dmPolicy: cfg.channels?.telegram?.dmPolicy,
            hasToken: !!cfg.channels?.telegram?.botToken,
            pluginEnabled: cfg.plugins?.entries?.telegram?.enabled,
          };
        } catch {}
      }
      return { ...loc, exists, telegram };
    });

    // Check symlink
    let symlinkInfo = null;
    const ocPath = path.join(h.HOME, '.openclaw');
    try {
      const stat = fs.lstatSync(ocPath);
      symlinkInfo = { exists: true, isSymlink: stat.isSymbolicLink() };
      if (stat.isSymbolicLink()) symlinkInfo.target = fs.readlinkSync(ocPath);
    } catch { symlinkInfo = { exists: false }; }

    // Check gateway
    const gw = await h.gatewayState();

    // Check channels status via CLI
    let channelsStatus = null;
    try {
      const r = await h.run(`${h.cliBin()} channels status 2>&1`, { cwd: h.INSTALL_DIR, timeout: 10000, env: profileEnv });
      channelsStatus = h.cleanCli(r.output || '');
    } catch {}

    // Check LaunchAgent plist
    let plistInfo = null;
    const plistPath = path.join(h.HOME, 'Library', 'LaunchAgents', 'ai.openclaw.gateway.plist');
    try {
      if (fs.existsSync(plistPath)) {
        const plist = fs.readFileSync(plistPath, 'utf-8');
        plistInfo = {
          exists: true,
          hasConfigDir: plist.includes('OPENCLAW_CONFIG_DIR'),
          hasStatePath: plist.includes('OPENCLAW_STATE_DIR'),
          hasConfigPath: plist.includes('OPENCLAW_CONFIG_PATH'),
        };
      } else {
        plistInfo = { exists: false };
      }
    } catch {}

    res.json({
      ok: true,
      configs,
      symlink: symlinkInfo,
      gateway: gw,
      channelsStatus,
      plist: plistInfo,
      envVars: {
        OPENCLAW_STATE_DIR: h.OPENCLAW_STATE_DIR,
        INSTALL_DIR: h.INSTALL_DIR,
        profileConfigDir: active ? st.profilePaths(active.id).configDir : null,
      }
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});
function tryDirectAllowlistApproval(code, activeProfile) {
  // The "code" from OpenClaw pairing is sometimes just a numeric userId
  // If it looks like a Telegram userId, add it directly
  if (/^\d+$/.test(code)) {
    try {
      if (activeProfile) {
        const pp = st.profilePaths(activeProfile.id);
        const credDir = path.join(pp.configDir, 'credentials');
        fs.mkdirSync(credDir, { recursive: true });
        const allowFile = path.join(credDir, 'telegram-allowFrom.json');
        const allow = h.readJson(allowFile, null) || { version: 1, allowFrom: [] };
        if (!Array.isArray(allow.allowFrom)) allow.allowFrom = [];
        if (!allow.allowFrom.includes(code)) {
          allow.allowFrom.push(code);
          h.writeJson(allowFile, allow);
        }
      }
      // Also try ~/.openclaw path
      const ocCredDir = path.join(h.HOME, '.openclaw', 'credentials');
      fs.mkdirSync(ocCredDir, { recursive: true });
      const ocAllowFile = path.join(ocCredDir, 'telegram-allowFrom.json');
      const ocAllow = h.readJson(ocAllowFile, null) || { version: 1, allowFrom: [] };
      if (!Array.isArray(ocAllow.allowFrom)) ocAllow.allowFrom = [];
      if (!ocAllow.allowFrom.includes(code)) {
        ocAllow.allowFrom.push(code);
        h.writeJson(ocAllowFile, ocAllow);
      }
      return { ok: true, output: 'Added user ' + code + ' to allowlist' };
    } catch (e) {
      return { ok: false, output: e.message };
    }
  }
  return { ok: false, output: 'Code is not a numeric userId' };
}

// ═══ API CALL HELPERS ═══

// Call the local OpenClaw gateway HTTP API (same as Telegram uses)
function callGatewayAPI(port, token, message) {
  return new Promise((resolve, reject) => {
    // Read gateway config for auth token
    let gwToken = '';
    try {
      const ocPaths = [
        path.join(h.OPENCLAW_STATE_DIR, 'openclaw.json'),
        path.join(h.HOME, '.openclaw', 'openclaw.json')
      ];
      for (const p of ocPaths) {
        if (fs.existsSync(p)) {
          const oc = h.readJson(p, {});
          if (oc.gateway && oc.gateway.auth && oc.gateway.auth.token) {
            gwToken = oc.gateway.auth.token;
            break;
          }
        }
      }
    } catch {}

    const gwPort = port || 18789;
    const body = JSON.stringify({
      message: message,
      session: 'dashboard-chat',
    });

    const opts = {
      hostname: '127.0.0.1', port: gwPort, path: '/api/sessions/dashboard-chat/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(gwToken ? { 'Authorization': 'Bearer ' + gwToken } : {})
      }
    };

    const http = require('http');
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.reply || j.message || j.content || j.text) {
            resolve(j.reply || j.message || j.content || j.text);
          } else if (j.error) {
            reject(new Error(j.error));
          } else {
            // Try to extract text from any response format
            resolve(typeof j === 'string' ? j : JSON.stringify(j));
          }
        } catch (e) {
          // Non-JSON response — might just be plain text
          if (data && data.trim() && res.statusCode < 400) resolve(data.trim());
          else reject(new Error('Gateway returned status ' + res.statusCode));
        }
      });
    });
    req.on('error', (e) => reject(new Error('Gateway not reachable: ' + e.message)));
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Gateway timed out')); });
    req.write(body);
    req.end();
  });
}
function callOpenAI(apiKey, messages, systemPrompt, model) {
  const cleanMessages = [{ role: 'system', content: String(systemPrompt || 'You are a helpful assistant.') }];
  messages.forEach(m => {
    const content = String(m.content || '').trim();
    if (content) cleanMessages.push({ role: m.role === 'user' ? 'user' : 'assistant', content });
  });

  if (cleanMessages.length < 2) return Promise.reject(new Error('No valid messages to send'));

  const payload = {
    model: model || 'gpt-4o-mini',
    messages: cleanMessages,
    max_tokens: 2048,
    temperature: 0.7
  };

  console.log('[callOpenAI] model=' + payload.model + ' msgs=' + cleanMessages.length + ' key=' + apiKey.substring(0, 12) + '...');

  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify(payload)
  })
  .then(resp => resp.json())
  .then(j => {
    if (j.error) {
      console.error('[callOpenAI] API error:', JSON.stringify(j.error));
      throw new Error(j.error.message || 'OpenAI error');
    }
    const reply = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    console.log('[callOpenAI] Success, reply length=' + (reply || '').length);
    return reply || 'No response';
  });
}

function callAnthropic(apiKey, messages, systemPrompt, model) {
  return new Promise((resolve, reject) => {
    // Ensure all messages have valid string content and proper alternation
    const cleanMessages = [];
    messages.forEach(m => {
      const content = String(m.content || '').trim();
      if (!content) return;
      const role = m.role === 'user' ? 'user' : 'assistant';
      // Anthropic requires alternating user/assistant — merge consecutive same-role
      if (cleanMessages.length > 0 && cleanMessages[cleanMessages.length - 1].role === role) {
        cleanMessages[cleanMessages.length - 1].content += '\n' + content;
      } else {
        cleanMessages.push({ role, content });
      }
    });
    // Anthropic requires first message to be 'user'
    if (cleanMessages.length > 0 && cleanMessages[0].role !== 'user') {
      cleanMessages.shift();
    }

    const body = JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      system: String(systemPrompt || 'You are a helpful assistant.'),
      messages: cleanMessages,
      max_tokens: 2048
    });

    const opts = {
      hostname: 'api.anthropic.com', port: 443, path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'x-api-key': apiKey,
        'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.error) return reject(new Error(j.error.message || 'Anthropic error'));
          const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
          resolve(text || 'No response');
        } catch (e) { reject(new Error('Failed to parse Anthropic response')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Anthropic request timed out')); });
    req.write(body);
    req.end();
  });
}

function saveChatMessage(userMsg, botReply) {
  try {
    const history = h.readJson(h.CHAT_HISTORY_PATH, []);
    const ts = new Date().toISOString();
    history.push({ role: 'user', content: userMsg, ts });
    history.push({ role: 'assistant', content: botReply, ts });
    // Keep last 200 messages
    if (history.length > 200) history.splice(0, history.length - 200);
    h.writeJson(h.CHAT_HISTORY_PATH, history);
  } catch {}
}

// ═══ TELEGRAM DIAGNOSTICS ═══
router.post('/api/chat/telegram-diagnose', async (req, res) => {
  try {
    const results = {
      gateway: { running: false, statusText: '' },
      tokenLocations: {},
      botInfo: null,
      botError: null,
      recentLogs: '',
      suggestions: []
    };

    // 1. Gateway status
    try {
      const gw = await h.gatewayState();
      results.gateway = { running: gw.running, statusText: gw.statusText, ws18789: gw.ws18789, port5000: gw.port5000 };
    } catch (e) { results.gateway.statusText = 'Error checking: ' + e.message; }

    // 2. Check token in all locations
    const settings = st.getSettings();
    const profiles = st.getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    let foundToken = '';

    // settings.json
    const stToken = settings.telegramBotToken || '';
    results.tokenLocations.settings = !!stToken;
    if (stToken) foundToken = stToken;

    if (active) {
      const pp = st.profilePaths(active.id);
      // .env file
      try {
        const env = h.readEnv(pp.envPath);
        const envToken = env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_TOKEN || '';
        results.tokenLocations.env = !!envToken;
        if (envToken && !foundToken) foundToken = envToken;
      } catch { results.tokenLocations.env = false; }

      // clawdbot.json
      try {
        const cfg = h.readJson(pp.configJson, {});
        const cfgToken = cfg.channels?.telegram?.botToken || '';
        const cfgEnabled = !!cfg.channels?.telegram?.enabled;
        const pluginEnabled = !!cfg.plugins?.entries?.telegram?.enabled;
        results.tokenLocations.configJson = !!cfgToken;
        results.tokenLocations.telegramEnabled = cfgEnabled;
        results.tokenLocations.pluginEnabled = pluginEnabled;
        if (cfgToken && !foundToken) foundToken = cfgToken;
      } catch { results.tokenLocations.configJson = false; }

      // credentials/telegram.json
      try {
        const credFile = path.join(pp.configDir, 'credentials', 'telegram.json');
        const cred = h.readJson(credFile, {});
        results.tokenLocations.credentials = !!cred.botToken;
      } catch { results.tokenLocations.credentials = false; }
    }

    // 2b. THE REAL CONFIG: ~/.openclaw/openclaw.json (what the gateway actually reads)
    try {
      const ocPath = st.openclawConfigPath();
      const oc = h.readJson(ocPath, {});
      const ocToken = oc.channels?.telegram?.botToken || '';
      const ocEnabled = !!oc.channels?.telegram?.enabled;
      const ocPluginEnabled = !!oc.plugins?.entries?.telegram?.enabled;
      results.tokenLocations.openclawJson = !!ocToken;
      results.tokenLocations.ocTelegramEnabled = ocEnabled;
      results.tokenLocations.ocPluginEnabled = ocPluginEnabled;
      if (ocToken && !foundToken) foundToken = ocToken;
      // This is the critical check — if openclaw.json has enabled:false, nothing will work
      if (!ocEnabled) {
        results.criticalIssue = 'Telegram is DISABLED in openclaw.json (the file the gateway reads). Token is present but channels.telegram.enabled = false.';
      }
      if (!ocPluginEnabled) {
        results.criticalIssue = (results.criticalIssue || '') + ' Telegram PLUGIN is also disabled in openclaw.json.';
      }
    } catch { results.tokenLocations.openclawJson = false; }

    // 3. Validate token with Telegram API (getMe)
    if (foundToken) {
      try {
        const botInfo = await new Promise((resolve, reject) => {
          const https = require('https');
          const req = https.get(`https://api.telegram.org/bot${foundToken}/getMe`, { timeout: 8000 }, (resp) => {
            let data = '';
            resp.on('data', c => data += c);
            resp.on('end', () => {
              try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON from Telegram')); }
            });
          });
          req.on('error', reject);
          req.on('timeout', () => { req.destroy(); reject(new Error('Telegram API timed out')); });
        });
        if (botInfo.ok) {
          results.botInfo = { username: botInfo.result.username, firstName: botInfo.result.first_name, id: botInfo.result.id, canReadMessages: botInfo.result.can_read_all_group_messages };
        } else {
          results.botError = botInfo.description || 'Telegram rejected the token';
        }
      } catch (e) {
        results.botError = 'Could not reach Telegram API: ' + e.message;
      }

      // 3b. Check for pending updates (are messages reaching the bot?)
      try {
        const updates = await new Promise((resolve, reject) => {
          const https = require('https');
          const req = https.get(`https://api.telegram.org/bot${foundToken}/getUpdates?limit=3&timeout=0`, { timeout: 8000 }, (resp) => {
            let data = '';
            resp.on('data', c => data += c);
            resp.on('end', () => {
              try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
            });
          });
          req.on('error', reject);
          req.on('timeout', () => { req.destroy(); reject(new Error('timed out')); });
        });
        if (updates.ok) {
          results.pendingUpdates = updates.result.length;
          if (updates.result.length > 0) {
            results.lastUpdate = {
              from: updates.result[updates.result.length - 1].message?.from?.first_name || 'unknown',
              text: (updates.result[updates.result.length - 1].message?.text || '').slice(0, 50),
              date: updates.result[updates.result.length - 1].message?.date
            };
          }
        }
      } catch {}
    } else {
      results.botError = 'No token found in any config location';
    }

    // 4. Recent gateway logs — check BOTH QuickClaw log dir AND OpenClaw's own log dir
    const logSources = [
      path.join(h.LOG_DIR, 'gateway.log'),
      path.join(h.OPENCLAW_STATE_DIR, 'logs', 'gateway.log'),
      path.join(h.HOME, '.openclaw', 'logs', 'gateway.log'),
      path.join(h.HOME, '.clawdbot', 'logs', 'gateway.log')
    ];
    // Also check active profile's config dir for logs
    if (active) {
      const pp = st.profilePaths(active.id);
      logSources.push(path.join(pp.configDir, 'logs', 'gateway.log'));
    }
    const allLogs = [];
    const seenPaths = new Set();
    for (const logPath of logSources) {
      const resolved = path.resolve(logPath);
      if (seenPaths.has(resolved)) continue;
      seenPaths.add(resolved);
      try {
        if (fs.existsSync(logPath)) {
          const log = fs.readFileSync(logPath, 'utf-8');
          const lines = log.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            allLogs.push('── ' + logPath + ' ──');
            allLogs.push(...lines.slice(-12));
          }
        }
      } catch {}
    }
    results.recentLogs = allLogs.length > 0 ? allLogs.join('\n') : 'No gateway logs found';

    // 4b. Dump actual clawdbot.json config summary for debugging
    if (active) {
      try {
        const pp = st.profilePaths(active.id);
        const cfg = h.readJson(pp.configJson, {});
        results.configSummary = {
          configPath: pp.configJson,
          hasTelegramChannel: !!(cfg.channels && cfg.channels.telegram),
          telegramEnabled: !!(cfg.channels && cfg.channels.telegram && cfg.channels.telegram.enabled),
          hasToken: !!(cfg.channels && cfg.channels.telegram && cfg.channels.telegram.botToken),
          tokenPreview: cfg.channels?.telegram?.botToken ? h.maskKey(cfg.channels.telegram.botToken) : 'none',
          pluginEnabled: !!(cfg.plugins?.entries?.telegram?.enabled),
          allChannels: Object.keys(cfg.channels || {}),
          allPlugins: Object.keys(cfg.plugins?.entries || {})
        };
      } catch {}
    }

    // 5. Build suggestions
    if (results.criticalIssue) {
      results.suggestions.push('⚠️ CRITICAL: ' + results.criticalIssue);
    }
    if (!results.gateway.running) {
      results.suggestions.push('Gateway is NOT running. Try restarting it from the Dashboard tab, or click "Restart Gateway" below.');
    }
    if (results.botError && results.botError.includes('Unauthorized')) {
      results.suggestions.push('Telegram says the bot token is INVALID. Double-check you copied the full token from BotFather.');
    }
    if (results.botError && results.botError.includes('timed out')) {
      results.suggestions.push('Could not reach Telegram API. Check your internet connection.');
    }
    if (!results.tokenLocations.configJson) {
      results.suggestions.push('Token missing from clawdbot.json — the main config file OpenClaw reads.');
    }
    if (!results.tokenLocations.telegramEnabled) {
      results.suggestions.push('Telegram channel is not enabled in clawdbot.json.');
    }
    if (!results.tokenLocations.pluginEnabled) {
      results.suggestions.push('Telegram plugin is not enabled in clawdbot.json.');
    }
    if (results.pendingUpdates > 0) {
      results.suggestions.push('There are ' + results.pendingUpdates + ' unprocessed messages from Telegram — the gateway is not polling them. It may need a restart.');
    }
    if (results.gateway.running && results.botInfo && results.pendingUpdates === 0 && results.tokenLocations.configJson) {
      results.suggestions.push('Everything looks configured correctly. Try sending another message in Telegram and wait 10-15 seconds.');
    }

    res.json({ ok: true, ...results });
  } catch (err) {
    console.error('telegram-diagnose error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══ GATEWAY RESTART (dedicated endpoint — hard restart) ═══
router.post('/api/chat/gateway-restart', async (req, res) => {
  try {
    const log = [];
    
    // 1. Try graceful stop first
    try {
      const stopResult = await h.gatewayExec(`${h.gatewayStopCommand()} 2>&1`);
      log.push('stop: ' + (stopResult.stdout || '').trim().slice(0, 100));
    } catch (e) { log.push('stop failed: ' + e.message.slice(0, 80)); }
    
    await new Promise(r => setTimeout(r, 1500));
    
    // 2. Hard kill anything on ports 18789 and 5000 (gateway websocket ports)
    for (const port of [18789, 5000]) {
      try {
        const pids = require('child_process').execSync(`lsof -ti tcp:${port}`, { stdio: 'pipe' }).toString().trim();
        if (pids) {
          for (const pid of pids.split('\n').filter(Boolean)) {
            try { process.kill(parseInt(pid), 'SIGKILL'); log.push('killed pid ' + pid + ' on port ' + port); } catch {}
          }
        }
      } catch {} // No process on port — fine
    }
    
    // 3. Also kill any lingering openclaw gateway processes
    try {
      const pids = require('child_process').execSync(`pgrep -f "openclaw.*gateway" || true`, { stdio: 'pipe' }).toString().trim();
      if (pids) {
        for (const pid of pids.split('\n').filter(Boolean)) {
          const pidNum = parseInt(pid);
          if (pidNum && pidNum !== process.pid) { // Don't kill ourselves
            try { process.kill(pidNum, 'SIGKILL'); log.push('killed openclaw gateway pid ' + pid); } catch {}
          }
        }
      }
    } catch {}
    
    await new Promise(r => setTimeout(r, 2000)); // Let everything die
    
    // 4. Verify ports are free
    const stillBusy18789 = h.portListeningSync(18789);
    const stillBusy5000 = h.portListeningSync(5000);
    log.push('ports free: 18789=' + !stillBusy18789 + ', 5000=' + !stillBusy5000);
    
    // 5. Full start: install LaunchAgent + patch plist + start
    try {
      const startResult = await h.gatewayFullStart(path.join(h.LOG_DIR, 'gateway.log'));
      log.push('fullStart: ' + startResult.log.join(', '));
    } catch (e) { log.push('start failed: ' + e.message.slice(0, 80)); }
    
    // 6. Check state
    const gw = await h.gatewayState();
    log.push('final state: running=' + gw.running);
    
    // 8. Read last few lines of gateway log for context
    let recentLog = '';
    try {
      const logPath = path.join(h.LOG_DIR, 'gateway.log');
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf-8').split('\n').filter(l => l.trim());
        recentLog = lines.slice(-10).join('\n');
      }
    } catch {}
    
    res.json({ ok: true, running: gw.running, statusText: gw.statusText, log: log.join(' | '), recentLog });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
