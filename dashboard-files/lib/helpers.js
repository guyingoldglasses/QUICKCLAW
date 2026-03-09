/**
 * helpers.js — Shared utility functions and constants
 */
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = process.env.DASHBOARD_PORT || 3000;
const HOME = process.env.HOME || os.homedir();
const ROOT = process.env.QUICKCLAW_ROOT || path.resolve(__dirname, '..', '..');
const PID_DIR = path.join(ROOT, '.pids');
const LOG_DIR = path.join(ROOT, 'logs');
const DATA_DIR = path.join(ROOT, 'dashboard-data');
const INSTALL_DIR = path.join(ROOT, 'openclaw');
const CONFIG_PATH = path.join(INSTALL_DIR, 'config', 'default.yaml');
const LOCAL_OPENCLAW = path.join(INSTALL_DIR, 'node_modules', '.bin', 'openclaw');
// OpenClaw state dir — lives on the external drive so unplugging kills everything
// Support both dir names (install may use openclaw-home, launch uses openclaw-state)
const _stateDir = process.env.OPENCLAW_STATE_DIR || (
  fs.existsSync(path.join(ROOT, 'openclaw-home')) ? path.join(ROOT, 'openclaw-home') :
  path.join(ROOT, 'openclaw-state')
);
const OPENCLAW_STATE_DIR = _stateDir;
const PROFILES_PATH = path.join(DATA_DIR, 'profiles.json');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const SKILLS_PATH = path.join(DATA_DIR, 'skills.json');
const CONFIG_BACKUPS_DIR = path.join(DATA_DIR, 'config-backups');
const ANTFARM_RUNS_PATH = path.join(DATA_DIR, 'antfarm-runs.json');
const CHAT_HISTORY_PATH = path.join(DATA_DIR, 'chat-history.json');
const PROFILE_ENV_PATH = path.join(DATA_DIR, 'profile-env.json');
const NEWS_FILE = path.join(DATA_DIR, 'news-cache.json');
const NEWS_PREFS_FILE = path.join(DATA_DIR, 'news-prefs.json');
const VERSIONS_DIR = path.join(DATA_DIR, '.versions');

// Ensure directories exist
for (const d of [PID_DIR, LOG_DIR, DATA_DIR, CONFIG_BACKUPS_DIR, VERSIONS_DIR])
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });

// ═══ Shell command helpers ═══
function run(cmd, opts = {}) {
  return new Promise((resolve) => {
    exec(cmd, { encoding: 'utf-8', timeout: opts.timeout || 15000, env: { ...process.env, ...opts.env }, ...opts }, (error, stdout, stderr) => {
      resolve({ ok: !error, output: String(stdout || '').trim(), stdout: String(stdout || ''), stderr: String(stderr || ''), error: error ? String(error.message || error) : null });
    });
  });
}
function runSync(cmd, opts = {}) {
  try { return { ok: true, output: execSync(cmd, { encoding: 'utf-8', timeout: opts.timeout || 15000, env: { ...process.env, ...opts.env }, ...opts }).trim() }; }
  catch (e) { return { ok: false, output: (e.stderr?.toString().trim() || '') + '\n' + (e.stdout?.toString().trim() || '') }; }
}
function portListeningSync(port) { try { execSync(`lsof -ti tcp:${port}`, { stdio: 'pipe' }); return true; } catch { return false; } }

// ═══ File helpers ═══
function tailFile(logFile, lines = 120) {
  const p = path.join(LOG_DIR, logFile);
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8').split('\n').slice(-Math.max(lines, 1)).join('\n');
}
function readJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return typeof fallback === 'function' ? fallback() : fallback; } }
function writeJson(p, obj) {
  // Ensure parent directory exists
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Safe stringify with circular reference detection
  const seen = new WeakSet();
  const json = JSON.stringify(obj, function(key, value) {
    if (typeof value === 'function' || typeof value === 'bigint' || typeof value === 'symbol') return undefined;
    if (value !== null && typeof value === 'object') {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  }, 2);
  fs.writeFileSync(p, json);
}
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

function cliBin() { return fs.existsSync(LOCAL_OPENCLAW) ? `"${LOCAL_OPENCLAW}"` : 'npx openclaw'; }
function gatewayStartCommand() { return `${cliBin()} gateway start --allow-unconfigured`; }
function gatewayStopCommand() { return `${cliBin()} gateway stop`; }

function ensureWithinRoot(rawPath) {
  const resolved = path.resolve(rawPath);
  const base = path.resolve(ROOT);
  if (resolved === base || resolved.startsWith(base + path.sep)) return resolved;
  throw new Error('Path outside QuickClaw root is not allowed');
}

function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function makePkcePair() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// ═══ Gateway state ═══
async function gatewayState() {
  const ws18789 = portListeningSync(18789);
  const ws5000 = portListeningSync(5000);
  const profileEnv = _profileEnvFn ? _profileEnvFn() : {};
  const status = await run(`${cliBin()} gateway status`, { cwd: INSTALL_DIR, env: { ...process.env, ...profileEnv } });
  const txt = `${status.stdout}\n${status.stderr}`;
  const looksRunning = /Runtime:\s*running|listening on ws:\/\/127\.0\.0\.1:18789|gateway\s+running/i.test(txt);
  return { running: ws18789 || ws5000 || looksRunning, ws18789, port5000: ws5000, statusText: txt.trim() };
}

/**
 * Run a gateway command with the active profile's config directory set.
 * This ensures the gateway reads telegram tokens, API keys, etc. from
 * the correct profile config dir (~/.openclaw-XXX or ~/.clawdbot-XXX).
 *
 * Usage: await gatewayExec(`${h.gatewayStartCommand()} >> log 2>&1 &`)
 * The profileEnvFn is injected by state.js to avoid circular deps.
 */
let _profileEnvFn = null;
function setProfileEnvProvider(fn) { _profileEnvFn = fn; }
async function gatewayExec(cmd, extraOpts = {}) {
  const profileEnv = _profileEnvFn ? _profileEnvFn() : {};
  // Ensure node binary dir is in PATH — critical for macOS launchctl
  const nodeBinDir = path.dirname(process.execPath);
  const currentPath = process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin';
  // IMPORTANT: include ...process.env because run()'s ...opts spread overrides
  // the env merge, so we must carry the full environment ourselves
  const env = { ...process.env, PATH: `${nodeBinDir}:${currentPath}`, ...profileEnv, ...extraOpts.env };
  return run(cmd, { cwd: INSTALL_DIR, timeout: extraOpts.timeout || 30000, ...extraOpts, env });
}

/**
 * Full gateway start sequence for macOS:
 * 1. Install the LaunchAgent plist
 * 2. Patch the plist so it can find node + has profile config dir
 * 3. Start the gateway service
 */
async function gatewayFullStart(logFile) {
  const log = [];
  const nodeBin = process.execPath;

  // Step 0: Ensure gateway.mode=local in openclaw.json (gateway refuses to start without it)
  try {
    const profileEnv0 = _profileEnvFn ? _profileEnvFn() : {};
    const cfgPaths = [
      profileEnv0.OPENCLAW_CONFIG_PATH,
      path.join(OPENCLAW_STATE_DIR, 'openclaw.json'),
      path.join(HOME, '.openclaw', 'openclaw.json'),
    ].filter(Boolean);
    for (const cfgPath of cfgPaths) {
      if (fs.existsSync(cfgPath)) {
        const cfg = readJson(cfgPath, {});
        if (!cfg.gateway || cfg.gateway.mode !== 'local') {
          if (!cfg.gateway) cfg.gateway = {};
          cfg.gateway.mode = 'local';
          writeJson(cfgPath, cfg);
          log.push('set gateway.mode=local in ' + path.basename(cfgPath));
        }
      }
    }
  } catch (e) { log.push('mode fix err: ' + e.message.slice(0, 60)); }

  // Step 1: Remove any stale LaunchAgent (we use direct process now)
  try {
    await run(`launchctl bootout gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true`, { timeout: 10000 });
    const plistPath = path.join(HOME, 'Library', 'LaunchAgents', 'ai.openclaw.gateway.plist');
    if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
    log.push('cleaned stale LaunchAgent');
  } catch (e) { log.push('launchagent cleanup: ' + e.message.slice(0, 60)); }

  // Step 2: Kill any existing gateway on port 18789
  try {
    const pids = require('child_process').execSync('lsof -ti tcp:18789 2>/dev/null || true', { encoding: 'utf-8' }).trim();
    for (const pid of pids.split('\n').filter(Boolean)) {
      try { process.kill(parseInt(pid), 'SIGTERM'); } catch {}
    }
    if (pids) await new Promise(r => setTimeout(r, 2000));
    log.push('cleared port 18789');
  } catch {}

  // Step 3: Start gateway as a direct background process (nohup)
  const gwLog = logFile || path.join(LOG_DIR, 'gateway.log');
  const ocBin = fs.existsSync(LOCAL_OPENCLAW) ? LOCAL_OPENCLAW : 'npx openclaw';
  const profileEnv = _profileEnvFn ? _profileEnvFn() : {};
  const nodeBinDir = path.dirname(nodeBin);
  const env = { ...process.env, PATH: `${nodeBinDir}:${process.env.PATH || ''}`, ...profileEnv };

  try {
    const { spawn } = require('child_process');
    const gwLogStream = fs.openSync(gwLog, 'a');

    let cmd, args;
    if (fs.existsSync(LOCAL_OPENCLAW)) {
      cmd = LOCAL_OPENCLAW;
      args = ['gateway', '--port', '18789'];
    } else {
      cmd = 'npx';
      args = ['openclaw', 'gateway', '--port', '18789'];
    }

    const child = spawn(cmd, args, {
      detached: true,
      stdio: ['ignore', gwLogStream, gwLogStream],
      cwd: INSTALL_DIR,
      env
    });
    child.unref();

    // Save PID
    const pidFile = path.join(PID_DIR, 'gateway.pid');
    fs.writeFileSync(pidFile, String(child.pid));
    log.push('started gateway PID=' + child.pid);
  } catch (e) {
    log.push('start err: ' + e.message.slice(0, 80));
  }

  // Step 4: Wait and check
  await new Promise(r => setTimeout(r, 5000));
  const gw = await gatewayState();
  log.push('running: ' + gw.running);

  return { ok: gw.running, gateway: gw, log };
}

module.exports = {
  PORT, HOME, ROOT, PID_DIR, LOG_DIR, DATA_DIR, INSTALL_DIR, CONFIG_PATH, LOCAL_OPENCLAW, OPENCLAW_STATE_DIR,
  PROFILES_PATH, SETTINGS_PATH, SKILLS_PATH, CONFIG_BACKUPS_DIR, ANTFARM_RUNS_PATH,
  CHAT_HISTORY_PATH, PROFILE_ENV_PATH, NEWS_FILE, NEWS_PREFS_FILE, VERSIONS_DIR,
  run, runSync, portListeningSync, tailFile, readJson, writeJson, readEnv, writeEnv,
  maskKey, cleanCli, cliBin, gatewayStartCommand, gatewayStopCommand,
  ensureWithinRoot, b64url, makePkcePair, gatewayState,
  setProfileEnvProvider, gatewayExec, gatewayFullStart
};
