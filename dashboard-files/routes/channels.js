/**
 * routes/channels.js — Channels routes
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const h = require('../lib/helpers');
const st = require('../lib/state');

const router = Router();

// ═══ CHANNELS / TELEGRAM ═══
router.get('/api/profiles/:id/channels', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const cfg = h.readJson(pp.configJson, {});
  res.json({ channels: cfg.channels || { telegram: { enabled: !!st.getSettings().telegramBotToken } } });
});
router.get('/api/profiles/:id/channels/status', async (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const r = await h.run(`${h.cliBin()} channels status 2>/dev/null`, { env: st.profileEnvVars(req.params.id), timeout: 10000 });
  res.json({ ok: r.ok, output: h.cleanCli(r.output) });
});
router.get('/api/profiles/:id/pairing', async (req, res) => {
  const r = await h.run(`${h.cliBin()} pairing list telegram 2>/dev/null`, { env: st.profileEnvVars(req.params.id), timeout: 10000 });
  res.json({ ok: r.ok, output: h.cleanCli(r.output) });
});
router.post('/api/profiles/:id/pairing/approve', async (req, res) => {
  const { code } = req.body;
  const r = await h.run(`${h.cliBin()} pairing approve telegram ${code} 2>/dev/null`, { env: st.profileEnvVars(req.params.id), timeout: 10000 });
  res.json({ ok: r.ok, output: h.cleanCli(r.output) });
});
router.get('/api/profiles/:id/telegram/users', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const cfg = h.readJson(pp.configJson, {}); const tg = cfg.channels?.telegram || {};
  const allowFile = path.join(pp.configDir, 'credentials', 'telegram-allowFrom.json');
  const allow = h.readJson(allowFile, null);
  const users = allow?.allowFrom || cfg.pairing?.telegram?.approved || tg.allowedUsers || [];
  res.json({ users, botToken: tg.botToken ? h.maskKey(tg.botToken) : (st.getSettings().telegramBotToken ? h.maskKey(st.getSettings().telegramBotToken) : null), enabled: tg.enabled || !!st.getSettings().telegramBotToken });
});
router.get('/api/profiles/:id/telegram/info', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const cfg = h.readJson(pp.configJson, {}); const tg = cfg.channels?.telegram || {};
  const plugin = cfg.plugins?.entries?.telegram || {};
  const allowFile = path.join(pp.configDir, 'credentials', 'telegram-allowFrom.json');
  const allow = h.readJson(allowFile, null);
  const token = tg.botToken || st.getSettings().telegramBotToken || '';
  res.json({ enabled: !!(tg.enabled || token), botToken: token ? h.maskKey(token) : null, hasToken: !!token, users: allow?.allowFrom || [], pluginEnabled: !!plugin.enabled, channelEnabled: !!tg.enabled });
});
router.post('/api/profiles/:id/telegram/users/add', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const { userId } = req.body; if (!userId) return res.status(400).json({ error: 'userId required' });
  const credDir = path.join(pp.configDir, 'credentials'); fs.mkdirSync(credDir, { recursive: true });
  const allowFile = path.join(credDir, 'telegram-allowFrom.json');
  const allow = h.readJson(allowFile, null) || { version: 1, allowFrom: [] };
  if (!Array.isArray(allow.allowFrom)) allow.allowFrom = [];
  const uid = String(userId).trim();
  if (!allow.allowFrom.some(u => String(u) === uid)) { allow.allowFrom.push(uid); h.writeJson(allowFile, allow); }

  // Also sync to openclaw.json allowFrom (where gateway reads)
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
        if (cfg.channels?.telegram) {
          // Build allowFrom from credentials file (source of truth)
          cfg.channels.telegram.allowFrom = allow.allowFrom.slice();
          // Remove wildcard if specific users exist
          if (allow.allowFrom.length > 0 && !allow.allowFrom.includes('*')) {
            cfg.channels.telegram.dmPolicy = 'allowlist';
          }
          h.writeJson(cfgPath, cfg);
        }
      }
    } catch {}
  }

  res.json({ ok: true, users: allow.allowFrom });
});
router.delete('/api/profiles/:id/telegram/users/:index', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const idx = parseInt(req.params.index);
  const allowFile = path.join(pp.configDir, 'credentials', 'telegram-allowFrom.json');
  const allow = h.readJson(allowFile, null);
  if (!allow || !Array.isArray(allow.allowFrom)) return res.status(404).json({ error: 'No allowFrom file' });
  if (idx < 0 || idx >= allow.allowFrom.length) return res.status(400).json({ error: 'Invalid index' });
  const removed = allow.allowFrom.splice(idx, 1);
  h.writeJson(allowFile, allow);

  // Sync to openclaw.json
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
        if (cfg.channels?.telegram) {
          if (allow.allowFrom.length === 0) {
            // No users left — go back to open
            cfg.channels.telegram.allowFrom = ['*'];
            cfg.channels.telegram.dmPolicy = 'open';
          } else {
            cfg.channels.telegram.allowFrom = allow.allowFrom.slice();
          }
          h.writeJson(cfgPath, cfg);
        }
      }
    } catch {}
  }

  res.json({ ok: true, removed: removed[0], users: allow.allowFrom });
});
router.put('/api/profiles/:id/telegram/setup', async (req, res) => {
  const botToken = String(req.body?.botToken || '').trim();
  if (!botToken || !botToken.includes(':')) return res.status(400).json({ ok: false, error: 'Invalid bot token format' });
  const writeResults = st.writeTelegramTokenEverywhere(botToken);
  // Auto-restart gateway
  let gatewayRestarted = false;
  try {
    await h.gatewayExec(`${h.gatewayStopCommand()} >> "${path.join(h.LOG_DIR, 'gateway.log')}" 2>&1`);
    await h.gatewayExec(`${h.gatewayStartCommand()} >> "${path.join(h.LOG_DIR, 'gateway.log')}" 2>&1`);
    const gw = await h.gatewayState();
    gatewayRestarted = gw.running;
  } catch {}
  res.json({ ok: true, message: 'Telegram bot token saved to all configs.', writeResults, gatewayRestarted, instructions: gatewayRestarted ? 'Gateway restarted! Message your bot with /start.' : 'Start the gateway, then message your bot with /start.' });
});

// ═══ GENERIC CHANNEL SETUP (Discord, WhatsApp, iMessage) ═══
router.get('/api/profiles/:id/channel/:channel', (req, res) => {
  const pp = st.profilePaths(req.params.id); const ch = req.params.channel;
  const cfg = h.readJson(pp.configJson, {}); const env = fs.existsSync(pp.envPath) ? h.readEnv(pp.envPath) : {};
  const plugin = cfg.plugins?.entries?.[ch] || {}; const chanCfg = cfg.channels?.[ch] || {};
  const reveal = req.query.reveal === 'true';
  const info = { enabled: !!plugin.enabled && !!chanCfg.enabled, pluginEnabled: !!plugin.enabled, channelEnabled: !!chanCfg.enabled, config: chanCfg };
  if (ch === 'discord') { info.botToken = env.DISCORD_BOT_TOKEN ? (reveal ? env.DISCORD_BOT_TOKEN : h.maskKey(env.DISCORD_BOT_TOKEN)) : null; info.hasToken = !!env.DISCORD_BOT_TOKEN; info.applicationId = env.DISCORD_APPLICATION_ID || chanCfg.applicationId || ''; info.guildId = env.DISCORD_GUILD_ID || chanCfg.guildId || ''; }
  else if (ch === 'whatsapp') { info.sessionExists = false; info.phoneNumber = env.WHATSAPP_PHONE || chanCfg.phoneNumber || ''; info.apiKey = env.WHATSAPP_API_KEY ? (reveal ? env.WHATSAPP_API_KEY : h.maskKey(env.WHATSAPP_API_KEY)) : null; info.hasApiKey = !!env.WHATSAPP_API_KEY; info.bridgeType = chanCfg.bridge || env.WHATSAPP_BRIDGE || 'baileys'; }
  else if (ch === 'imessage' || ch === 'bluebubbles') { info.serverUrl = env.BLUEBUBBLES_URL || chanCfg.serverUrl || ''; info.password = env.BLUEBUBBLES_PASSWORD ? (reveal ? env.BLUEBUBBLES_PASSWORD : h.maskKey(env.BLUEBUBBLES_PASSWORD)) : null; info.hasPassword = !!env.BLUEBUBBLES_PASSWORD; }
  res.json(info);
});
router.put('/api/profiles/:id/channel/:channel/setup', (req, res) => {
  const pp = st.profilePaths(req.params.id); const ch = req.params.channel;
  const cfg = h.readJson(pp.configJson, {});
  if (fs.existsSync(pp.configJson)) try { fs.writeFileSync(pp.configJson + '.bak', fs.readFileSync(pp.configJson, 'utf-8')); } catch {}
  if (!cfg.plugins) cfg.plugins = {}; if (!cfg.plugins.entries) cfg.plugins.entries = {}; if (!cfg.channels) cfg.channels = {};
  const env = fs.existsSync(pp.envPath) ? h.readEnv(pp.envPath) : {};
  const { enabled } = req.body;
  cfg.plugins.entries[ch] = { enabled: enabled !== false };
  if (ch === 'discord') { const { botToken, applicationId, guildId } = req.body; if (botToken) env.DISCORD_BOT_TOKEN = botToken; if (applicationId !== undefined) env.DISCORD_APPLICATION_ID = applicationId; if (guildId !== undefined) env.DISCORD_GUILD_ID = guildId; cfg.channels.discord = { enabled: enabled !== false }; }
  else if (ch === 'whatsapp') { const { phoneNumber, apiKey, bridgeType } = req.body; if (apiKey) env.WHATSAPP_API_KEY = apiKey; if (phoneNumber !== undefined) env.WHATSAPP_PHONE = phoneNumber; cfg.channels.whatsapp = { enabled: enabled !== false, bridge: bridgeType || 'baileys' }; }
  else if (ch === 'imessage' || ch === 'bluebubbles') { const { serverUrl, password } = req.body; if (serverUrl !== undefined) env.BLUEBUBBLES_URL = serverUrl; if (password) env.BLUEBUBBLES_PASSWORD = password; cfg.channels.bluebubbles = { enabled: enabled !== false }; cfg.plugins.entries.bluebubbles = { enabled: enabled !== false }; }
  if (fs.existsSync(pp.envPath)) h.writeEnv(pp.envPath, env);
  if (fs.existsSync(pp.configJson)) h.writeJson(pp.configJson, cfg);
  res.json({ ok: true, message: ch + ' configured. Restart gateway to apply.' });
});

// ═══ CRON JOB MANAGER ═══
router.get('/api/profiles/:id/cron', async (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const r = await h.run(`${h.cliBin()} cron list 2>/dev/null`, { env: st.profileEnvVars(req.params.id), timeout: 10000 });
  let files = [];
  const cronDirs = [path.join(h.OPENCLAW_STATE_DIR, 'cron'), path.join(h.HOME, '.openclaw', 'cron'), path.join(pp.configDir.replace('.clawdbot', '.openclaw'), 'cron'), path.join(pp.configDir, 'cron')];
  cronDirs.forEach(cronDir => { try { if (fs.existsSync(cronDir)) fs.readdirSync(cronDir).filter(f => f.endsWith('.json') && f !== 'runs').forEach(f => { const j = h.readJson(path.join(cronDir, f), null); if (j && !files.some(x => x.id === j.id)) files.push(j); }); } catch {} });
  const cfg = h.readJson(pp.configJson, {}); const hb = cfg.agents?.defaults?.heartbeat;
  let heartbeat = null;
  if (hb && hb.every) heartbeat = { id: 'heartbeat', name: 'Heartbeat', schedule: hb.every, type: 'heartbeat', enabled: true, config: hb };
  // Parse launchd/crontab on macOS
  const crontab = h.runSync('crontab -l 2>/dev/null');
  if (crontab.ok && crontab.output) {
    crontab.output.split('\n').filter(l => l.trim() && !l.startsWith('#')).forEach((line, i) => {
      const m = line.match(/^([*\/0-9,\-\s]{9,})\s+(.+)$/);
      if (m && !files.some(x => x.id === 'sys-cron-' + i)) {
        const schedule = m[1].trim(), cmd = m[2].trim();
        files.push({ id: 'sys-cron-' + i, name: cmd.match(/([^\s\/]+)$/)?.[1] || 'cron-' + i, schedule, type: 'system', enabled: true, isSystem: true });
      }
    });
  }
  res.json({ ok: r.ok, output: h.cleanCli(r.output), jobs: files, heartbeat });
});
router.post('/api/profiles/:id/cron/add', async (req, res) => {
  const { name, schedule, scheduleType, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'name and message required' });
  let cmd = `${h.cliBin()} cron add --name "${name.replace(/"/g, '\\"')}"`;
  if (scheduleType === 'cron' && schedule) cmd += ` --cron "${schedule}"`;
  else if (scheduleType === 'at' && schedule) cmd += ` --at "${schedule}"`;
  else if (scheduleType === 'every' && schedule) cmd += ` --every "${schedule}"`;
  cmd += ` --message "${message.replace(/"/g, '\\"')}"`;
  const r = await h.run(`${cmd} 2>/dev/null`, { env: st.profileEnvVars(req.params.id), timeout: 15000 });
  res.json({ ok: r.ok, output: h.cleanCli(r.output) });
});
router.post('/api/profiles/:id/cron/:jobId/pause', async (req, res) => { const r = await h.run(`${h.cliBin()} cron pause ${req.params.jobId} 2>/dev/null`, { env: st.profileEnvVars(req.params.id) }); res.json({ ok: r.ok, output: h.cleanCli(r.output) }); });
router.post('/api/profiles/:id/cron/:jobId/resume', async (req, res) => { const r = await h.run(`${h.cliBin()} cron resume ${req.params.jobId} 2>/dev/null`, { env: st.profileEnvVars(req.params.id) }); res.json({ ok: r.ok, output: h.cleanCli(r.output) }); });
router.delete('/api/profiles/:id/cron/:jobId', async (req, res) => { const r = await h.run(`${h.cliBin()} cron remove ${req.params.jobId} 2>/dev/null`, { env: st.profileEnvVars(req.params.id) }); res.json({ ok: r.ok, output: h.cleanCli(r.output) }); });
router.post('/api/profiles/:id/cron/:jobId/run', async (req, res) => { const r = await h.run(`${h.cliBin()} cron run ${req.params.jobId} 2>/dev/null`, { env: st.profileEnvVars(req.params.id), timeout: 30000 }); res.json({ ok: r.ok, output: h.cleanCli(r.output) }); });
router.get('/api/profiles/:id/cron/runs', async (req, res) => { const r = await h.run(`${h.cliBin()} cron runs 2>/dev/null`, { env: st.profileEnvVars(req.params.id) }); res.json({ ok: r.ok, output: h.cleanCli(r.output) }); });


module.exports = router;
