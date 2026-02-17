/**
 * OpenClaw Command Center v1.6
 * Dashboard server — auto-detects install location (local Mac or SSD)
 *
 * Path detection:
 *   This file lives at <INSTALL_ROOT>/dashboard/server.js
 *   So INSTALL_ROOT = path.resolve(__dirname, '..')
 *   Workspace, env, logs, backups are all relative to INSTALL_ROOT.
 *   ~/.openclaw is always the config dir (OpenClaw standard).
 */
const express = require('express');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

// ═══ AUTO-DETECT PATHS ═══
// Derive everything from where this file actually lives
const INSTALL_ROOT = process.env.OPENCLAW_ROOT || path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(process.env.HOME, '.openclaw');
const WORKSPACE = path.join(INSTALL_ROOT, 'workspace');
const PORT = process.env.DASHBOARD_PORT || 18810;

// Detect if running from external volume
const IS_SSD = INSTALL_ROOT.startsWith('/Volumes/');
const VOLUME_NAME = IS_SSD ? INSTALL_ROOT.split('/')[2] : null;

const AUTH_TOKEN = process.env.DASHBOARD_TOKEN || (() => {
  const tf = path.join(INSTALL_ROOT, 'dashboard', '.auth-token');
  if (fs.existsSync(tf)) return fs.readFileSync(tf, 'utf-8').trim();
  const t = crypto.randomBytes(24).toString('hex');
  try { fs.writeFileSync(tf, t); fs.chmodSync(tf, 0o600); } catch {}
  return t;
})();

// Read gateway port from config
const cfgBoot = (() => { try { return JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'openclaw.json'), 'utf-8')); } catch { return {}; } })();
const GATEWAY_PORT = cfgBoot?.gateway?.port || 18789;

const PROFILE = {
  id: 'main',
  configDir: CONFIG_DIR,
  workspace: WORKSPACE,
  port: GATEWAY_PORT,
  name: IS_SSD ? 'OpenClaw SSD' : 'OpenClaw'
};

const app = express();
const server = http.createServer(app);
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ═══ HELPERS ═══
function auth(req, res, next) {
  const t = req.query.token || req.headers['x-auth-token'];
  if (t !== AUTH_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

const FNM_NODE = path.join(INSTALL_ROOT, 'env', '.fnm', 'aliases', 'default', 'bin');
const NPM_GLOBAL = path.join(INSTALL_ROOT, 'env', '.npm-global', 'bin');
const EP = `${NPM_GLOBAL}:${FNM_NODE}:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`;
const BASE_ENV = {
  ...process.env,
  PATH: EP,
  FNM_DIR: path.join(INSTALL_ROOT, 'env', '.fnm'),
  NPM_CONFIG_PREFIX: path.join(INSTALL_ROOT, 'env', '.npm-global'),
  OPENCLAW_CONFIG_DIR: CONFIG_DIR,
  HOME: process.env.HOME
};

function run(cmd, opts = {}) {
  try {
    return { ok: true, output: execSync(cmd, {
      encoding: 'utf-8', timeout: opts.timeout || 15000,
      env: { ...BASE_ENV, ...opts.env }, ...opts
    }).trim() };
  } catch (e) {
    return { ok: false, output: ((e.stderr || '') + '\n' + (e.stdout || '')).trim() };
  }
}

function readJSON(fp) { try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return null; } }
function writeJSON(fp, d) { fs.writeFileSync(fp, JSON.stringify(d, null, 2)); }
function readEnv(fp) {
  try {
    const v = {};
    fs.readFileSync(fp, 'utf-8').split('\n').forEach(l => {
      l = l.trim(); if (!l || l[0] === '#') return;
      const eq = l.indexOf('='); if (eq < 1) return;
      let val = l.slice(eq + 1).trim();
      if ((val[0] === '"' && val.slice(-1) === '"') || (val[0] === "'" && val.slice(-1) === "'")) val = val.slice(1, -1);
      v[l.slice(0, eq).trim()] = val;
    });
    return v;
  } catch { return {}; }
}
function writeEnv(fp, v) { fs.writeFileSync(fp, Object.entries(v).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'); }
function maskKey(k) { return (!k || k.length < 8) ? '••••••••' : k.slice(0, 6) + '••••' + k.slice(-4); }
function cleanCli(s) { return (s || '').replace(/.*ExperimentalWarning.*\n?/g, '').replace(/.*🦞.*\n?/g, '').replace(/\(Use `node.*\n?/g, '').replace(/.*OpenAI-compatible.*\n?/g, '').trim(); }

function isGatewayRunning() {
  const r = run('pgrep -f "openclaw.gateway"', { timeout: 3000 });
  return r.ok && r.output.trim().length > 0;
}

function getGatewayPid() {
  const r = run('pgrep -f "openclaw.gateway"', { timeout: 3000 });
  return r.ok ? r.output.trim().split('\n')[0] : null;
}

function getUptime() {
  const pid = getGatewayPid();
  if (!pid) return null;
  const r = run(`ps -o etime= -p ${pid}`, { timeout: 3000 });
  return r.ok ? r.output.trim() : null;
}

function findSoul() {
  const cfg = readJSON(path.join(CONFIG_DIR, 'openclaw.json'));
  const paths = [];
  if (cfg?.agents?.defaults?.soulFile) paths.push(path.resolve(WORKSPACE, cfg.agents.defaults.soulFile));
  paths.push(path.join(WORKSPACE, 'SOUL.md'), path.join(WORKSPACE, 'soul.md'), path.join(CONFIG_DIR, 'soul.md'));
  for (const x of paths) if (fs.existsSync(x)) return x;
  return null;
}

// ═══ HEALTH CHECK (used by launcher scripts) ═══
app.get('/api/health', (req, res) => {
  res.json({ ok: true, port: PORT, timestamp: Date.now() });
});

// ═══ PROFILES (single profile, compatible API) ═══
app.get('/api/profiles', auth, (req, res) => {
  const cfg = readJSON(path.join(CONFIG_DIR, 'openclaw.json')) || {};
  const status = isGatewayRunning() ? 'running' : 'stopped';
  let sc = 0;
  try { sc = fs.readdirSync(path.join(WORKSPACE, 'skills')).filter(f => { try { return fs.statSync(path.join(WORKSPACE, 'skills', f)).isDirectory(); } catch { return false; } }).length; } catch {}
  let totalCost = 0, totalIn = 0, totalOut = 0;
  const usage = readJSON(path.join(WORKSPACE, 'memory', 'usage-log.json'));
  if (usage?.entries) usage.entries.forEach(e => { if (e.totals) { totalCost += e.totals.estimatedCostUsd || 0; totalIn += e.totals.inputTokens || 0; totalOut += e.totals.outputTokens || 0; } });
  const tg = cfg?.channels?.telegram;
  let cronCount = 0;
  const cronDir = path.join(CONFIG_DIR, 'cron');
  try { if (fs.existsSync(cronDir)) cronCount = fs.readdirSync(cronDir).filter(f => f.endsWith('.json') && f !== 'runs').length; } catch {}
  res.json({ profiles: [{
    id: 'main', name: cfg?.meta?.name || cfg?.agents?.defaults?.name || PROFILE.name, port: PROFILE.port,
    service: 'local', status, uptime: status === 'running' ? getUptime() : null,
    skillCount: sc, hasSoul: !!findSoul(),
    hasMemory: fs.existsSync(path.join(WORKSPACE, 'MEMORY.md')),
    totalCost: Math.round(totalCost * 10000) / 10000,
    totalInput: totalIn, totalOutput: totalOut,
    telegramEnabled: !!tg?.enabled, cronCount
  }] });
});

// Service control (Mac — process-based, not systemd)
app.post('/api/profiles/:id/start', auth, (req, res) => {
  if (isGatewayRunning()) return res.json({ ok: true, status: 'running', message: 'Already running' });
  const child = spawn('openclaw', ['gateway'], {
    cwd: WORKSPACE, detached: true, stdio: ['ignore', 'ignore', 'ignore'],
    env: BASE_ENV
  });
  child.unref();
  setTimeout(() => { res.json({ ok: true, status: isGatewayRunning() ? 'running' : 'starting' }); }, 2000);
});
app.post('/api/profiles/:id/stop', auth, (req, res) => {
  run('pkill -f "openclaw.gateway"', { timeout: 5000 });
  setTimeout(() => { res.json({ ok: true, status: isGatewayRunning() ? 'running' : 'stopped' }); }, 1000);
});
app.post('/api/profiles/:id/restart', auth, (req, res) => {
  run('pkill -f "openclaw.gateway"', { timeout: 5000 });
  setTimeout(() => {
    const child = spawn('openclaw', ['gateway'], {
      cwd: WORKSPACE, detached: true, stdio: ['ignore', 'ignore', 'ignore'],
      env: BASE_ENV
    });
    child.unref();
    setTimeout(() => { res.json({ ok: true, status: isGatewayRunning() ? 'running' : 'starting' }); }, 2000);
  }, 1500);
});

// ═══ CONFIG ═══
app.get('/api/profiles/:id/config', auth, (req, res) => {
  res.json({ config: readJSON(path.join(CONFIG_DIR, 'openclaw.json')) || {} });
});
app.put('/api/profiles/:id/config', auth, (req, res) => {
  const cp = path.join(CONFIG_DIR, 'openclaw.json');
  try { fs.writeFileSync(cp + '.bak', fs.readFileSync(cp, 'utf-8')); } catch {}
  fs.writeFileSync(cp, JSON.stringify(req.body.config, null, 2));
  res.json({ ok: true });
});

// ═══ ENV / API KEYS ═══
app.get('/api/profiles/:id/env', auth, (req, res) => {
  const credDir = path.join(CONFIG_DIR, 'credentials');
  const vars = {};
  try {
    if (fs.existsSync(credDir)) {
      fs.readdirSync(credDir).forEach(f => {
        if (f.endsWith('.json')) {
          const d = readJSON(path.join(credDir, f));
          if (d) Object.entries(d).forEach(([k, v]) => {
            if (typeof v === 'string') vars[f.replace('.json', '') + ':' + k] = v;
          });
        }
      });
    }
  } catch {}
  const envFile = path.join(CONFIG_DIR, '.env');
  Object.assign(vars, readEnv(envFile));
  const cfg = readJSON(path.join(CONFIG_DIR, 'openclaw.json')) || {};
  if (cfg.skills?.entries) {
    Object.entries(cfg.skills.entries).forEach(([sk, sv]) => {
      if (sv.env) Object.entries(sv.env).forEach(([k, v]) => { vars['skill:' + sk + ':' + k] = v; });
    });
  }
  if (cfg.tools?.web?.search?.apiKey) vars['BRAVE_API_KEY'] = cfg.tools.web.search.apiKey;
  if (req.query.reveal === 'true') return res.json({ vars });
  const m = {};
  Object.entries(vars).forEach(([k, v]) => { m[k] = /key|secret|token|password|api/i.test(k) ? maskKey(v) : v; });
  res.json({ vars: m });
});
app.post('/api/profiles/:id/env/set', auth, (req, res) => {
  const { key, value } = req.body;
  const envFile = path.join(CONFIG_DIR, '.env');
  const v = readEnv(envFile); v[key] = value; writeEnv(envFile, v);
  res.json({ ok: true });
});
app.delete('/api/profiles/:id/env/:key', auth, (req, res) => {
  const envFile = path.join(CONFIG_DIR, '.env');
  const v = readEnv(envFile); delete v[req.params.key]; writeEnv(envFile, v);
  res.json({ ok: true });
});

// ═══ SKILLS ═══
app.get('/api/profiles/:id/skills', auth, (req, res) => {
  const sd = path.join(WORKSPACE, 'skills');
  try {
    const sk = fs.readdirSync(sd).filter(f => { try { return fs.statSync(path.join(sd, f)).isDirectory(); } catch { return false; } })
      .map(n => { let m = {}; const mf = path.join(sd, n, 'skill.json'); if (fs.existsSync(mf)) m = readJSON(mf) || {}; return { name: n, description: m.description || '', enabled: true }; });
    res.json({ skills: sk });
  } catch { res.json({ skills: [] }); }
});
app.delete('/api/profiles/:id/skills/:skill', auth, (req, res) => {
  const sp = path.join(WORKSPACE, 'skills', req.params.skill);
  run('rm -rf "' + sp + '"');
  res.json({ ok: true });
});
app.post('/api/profiles/:id/skills/:skill/copy', auth, (req, res) => {
  // stub for multi-profile compat
  res.json({ ok: true });
});

// ═══ SOUL ═══
app.get('/api/profiles/:id/soul', auth, (req, res) => {
  const sp = findSoul();
  if (!sp) return res.json({ content: '', exists: false });
  res.json({ content: fs.readFileSync(sp, 'utf-8'), exists: true });
});
app.put('/api/profiles/:id/soul', auth, (req, res) => {
  let sp = findSoul() || path.join(WORKSPACE, 'SOUL.md');
  if (fs.existsSync(sp)) try { fs.writeFileSync(sp + '.bak', fs.readFileSync(sp, 'utf-8')); } catch {}
  fs.writeFileSync(sp, req.body.content);
  res.json({ ok: true });
});

// ═══ MODELS ═══
app.get('/api/profiles/:id/models', auth, (req, res) => {
  const cfg = readJSON(path.join(CONFIG_DIR, 'openclaw.json')) || {};
  const m = { rawConfig: {} };
  function ex(o, pfx) {
    if (!o || typeof o !== 'object') return;
    Object.entries(o).forEach(([k, v]) => {
      const fk = pfx ? pfx + '.' + k : k;
      if (/model|provider|llm|ai|engine/i.test(k)) m.rawConfig[fk] = v;
      if (typeof v === 'object' && !Array.isArray(v)) ex(v, fk);
    });
  }
  ex(cfg, '');
  res.json({ models: m });
});
app.put('/api/profiles/:id/models', auth, (req, res) => {
  const { key, value } = req.body;
  const cp = path.join(CONFIG_DIR, 'openclaw.json');
  const cfg = readJSON(cp) || {};
  const ks = key.split('.');
  let o = cfg;
  for (let i = 0; i < ks.length - 1; i++) { if (!o[ks[i]]) o[ks[i]] = {}; o = o[ks[i]]; }
  o[ks[ks.length - 1]] = value;
  try { fs.writeFileSync(cp + '.bak', fs.readFileSync(cp, 'utf-8')); } catch {}
  writeJSON(cp, cfg);
  res.json({ ok: true });
});

// ═══ TOKEN USAGE ═══
app.get('/api/profiles/:id/usage', auth, (req, res) => {
  const usage = readJSON(path.join(WORKSPACE, 'memory', 'usage-log.json'));
  if (!usage?.entries) return res.json({ totals: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, totalTokens: 0 }, byModel: {}, byDay: [] });
  let tIn = 0, tOut = 0, tCost = 0; const byModel = {}, byDay = [];
  usage.entries.forEach(e => {
    const day = { date: e.date, inputTokens: e.totals?.inputTokens || 0, outputTokens: e.totals?.outputTokens || 0, cost: e.totals?.estimatedCostUsd || 0, sessions: e.sessions?.length || 0 };
    tIn += day.inputTokens; tOut += day.outputTokens; tCost += day.cost; byDay.push(day);
    if (e.sessions) e.sessions.forEach(s => {
      const m = s.model || 'unknown';
      if (!byModel[m]) byModel[m] = { inputTokens: 0, outputTokens: 0, cost: 0, sessions: 0 };
      byModel[m].inputTokens += s.inputTokens || 0; byModel[m].outputTokens += s.outputTokens || 0;
      byModel[m].cost += s.estimatedCostUsd || 0; byModel[m].sessions++;
    });
  });
  const daysTracked = byDay.length || 1; const avgDaily = tCost / daysTracked;
  res.json({ totals: { inputTokens: tIn, outputTokens: tOut, estimatedCostUsd: Math.round(tCost * 10000) / 10000, totalTokens: tIn + tOut }, byModel, byDay: byDay.slice(-30), daysTracked, avgDailyCost: Math.round(avgDaily * 10000) / 10000, projected30d: Math.round(avgDaily * 30 * 10000) / 10000 });
});
app.get('/api/usage/all', auth, (req, res) => {
  const u = readJSON(path.join(WORKSPACE, 'memory', 'usage-log.json'));
  let i = 0, o = 0, c = 0;
  if (u?.entries) u.entries.forEach(e => { if (e.totals) { i += e.totals.inputTokens || 0; o += e.totals.outputTokens || 0; c += e.totals.estimatedCostUsd || 0; } });
  res.json({ profiles: { main: { inputTokens: i, outputTokens: o, cost: Math.round(c * 10000) / 10000 } }, totals: { inputTokens: i, outputTokens: o, cost: Math.round(c * 10000) / 10000 }, projected30d: 0 });
});

// ═══ TELEGRAM ═══
app.get('/api/profiles/:id/channels', auth, (req, res) => {
  const cfg = readJSON(path.join(CONFIG_DIR, 'openclaw.json')) || {};
  res.json({ channels: cfg.channels || {} });
});
app.get('/api/profiles/:id/channels/status', auth, (req, res) => {
  const r = run('openclaw channels status 2>/dev/null', { timeout: 10000 });
  res.json({ ok: r.ok, output: cleanCli(r.output) });
});
app.get('/api/profiles/:id/telegram/users', auth, (req, res) => {
  const cfg = readJSON(path.join(CONFIG_DIR, 'openclaw.json')) || {};
  const tg = cfg.channels?.telegram || {};
  const allowFile = path.join(CONFIG_DIR, 'credentials', 'telegram-allowFrom.json');
  const allow = readJSON(allowFile);
  const users = allow?.allowFrom || [];
  res.json({ users, botToken: tg.botToken ? maskKey(tg.botToken) : null, enabled: tg.enabled || false });
});
app.get('/api/profiles/:id/pairing', auth, (req, res) => {
  const r = run('openclaw pairing list telegram 2>/dev/null', { timeout: 10000 });
  res.json({ ok: r.ok, output: cleanCli(r.output) });
});
app.post('/api/profiles/:id/pairing/approve', auth, (req, res) => {
  const { code } = req.body;
  const r = run('openclaw pairing approve telegram ' + code + ' 2>/dev/null', { timeout: 10000 });
  res.json({ ok: r.ok, output: cleanCli(r.output) });
});

// ═══ MEMORY BROWSER ═══
app.get('/api/profiles/:id/sessions', auth, (req, res) => {
  const memDir = path.join(WORKSPACE, 'memory');
  let memFiles = [];
  if (fs.existsSync(memDir)) try {
    memFiles = fs.readdirSync(memDir).filter(f => (f.endsWith('.md') || f.endsWith('.json')) && !f.startsWith('.'))
      .sort().reverse().map(f => {
        const fp = path.join(memDir, f); const st = fs.statSync(fp); const c = fs.readFileSync(fp, 'utf-8');
        return { name: f, size: c.length, modified: st.mtime.toISOString(), preview: c.slice(0, 500), type: f.endsWith('.json') ? 'json' : 'markdown' };
      });
  } catch {}
  const special = [];
  ['MEMORY.md', 'HEARTBEAT.md', 'TODO.md', 'STATUS.md', 'SOUL.md'].forEach(f => {
    const fp = path.join(WORKSPACE, f);
    if (fs.existsSync(fp)) { const c = fs.readFileSync(fp, 'utf-8'); special.push({ name: f, size: c.length, preview: c.slice(0, 500), type: 'markdown', location: 'workspace' }); }
  });
  res.json({ sessions: {}, memoryFiles: memFiles, specialFiles: special });
});
app.get('/api/profiles/:id/memory/:file', auth, (req, res) => {
  let fp = path.join(WORKSPACE, 'memory', req.params.file);
  if (!fs.existsSync(fp)) fp = path.join(WORKSPACE, req.params.file);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  res.json({ content: fs.readFileSync(fp, 'utf-8') });
});
app.put('/api/profiles/:id/memory/:file', auth, (req, res) => {
  let fp = path.join(WORKSPACE, 'memory', req.params.file);
  if (!fs.existsSync(fp)) fp = path.join(WORKSPACE, req.params.file);
  if (fs.existsSync(fp)) try { fs.writeFileSync(fp + '.bak', fs.readFileSync(fp, 'utf-8')); } catch {}
  fs.writeFileSync(fp, req.body.content);
  res.json({ ok: true });
});
app.delete('/api/profiles/:id/memory/:file', auth, (req, res) => {
  const fp = path.join(WORKSPACE, 'memory', req.params.file);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  const archDir = path.join(WORKSPACE, 'memory-archive');
  fs.mkdirSync(archDir, { recursive: true });
  fs.renameSync(fp, path.join(archDir, req.params.file));
  res.json({ ok: true, message: 'Archived' });
});

// ═══ PROFILE RESET ═══
app.post('/api/profiles/:id/reset', auth, (req, res) => {
  const { resetSoul, resetMemory, resetSessions } = req.body;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(WORKSPACE, 'reset-backup-' + ts);
  fs.mkdirSync(backupDir, { recursive: true });
  const actions = [];
  if (resetSoul) {
    const sp = findSoul();
    if (sp && fs.existsSync(sp)) {
      fs.copyFileSync(sp, path.join(backupDir, path.basename(sp)));
      fs.writeFileSync(sp, '# OpenClaw Agent\n\nYou are a helpful AI assistant.\n');
      actions.push('Soul reset to default');
    }
  }
  if (resetMemory) {
    const memDir = path.join(WORKSPACE, 'memory');
    if (fs.existsSync(memDir)) {
      run('cp -r "' + memDir + '" "' + path.join(backupDir, 'memory') + '"');
      fs.readdirSync(memDir).forEach(f => { if (f.endsWith('.md')) try { fs.unlinkSync(path.join(memDir, f)); } catch {} });
      actions.push('Memory files cleared');
    }
    const mm = path.join(WORKSPACE, 'MEMORY.md');
    if (fs.existsSync(mm)) { fs.copyFileSync(mm, path.join(backupDir, 'MEMORY.md')); fs.unlinkSync(mm); actions.push('MEMORY.md removed'); }
  }
  if (resetSessions) {
    const sessDir = path.join(CONFIG_DIR, 'agents', 'main', 'sessions');
    if (fs.existsSync(sessDir)) {
      run('cp -r "' + sessDir + '" "' + path.join(backupDir, 'sessions-bak') + '"');
      fs.readdirSync(sessDir).forEach(f => { try { fs.unlinkSync(path.join(sessDir, f)); } catch {} });
      actions.push('Sessions cleared');
    }
  }
  res.json({ ok: true, actions, backupDir });
});

// ═══ CRON JOBS ═══
app.get('/api/profiles/:id/cron', auth, (req, res) => {
  const r = run('openclaw cron list 2>/dev/null', { timeout: 10000 });
  let files = [];
  const cronDir = path.join(CONFIG_DIR, 'cron');
  try { if (fs.existsSync(cronDir)) files = fs.readdirSync(cronDir).filter(f => f.endsWith('.json') && f !== 'runs').map(f => readJSON(path.join(cronDir, f))).filter(Boolean); } catch {}
  res.json({ ok: r.ok, output: cleanCli(r.output), jobs: files });
});
app.post('/api/profiles/:id/cron/add', auth, (req, res) => {
  const { name, schedule, scheduleType, timezone, session, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'name and message required' });
  let cmd = 'openclaw cron add --name "' + name.replace(/"/g, '\\"') + '"';
  if (scheduleType === 'cron' && schedule) cmd += ' --cron "' + schedule + '"';
  else if (scheduleType === 'at' && schedule) cmd += ' --at "' + schedule + '"';
  else if (scheduleType === 'every' && schedule) cmd += ' --every "' + schedule + '"';
  if (timezone) cmd += ' --tz "' + timezone + '"';
  cmd += ' --session ' + (session || 'isolated');
  if (session === 'main') cmd += ' --system-event "' + message.replace(/"/g, '\\"') + '"';
  else cmd += ' --message "' + message.replace(/"/g, '\\"') + '"';
  const r = run(cmd + ' 2>/dev/null', { timeout: 15000 });
  res.json({ ok: r.ok, output: cleanCli(r.output) });
});
app.post('/api/profiles/:id/cron/:jobId/pause', auth, (req, res) => { const r = run('openclaw cron pause ' + req.params.jobId + ' 2>/dev/null', { timeout: 10000 }); res.json({ ok: r.ok, output: cleanCli(r.output) }); });
app.post('/api/profiles/:id/cron/:jobId/resume', auth, (req, res) => { const r = run('openclaw cron resume ' + req.params.jobId + ' 2>/dev/null', { timeout: 10000 }); res.json({ ok: r.ok, output: cleanCli(r.output) }); });
app.delete('/api/profiles/:id/cron/:jobId', auth, (req, res) => { const r = run('openclaw cron remove ' + req.params.jobId + ' 2>/dev/null', { timeout: 10000 }); res.json({ ok: r.ok, output: cleanCli(r.output) }); });
app.post('/api/profiles/:id/cron/:jobId/run', auth, (req, res) => { const r = run('openclaw cron run ' + req.params.jobId + ' 2>/dev/null', { timeout: 30000 }); res.json({ ok: r.ok, output: cleanCli(r.output) }); });
app.get('/api/profiles/:id/cron/runs', auth, (req, res) => { const r = run('openclaw cron runs 2>/dev/null', { timeout: 10000 }); res.json({ ok: r.ok, output: cleanCli(r.output) }); });

// ═══ ACTIVITY FEED ═══
app.get('/api/profiles/:id/activity', auth, (req, res) => {
  const events = [];
  const r = run('openclaw logs --lines 50 2>/dev/null', { timeout: 8000 });
  if (r.ok) {
    r.output.split('\n').forEach(line => {
      const ts = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:]+|\d{2}:\d{2}:\d{2})/);
      if (!ts) return;
      let type = 'system', icon = '⚙️', msg = line.slice(ts[0].length).trim();
      if (/tool|skill/i.test(msg)) { type = 'tool'; icon = '🔧'; }
      else if (/telegram|channel|message.*received/i.test(msg)) { type = 'message'; icon = '💬'; }
      else if (/cron|heartbeat/i.test(msg)) { type = 'cron'; icon = '⏰'; }
      else if (/error|fail/i.test(msg)) { type = 'error'; icon = '❌'; }
      else if (/start|running|active|gateway/i.test(msg)) { type = 'status'; icon = '🟢'; }
      events.push({ time: ts[1], type, icon, message: msg.slice(0, 200) });
    });
  }
  res.json({ events: events.reverse(), channelLogs: '' });
});

// ═══ ALERTS ═══
app.get('/api/alerts', auth, (req, res) => {
  const alerts = [];
  if (!isGatewayRunning()) alerts.push({ type: 'error', message: 'Gateway is not running', icon: '⚠️' });
  // Check disk space — adapt to install location
  const diskTarget = IS_SSD ? '/Volumes/' + VOLUME_NAME : process.env.HOME;
  const disk = run("df -h '" + diskTarget + "' | tail -1 | awk '{print $5}'").output?.replace('%', '');
  if (parseInt(disk) > 85) alerts.push({ type: 'warn', message: 'Disk usage at ' + disk + '%', icon: '💾' });
  // Check install root exists (catches unmounted SSD)
  if (!fs.existsSync(INSTALL_ROOT)) alerts.push({ type: 'error', message: IS_SSD ? 'SSD not mounted!' : 'Install directory missing!', icon: '🔌' });
  res.json({ alerts });
});

// ═══ LOGS ═══
app.get('/api/profiles/:id/logs', auth, (req, res) => {
  const r = run('openclaw logs --lines ' + (req.query.lines || 100) + ' 2>/dev/null', { timeout: 10000 });
  res.json({ ok: r.ok, logs: cleanCli(r.output) });
});

// ═══ SYSTEM ═══
app.get('/api/system', auth, (req, res) => {
  const diskTarget = IS_SSD ? '/Volumes/' + VOLUME_NAME : process.env.HOME;
  res.json({
    hostname: run('hostname').output,
    nodeVersion: run('node --version').output,
    uptime: run('uptime').output,
    diskUsage: run("df -h '" + diskTarget + "' | tail -1 | awk '{print $3\"/\"$2\" (\"$5\" used)\"}'").output,
    memInfo: run("vm_stat | awk '/Pages active/ {printf \"%.0fMB active\", $3*4096/1048576}'").output || 'N/A',
    swapInfo: run("sysctl vm.swapusage 2>/dev/null | awk '{print $4}'").output || 'N/A',
    loadAvg: run("sysctl -n vm.loadavg 2>/dev/null").output || run("uptime | awk -F'load averages: ' '{print $2}'").output,
    openclawVersion: run('openclaw --version 2>/dev/null').output,
    dashboardPort: PORT,
    profiles: 1,
    platform: IS_SSD ? 'macOS SSD' : 'macOS Local',
    installRoot: INSTALL_ROOT
  });
});

// ═══ SECURITY AUDIT (Mac-adapted) ═══
app.get('/api/security/audit', auth, (req, res) => {
  const a = { timestamp: new Date().toISOString(), checks: [] };
  function add(c, n, s, d, sv) { a.checks.push({ category: c, name: n, status: s, detail: d, severity: sv }); }
  try { const st = fs.statSync(CONFIG_DIR); add('Files', 'Config dir permissions', (st.mode & 0o077) === 0 ? 'pass' : 'warn', 'Mode: ' + (st.mode & 0o777).toString(8), 'high'); } catch { add('Files', 'Config dir', 'fail', 'Cannot read', 'high'); }
  const credDir = path.join(CONFIG_DIR, 'credentials');
  try { const st = fs.statSync(credDir); add('Files', 'Credentials permissions', (st.mode & 0o077) === 0 ? 'pass' : 'warn', 'Mode: ' + (st.mode & 0o777).toString(8), 'high'); } catch { add('Files', 'Credentials dir', 'info', 'Not found', 'medium'); }
  const cfg = readJSON(path.join(CONFIG_DIR, 'openclaw.json')) || {};
  add('Gateway', 'Auth mode', cfg.gateway?.auth?.mode === 'token' ? 'pass' : 'warn', cfg.gateway?.auth?.mode || 'none', 'critical');
  add('Telegram', 'DM Policy', cfg.channels?.telegram?.dmPolicy === 'pairing' ? 'pass' : 'warn', cfg.channels?.telegram?.dmPolicy || 'open', 'high');
  add('Storage', 'Install directory', fs.existsSync(INSTALL_ROOT) ? 'pass' : 'fail', fs.existsSync(INSTALL_ROOT) ? 'Accessible' : 'NOT accessible', 'critical');
  const fw = run('/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null');
  add('Network', 'macOS Firewall', fw.output?.includes('enabled') ? 'pass' : 'warn', fw.output?.includes('enabled') ? 'Enabled' : 'Check System Settings', 'medium');
  const oc = run('openclaw security audit 2>/dev/null', { timeout: 15000 });
  if (oc.ok) add('OpenClaw', 'Security audit', 'pass', cleanCli(oc.output).slice(0, 100), 'high');
  const cn = { pass: 0, warn: 0, fail: 0, info: 0 };
  a.checks.forEach(c => cn[c.status]++);
  a.summary = cn;
  a.score = Math.max(0, 100 - (cn.fail * 25) - (cn.warn * 10));
  res.json(a);
});

// ═══ UPDATES ═══
app.get('/api/updates/cli', auth, (req, res) => {
  const c = run('openclaw --version 2>/dev/null');
  const l = run('npm show openclaw version 2>/dev/null', { timeout: 20000 });
  res.json({ current: c.output, latest: l.output, updateAvailable: c.output !== l.output });
});
app.post('/api/updates/cli/upgrade', auth, (req, res) => {
  const r = run('npm install -g openclaw@latest', { timeout: 120000 });
  const v = run('openclaw --version 2>/dev/null');
  res.json({ ok: r.ok, version: v.output });
});
app.get('/api/updates/workspace/:id', auth, (req, res) => { res.json({ isGit: false }); });
app.post('/api/updates/workspace/:id/pull', auth, (req, res) => { res.json({ ok: false, output: 'Not a git workspace' }); });

// ═══ ANTFARM ═══
app.get('/api/antfarm/status', auth, (req, res) => {
  const i = run('which antfarm 2>/dev/null');
  if (!i.ok || !i.output) return res.json({ installed: false });
  const wf = run('antfarm workflow list 2>/dev/null');
  const wl = [];
  if (wf.ok) wf.output.split('\n').forEach(l => { const m = l.match(/^\s+(\S+)/); if (m && !l.includes('Available') && !l.includes('Experimental')) wl.push(m[1]); });
  res.json({ installed: true, workflows: wl, dashboardRunning: false });
});
app.get('/api/antfarm/runs', auth, (req, res) => { res.json({ ok: false, output: '' }); });
app.post('/api/antfarm/run', auth, (req, res) => { res.json({ ok: false, output: 'Not available' }); });
app.get('/api/antfarm/runs/:q/status', auth, (req, res) => { res.json({ ok: false, output: '' }); });
app.post('/api/antfarm/dashboard/:action', auth, (req, res) => { res.json({ ok: false, output: '' }); });

// ═══ BACKUP ═══
app.get('/api/profiles/:id/backup', auth, (req, res) => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tmp = '/tmp/oc-backup-' + ts + '.tar.gz';
  run('tar -czf "' + tmp + '" -C "' + process.env.HOME + '" .openclaw -C "' + INSTALL_ROOT + '" workspace', { timeout: 120000 });
  res.download(tmp, 'backup-openclaw-' + ts + '.tar.gz', () => { try { fs.unlinkSync(tmp); } catch {} });
});
app.get('/api/backup/all', auth, (req, res) => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tmp = '/tmp/oc-backup-all-' + ts + '.tar.gz';
  run('tar -czf "' + tmp + '" -C "' + process.env.HOME + '" .openclaw -C "' + INSTALL_ROOT + '" workspace dashboard', { timeout: 300000 });
  res.download(tmp, 'backup-openclaw-all-' + ts + '.tar.gz', () => { try { fs.unlinkSync(tmp); } catch {} });
});

// ─── Catch-all ───
app.get('/{*path}', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('⚡ OpenClaw Command Center v1.6');
  console.log('   Install: ' + INSTALL_ROOT + (IS_SSD ? ' (SSD)' : ' (Local)'));
  console.log('   Config:  ' + CONFIG_DIR);
  console.log('   Port:    ' + PORT);
  console.log('   Dashboard: http://localhost:' + PORT + '/?token=' + AUTH_TOKEN);
  console.log('');
});
