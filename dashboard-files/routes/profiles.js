/**
 * routes/profiles.js — Profiles routes
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const h = require('../lib/helpers');
const st = require('../lib/state');

const router = Router();

// ═══ PROFILES ═══
router.get('/api/profiles', (req, res) => {
  const profiles = st.getProfiles().map(p => {
    const pp = st.profilePaths(p.id);
    let skillCount = 0;
    try { if (fs.existsSync(path.join(pp.workspace, 'skills'))) skillCount = fs.readdirSync(path.join(pp.workspace, 'skills')).filter(f => { try { return fs.statSync(path.join(pp.workspace, 'skills', f)).isDirectory(); } catch { return false; } }).length; } catch {}
    const usage = st.aggregateUsage(pp);
    return {
      ...p, status: p.status || (p.active ? 'running' : 'stopped'), port: p.port || 3000,
      skillCount, hasSoul: !!st.findSoul(pp), hasMemory: fs.existsSync(path.join(pp.workspace, 'MEMORY.md')),
      totalCost: Math.round(usage.totals.estimatedCostUsd * 10000) / 10000,
      totalInput: usage.totals.inputTokens, totalOutput: usage.totals.outputTokens,
      telegramEnabled: !!st.getSettings().telegramBotToken
    };
  });
  res.json({ profiles });
});

router.post('/api/profiles', (req, res) => {
  const list = st.getProfiles();
  const id = `p-${Date.now()}`;
  list.push({ id, name: req.body?.name || `Profile ${list.length + 1}`, active: false, status: 'stopped', port: 3000, notes: req.body?.notes || '', soul: req.body?.soul || '', memoryPath: req.body?.memoryPath || '', createdAt: new Date().toISOString(), lastUsedAt: null });
  st.saveProfiles(list);
  res.json({ ok: true, profiles: list });
});
router.post('/api/profiles/activate', (req, res) => {
  const id = req.body?.id; const now = new Date().toISOString();
  const list = st.getProfiles().map(p => ({ ...p, active: p.id === id, status: p.id === id ? 'running' : (p.status || 'stopped'), port: p.port || 3000, lastUsedAt: p.id === id ? now : p.lastUsedAt }));
  st.saveProfiles(list);
  res.json({ ok: true, profiles: list });
});
router.post('/api/profiles/rename', (req, res) => {
  const { id, name } = req.body || {};
  const list = st.getProfiles().map(p => p.id === id ? { ...p, name: name || p.name } : p);
  st.saveProfiles(list); res.json({ ok: true, profiles: list });
});
router.post('/api/profiles/update', (req, res) => {
  const { id, name, notes, soul, memoryPath } = req.body || {};
  const list = st.getProfiles().map(p => p.id === id ? { ...p, name: name ?? p.name, notes: notes ?? p.notes, soul: soul ?? p.soul, memoryPath: memoryPath ?? p.memoryPath } : p);
  st.saveProfiles(list); res.json({ ok: true, profiles: list });
});
router.post('/api/profiles/delete', (req, res) => {
  const { id } = req.body || {};
  let list = st.getProfiles().filter(p => p.id !== id);
  if (!list.length) list = [{ id: 'default', name: 'Default', active: true, status: 'running', port: 3000, notes: '', createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString() }];
  if (!list.some(p => p.active)) list[0].active = true;
  st.saveProfiles(list); res.json({ ok: true, profiles: list });
});
router.post('/api/profiles/wizard', (req, res) => {
  const name = String(req.body?.name || 'Wizard Profile');
  const list = st.getProfiles().map(p => ({ ...p, active: false }));
  const id = `p-${Date.now()}`;
  list.push({ id, name, active: true, notes: '', soul: '', memoryPath: '', createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString() });
  st.saveProfiles(list);
  res.json({ ok: true, profile: list.find(p => p.id === id), profiles: list });
});

// ═══ PROFILE-LEVEL ENDPOINTS ═══
// Config
router.get('/api/profiles/:id/config', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const cfg = h.readJson(pp.configJson, null);
  if (cfg) return res.json({ config: cfg });
  // Fall back to QuickClaw yaml config
  const raw = fs.existsSync(h.CONFIG_PATH) ? fs.readFileSync(h.CONFIG_PATH, 'utf8') : '';
  res.json({ config: { path: h.CONFIG_PATH, raw } });
});
router.put('/api/profiles/:id/config', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  if (fs.existsSync(pp.configJson)) {
    try { fs.writeFileSync(pp.configJson + '.bak', fs.readFileSync(pp.configJson, 'utf-8')); } catch {}
    fs.writeFileSync(pp.configJson, JSON.stringify(req.body.config, null, 2));
    return res.json({ ok: true });
  }
  res.json({ ok: false, error: 'Config file not found' });
});

// Env (API keys)
router.get('/api/profiles/:id/env', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const reveal = String(req.query.reveal || '').toLowerCase() === 'true';
  // Try real .env first, fall back to dashboard store
  let vars = {};
  if (fs.existsSync(pp.envPath)) {
    vars = h.readEnv(pp.envPath);
  } else {
    vars = st.getProfileEnv(req.params.id);
  }
  if (!reveal) {
    const masked = {};
    Object.entries(vars).forEach(([k, v]) => { masked[k] = /key|secret|token|password|api/i.test(k) ? h.maskKey(v) : v; });
    return res.json({ vars: masked });
  }
  res.json({ vars });
});

router.post('/api/profiles/:id/env/set', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const { key, value } = req.body;
  if (fs.existsSync(pp.envPath)) {
    const v = h.readEnv(pp.envPath); v[key] = value; h.writeEnv(pp.envPath, v);
  } else {
    const store = st.getProfileEnvStore(); store[req.params.id] = store[req.params.id] || {}; store[req.params.id][key] = value; st.saveProfileEnvStore(store);
  }
  res.json({ ok: true });
});

router.delete('/api/profiles/:id/env/:key', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  if (fs.existsSync(pp.envPath)) {
    const v = h.readEnv(pp.envPath); delete v[req.params.key]; h.writeEnv(pp.envPath, v);
  } else {
    const store = st.getProfileEnvStore(); if (store[req.params.id]) delete store[req.params.id][req.params.key]; st.saveProfileEnvStore(store);
  }
  res.json({ ok: true });
});

router.post('/api/profiles/:id/env/:key/toggle', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const { enabled } = req.body;
  if (fs.existsSync(pp.envPath)) {
    const v = h.readEnv(pp.envPath);
    const disabledKey = req.params.key + '_DISABLED';
    if (enabled) delete v[disabledKey]; else v[disabledKey] = 'true';
    h.writeEnv(pp.envPath, v);
  }
  res.json({ ok: true, enabled });
});

router.post('/api/profiles/:id/env/upload', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const { content, merge } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  if (fs.existsSync(pp.envPath)) {
    try { fs.writeFileSync(pp.envPath + '.bak.' + Date.now(), fs.readFileSync(pp.envPath, 'utf-8')); } catch {}
    if (merge) {
      const existing = h.readEnv(pp.envPath); const incoming = {};
      content.split('\n').forEach(l => { l = l.trim(); if (!l || l[0] === '#') return; const eq = l.indexOf('='); if (eq < 1) return; incoming[l.slice(0, eq).trim()] = l.slice(eq + 1).trim(); });
      Object.assign(existing, incoming); h.writeEnv(pp.envPath, existing);
      return res.json({ ok: true, mode: 'merge', keysAdded: Object.keys(incoming).length });
    } else {
      fs.writeFileSync(pp.envPath, content);
      return res.json({ ok: true, mode: 'replace' });
    }
  }
  // Fall back to dashboard store
  const store = st.getProfileEnvStore(); store[req.params.id] = store[req.params.id] || {};
  let keysAdded = 0;
  content.split('\n').forEach(l => { const t = l.trim(); if (!t || t.startsWith('#') || !t.includes('=')) return; const idx = t.indexOf('='); const k = t.slice(0, idx).trim(); if (!k) return; store[req.params.id][k] = t.slice(idx + 1); keysAdded++; });
  st.saveProfileEnvStore(store);
  res.json({ ok: true, keysAdded });
});

router.post('/api/profiles/:id/env/purge', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  if (fs.existsSync(pp.envPath)) {
    const bak = pp.envPath + '.emergency-backup.' + Date.now();
    fs.copyFileSync(pp.envPath, bak);
    const v = h.readEnv(pp.envPath); const purged = [];
    Object.keys(v).forEach(k => { if (/key|secret|token|password|api/i.test(k) && !/DISABLED$/i.test(k)) { purged.push(k); delete v[k]; } });
    h.writeEnv(pp.envPath, v);
    return res.json({ ok: true, purged, backupFile: bak });
  }
  res.json({ ok: true, purged: [] });
});

router.get('/api/profiles/:id/env/download', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  if (fs.existsSync(pp.envPath)) return res.download(pp.envPath, `${req.params.id}-keys.env`);
  const varsObj = st.getProfileEnv(req.params.id);
  const lines = Object.entries(varsObj).map(([k, v]) => `${k}=${v}`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}.env"`);
  res.send(lines.join('\n'));
});

router.get('/api/env/download-all', (req, res) => {
  const store = st.getProfileEnvStore();
  const payload = { exportedAt: new Date().toISOString(), profiles: store };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="all-profile-env.json"');
  res.send(JSON.stringify(payload, null, 2));
});

// Profile start/stop/restart (gateway commands)
['restart', 'stop', 'start'].forEach(action => {
  router.post(`/api/profiles/:id/${action}`, async (req, res) => {
    const cmd = action === 'start' ? h.gatewayStartCommand() : (action === 'stop' ? h.gatewayStopCommand() : `${h.gatewayStopCommand()} && ${h.gatewayStartCommand()}`);
    const profileEnv = st.profileEnvVars(req.params.id);
    const result = await h.gatewayExec(`${cmd} >> "${path.join(h.LOG_DIR, 'gateway.log')}" 2>&1`, { env: profileEnv });
    const gw = await h.gatewayState();
    res.json({ ok: true, status: gw.running ? 'running' : 'stopped' });
  });
});

// ═══ SKILLS ═══
router.get('/api/profiles/:id/skills', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const sd = path.join(pp.workspace, 'skills');
  const states = st.getSkillStates(pp);
  try {
    const sk = fs.readdirSync(sd).filter(f => { try { return fs.statSync(path.join(sd, f)).isDirectory(); } catch { return false; } }).map(n => {
      let m = {}; const mf = path.join(sd, n, 'skill.json'); if (fs.existsSync(mf)) m = h.readJson(mf, {});
      return { name: n, description: m.description || '', enabled: states[n] !== false };
    });
    res.json({ skills: sk });
  } catch { res.json({ skills: st.getSkills() }); }
});
router.post('/api/profiles/:id/skills/:skill/toggle', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const { enabled } = req.body; const states = st.getSkillStates(pp); states[req.params.skill] = enabled; st.saveSkillStates(pp, states);
  const ap = path.join(pp.workspace, 'skills', req.params.skill), dp = ap + '.disabled';
  if (enabled && fs.existsSync(dp) && !fs.existsSync(ap)) fs.renameSync(dp, ap);
  else if (!enabled && fs.existsSync(ap)) fs.renameSync(ap, dp);
  res.json({ ok: true });
});
router.delete('/api/profiles/:id/skills/:skill', async (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const sp = path.join(pp.workspace, 'skills', req.params.skill);
  await h.run(`rm -rf "${sp}" "${sp}.disabled"`);
  res.json({ ok: true });
});

// ═══ SOUL ═══
router.get('/api/profiles/:id/soul', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const sp = st.findSoul(pp);
  if (!sp) { const p = st.getProfiles().find(x => x.id === req.params.id); return res.json({ content: p?.soul || '', exists: false }); }
  res.json({ content: fs.readFileSync(sp, 'utf-8'), exists: true });
});
router.put('/api/profiles/:id/soul', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  let sp = st.findSoul(pp) || path.join(pp.workspace, 'soul.md');
  if (fs.existsSync(sp)) try { fs.writeFileSync(sp + '.bak', fs.readFileSync(sp, 'utf-8')); } catch {}
  fs.mkdirSync(path.dirname(sp), { recursive: true });
  fs.writeFileSync(sp, req.body.content);
  res.json({ ok: true });
});

// ═══ MODELS ═══
router.get('/api/profiles/:id/models', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const cfg = h.readJson(pp.configJson, {});
  const env = fs.existsSync(pp.envPath) ? h.readEnv(pp.envPath) : st.getProfileEnv(req.params.id);
  let agentModel = null, agentModelPath = null;
  if (cfg.agents?.defaults?.model?.primary) { agentModel = cfg.agents.defaults.model.primary; agentModelPath = 'agents.defaults.model.primary'; }
  else if (typeof cfg.agents?.defaults?.model === 'string') { agentModel = cfg.agents.defaults.model; agentModelPath = 'agents.defaults.model (STRING)'; }
  else if (env.DEFAULT_MODEL) { agentModel = env.DEFAULT_MODEL; agentModelPath = 'env:DEFAULT_MODEL'; }
  const availableModels = cfg.agents?.defaults?.models ? Object.keys(cfg.agents.defaults.models) : [];
  const rawConfig = {};
  function scan(o, pfx) { if (!o || typeof o !== 'object') return; Object.entries(o).forEach(([k, v]) => { const fk = pfx ? pfx + '.' + k : k; if (/model|provider/i.test(k) && !/plugin|embedding|lancedb|memory/i.test(fk)) rawConfig[fk] = v; if (typeof v === 'object' && !Array.isArray(v) && !/plugin|entries/i.test(k)) scan(v, fk); }); }
  scan(cfg, '');
  Object.entries(env).forEach(([k, v]) => { if (/model|provider/i.test(k)) rawConfig['env:' + k] = v; });
  res.json({ models: { agentModel, agentModelPath, availableModels, rawConfig } });
});

router.put('/api/profiles/:id/models', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const { model, key, value, target } = req.body;
  const cfg = h.readJson(pp.configJson, {});
  if (fs.existsSync(pp.configJson)) try { fs.writeFileSync(pp.configJson + '.bak', fs.readFileSync(pp.configJson, 'utf-8')); } catch {}
  if (model) {
    if (!cfg.agents) cfg.agents = {}; if (!cfg.agents.defaults) cfg.agents.defaults = {};
    if (!cfg.agents.defaults.model || typeof cfg.agents.defaults.model !== 'object') cfg.agents.defaults.model = {};
    cfg.agents.defaults.model.primary = model;
    if (!cfg.agents.defaults.models) cfg.agents.defaults.models = {};
    if (!cfg.agents.defaults.models[model]) cfg.agents.defaults.models[model] = {};
    h.writeJson(pp.configJson, cfg);
    return res.json({ ok: true, agentModel: model });
  }
  if (target === 'env' && fs.existsSync(pp.envPath)) { const v = h.readEnv(pp.envPath); if (value === null || value === '') delete v[key]; else v[key] = value; h.writeEnv(pp.envPath, v); }
  else if (key) { const ks = key.split('.'); let o = cfg; for (let i = 0; i < ks.length - 1; i++) { if (!o[ks[i]]) o[ks[i]] = {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = value; h.writeJson(pp.configJson, cfg); }
  res.json({ ok: true });
});

router.get('/api/profiles/:id/logs', (req, res) => {
  const lines = parseInt(req.query.lines || '150', 10);
  const logs = h.tailFile('gateway.log', lines);
  res.json({ ok: true, logs });
});

// ═══ USAGE ═══
router.get('/api/profiles/:id/usage', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const usage = st.aggregateUsage(pp);
  if (usage.noData) usage.hint = 'No usage-log.json found. Token tracking requires OpenClaw to write usage data during sessions.';
  res.json(usage);
});

router.get('/api/usage/all', (req, res) => {
  const all = {}; let gIn = 0, gOut = 0, gCost = 0;
  for (const p of st.getProfiles()) {
    const pp = st.profilePaths(p.id);
    const u = st.aggregateUsage(pp);
    all[p.id] = { inputTokens: u.totals.inputTokens, outputTokens: u.totals.outputTokens, cost: u.totals.estimatedCostUsd, lastModified: u.lastModified, daysTracked: u.daysTracked, sources: u.sources };
    gIn += u.totals.inputTokens; gOut += u.totals.outputTokens; gCost += u.totals.estimatedCostUsd;
  }
  res.json({ profiles: all, totals: { inputTokens: gIn, outputTokens: gOut, cost: Math.round(gCost * 10000) / 10000 } });
});

// ═══ SESSIONS / MEMORY BROWSER ═══
router.get('/api/profiles/:id/sessions', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const locs = [path.join(pp.configDir, 'agents', 'main', 'sessions', 'sessions.json'), path.join(pp.configDir, 'sessions', 'sessions.json')];
  let sessions = null; for (const l of locs) if (fs.existsSync(l)) { sessions = h.readJson(l, null); break; }
  const memDir = path.join(pp.workspace, 'memory'); let memFiles = [];
  if (fs.existsSync(memDir)) try {
    memFiles = fs.readdirSync(memDir).filter(f => (f.endsWith('.md') || f.endsWith('.json')) && !f.startsWith('.')).sort().reverse().map(f => {
      const fp = path.join(memDir, f); const st = fs.statSync(fp); const c = fs.readFileSync(fp, 'utf-8');
      return { name: f, size: c.length, modified: st.mtime.toISOString(), preview: c.slice(0, 500), type: f.endsWith('.json') ? 'json' : 'markdown' };
    });
  } catch {}
  const special = [];
  ['MEMORY.md', 'HEARTBEAT.md', 'TODO.md', 'STATUS.md'].forEach(f => {
    const fp = path.join(pp.workspace, f);
    if (fs.existsSync(fp)) { const c = fs.readFileSync(fp, 'utf-8'); special.push({ name: f, size: c.length, preview: c.slice(0, 500), type: 'markdown', location: 'workspace' }); }
  });
  res.json({ sessions: sessions || {}, memoryFiles: memFiles, specialFiles: special });
});

router.get('/api/profiles/:id/memory/:file', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  let fp = path.join(pp.workspace, 'memory', req.params.file);
  if (!fs.existsSync(fp)) fp = path.join(pp.workspace, req.params.file);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  res.json({ content: fs.readFileSync(fp, 'utf-8') });
});
router.put('/api/profiles/:id/memory/:file', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  let fp = path.join(pp.workspace, 'memory', req.params.file);
  if (!fs.existsSync(fp)) fp = path.join(pp.workspace, req.params.file);
  if (fs.existsSync(fp)) try { fs.writeFileSync(fp + '.bak', fs.readFileSync(fp, 'utf-8')); } catch {}
  fs.writeFileSync(fp, req.body.content); res.json({ ok: true });
});
router.delete('/api/profiles/:id/memory/:file', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const fp = path.join(pp.workspace, 'memory', req.params.file);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  const archDir = path.join(pp.workspace, 'memory-archive'); fs.mkdirSync(archDir, { recursive: true });
  fs.renameSync(fp, path.join(archDir, req.params.file));
  res.json({ ok: true, message: 'Archived' });
});

router.get('/api/profiles/:id/activity', (req, res) => {
  const events = [];
  const gwLog = h.tailFile('gateway.log', 50);
  if (gwLog) {
    gwLog.split('\n').forEach(line => {
      if (!line.trim()) return;
      let type = 'system', icon = '⚙️', msg = line.trim();
      if (/tool|skill/i.test(msg)) { type = 'tool'; icon = '🔧'; }
      else if (/telegram|channel|message.*received/i.test(msg)) { type = 'message'; icon = '💬'; }
      else if (/cron|heartbeat/i.test(msg)) { type = 'cron'; icon = '⏰'; }
      else if (/error|fail/i.test(msg)) { type = 'error'; icon = '❌'; }
      else if (/start|running|active/i.test(msg)) { type = 'status'; icon = '🟢'; }
      events.push({ time: new Date().toISOString(), type, icon, message: msg.slice(0, 200) });
    });
  }
  res.json({ events: events.reverse().slice(0, 50) });
});


module.exports = router;
