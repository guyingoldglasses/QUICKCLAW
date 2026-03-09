/**
 * process-manager.js — Spawns, monitors, and stops the OpenClaw gateway
 * and the Express dashboard.  Ported from QuickClaw_Launch.command and
 * QuickClaw_Stop.command.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec, execSync } = require('child_process');
const http = require('http');
const EventEmitter = require('events');

const HOME = os.homedir();

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function run(cmd, opts) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 30_000, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(err, { stdout, stderr }));
      resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}

function fileExists(p) { try { return fs.existsSync(p); } catch { return false; } }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Check if a port is in use. */
function portInUse(port) {
  return new Promise(resolve => {
    const srv = require('net').createServer();
    srv.once('error', () => resolve(true));
    srv.once('listening', () => { srv.close(); resolve(false); });
    srv.listen(port, '127.0.0.1');
  });
}

/** HTTP GET with timeout. Returns status code or 0 on error. */
function httpGet(url, timeoutMs = 3000) {
  return new Promise(resolve => {
    const req = http.get(url, { timeout: timeoutMs }, res => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
    req.on('timeout', () => { req.destroy(); resolve(0); });
  });
}

/** Kill a process gracefully, then forcefully. */
async function killProcess(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    await sleep(2000);
    try { process.kill(pid, 0); process.kill(pid, 'SIGKILL'); } catch { /* already dead */ }
  } catch { /* already dead */ }
}

/* ------------------------------------------------------------------ */
/*  ProcessManager                                                     */
/* ------------------------------------------------------------------ */

class ProcessManager extends EventEmitter {
  constructor(baseDir) {
    super();
    this.baseDir = baseDir;
    this.pidDir = path.join(baseDir, '.pids');
    this.logDir = path.join(baseDir, 'logs');
    this.gatewayProc = null;
    this.dashboardProc = null;
    this.dashboardPort = null;

    ensureDir(this.pidDir);
    ensureDir(this.logDir);
  }

  /* ── OpenClaw state directory resolution ─────────────────────── */

  _resolveOpenclawHome() {
    for (const name of ['openclaw-home', 'openclaw-state']) {
      const dir = path.join(this.baseDir, name);
      if (fileExists(dir)) return dir;
    }
    // Default
    const dir = path.join(this.baseDir, 'openclaw-state');
    ensureDir(dir);
    return dir;
  }

  /* ── Symlink management ──────────────────────────────────────── */

  _ensureSymlink(openclawHome) {
    const symlinkPath = path.join(HOME, '.openclaw');
    try {
      const stat = fs.lstatSync(symlinkPath);
      if (stat.isSymbolicLink()) {
        const current = fs.readlinkSync(symlinkPath);
        if (current !== openclawHome) {
          fs.unlinkSync(symlinkPath);
          fs.symlinkSync(openclawHome, symlinkPath);
        }
      } else if (stat.isDirectory()) {
        // Migrate useful files from real dir
        const items = ['openclaw.json', '.env', 'credentials', 'clawdbot.json', 'agents', 'identity', 'skills'];
        for (const item of items) {
          const src = path.join(symlinkPath, item);
          if (fileExists(src)) {
            try { fs.cpSync(src, path.join(openclawHome, item), { recursive: true, force: true }); } catch { /* ok */ }
          }
        }
        fs.rmSync(symlinkPath, { recursive: true, force: true });
        fs.symlinkSync(openclawHome, symlinkPath);
      }
    } catch {
      // Doesn't exist — create
      try { fs.symlinkSync(openclawHome, symlinkPath); } catch { /* ok */ }
    }
  }

  /* ── Environment loading (.env files) ────────────────────────── */

  _loadEnvFiles(openclawHome) {
    const envFiles = [
      path.join(openclawHome, '.env'),
      path.join(HOME, '.openclaw', '.env')
    ];

    const env = { ...process.env };
    for (const envFile of envFiles) {
      if (!fileExists(envFile)) continue;
      try {
        const contents = fs.readFileSync(envFile, 'utf8');
        for (const line of contents.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eq = trimmed.indexOf('=');
          if (eq < 1) continue;
          const key = trimmed.slice(0, eq);
          let val = trimmed.slice(eq + 1);
          val = val.replace(/^["']|["']$/g, '');
          env[key] = val;
        }
      } catch { /* ok */ }
      break; // only use the first found
    }
    return env;
  }

  /* ── Active profile detection ────────────────────────────────── */

  _resolveConfigDir(openclawHome) {
    let configDir = openclawHome;

    const profilesPath = path.join(this.baseDir, 'dashboard-data', 'profiles.json');
    if (fileExists(profilesPath)) {
      try {
        const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
        const active = profiles.find(p => p.active) || profiles[0];
        if (active && active.id && active.id !== 'default') {
          const suffix = '-' + active.id.replace(/^p-/, '');
          const candidate = openclawHome + suffix;
          if (fileExists(candidate)) configDir = candidate;
        }
      } catch { /* ok */ }
    }
    return configDir;
  }

  /* ── Ensure gateway.mode=local in openclaw.json ──────────────── */

  _ensureGatewayMode(configPath) {
    if (!fileExists(configPath)) return;
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!cfg.gateway) cfg.gateway = {};
      if (cfg.gateway.mode !== 'local') {
        cfg.gateway.mode = 'local';
        fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
      }
    } catch { /* ok */ }
  }

  /* ── Clean stale artifacts ───────────────────────────────────── */

  async _cleanStale(openclawHome) {
    // Remove stale LaunchAgent
    try { await run('launchctl bootout gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true'); } catch { /* ok */ }
    try { fs.unlinkSync(path.join(HOME, 'Library/LaunchAgents/ai.openclaw.gateway.plist')); } catch { /* ok */ }

    // Remove invalid auth-profiles.json (causes warning spam)
    for (const base of [openclawHome, path.join(HOME, '.openclaw')]) {
      try { fs.unlinkSync(path.join(base, 'agents/main/agent/auth-profiles.json')); } catch { /* ok */ }
    }
  }

  /* ── Start Gateway ───────────────────────────────────────────── */

  async startGateway() {
    this.emit('log', 'Starting OpenClaw gateway...');

    const openclawHome = this._resolveOpenclawHome();
    this._ensureSymlink(openclawHome);

    const configDir = this._resolveConfigDir(openclawHome);
    const configPath = path.join(configDir, 'openclaw.json');

    this._ensureGatewayMode(configPath);
    await this._cleanStale(openclawHome);

    const env = this._loadEnvFiles(openclawHome);
    env.OPENCLAW_STATE_DIR = openclawHome;
    env.OPENCLAW_CONFIG_DIR = configDir;
    env.OPENCLAW_CONFIG_PATH = configPath;
    env.CLAWDBOT_CONFIG_DIR = configDir;

    // Check if already running
    const gwPidFile = path.join(this.pidDir, 'gateway.pid');
    if (fileExists(gwPidFile)) {
      const pid = parseInt(fs.readFileSync(gwPidFile, 'utf8').trim(), 10);
      try { process.kill(pid, 0); this.emit('log', `Gateway already running (PID ${pid})`); return; } catch { /* stale */ }
      fs.unlinkSync(gwPidFile);
    }

    // Find openclaw binary
    const installDir = path.join(this.baseDir, 'openclaw');
    const localBin = path.join(installDir, 'node_modules/.bin/openclaw');
    const cmd = fileExists(localBin) ? localBin : 'npx';
    const args = fileExists(localBin) ? ['gateway', '--port', '18789'] : ['openclaw', 'gateway', '--port', '18789'];

    const gwLog = path.join(this.logDir, 'gateway.log');
    const logStream = fs.createWriteStream(gwLog, { flags: 'a' });
    logStream.write(`\n--- Gateway start: ${new Date().toISOString()} ---\n`);

    this.gatewayProc = spawn(cmd, args, {
      cwd: installDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    this.gatewayProc.stdout.pipe(logStream, { end: false });
    this.gatewayProc.stderr.pipe(logStream, { end: false });
    this.gatewayProc.stdout.on('data', d => this.emit('log', `[gw] ${d.toString().trim()}`));
    this.gatewayProc.stderr.on('data', d => this.emit('log', `[gw] ${d.toString().trim()}`));
    logStream.on('error', () => {}); // prevent uncaught stream errors

    fs.writeFileSync(gwPidFile, String(this.gatewayProc.pid));

    this.gatewayProc.on('exit', (code) => {
      this.emit('log', `Gateway exited with code ${code}`);
      try { logStream.end(); } catch { /* ok */ }
      try { fs.unlinkSync(gwPidFile); } catch { /* ok */ }
      this.gatewayProc = null;
    });

    // Wait for it to start listening
    this.emit('log', 'Waiting for gateway to start...');
    for (let i = 0; i < 12; i++) {
      await sleep(1000);
      if (await portInUse(18789)) {
        this.emit('log', 'Gateway is listening on port 18789');
        return;
      }
    }

    // Check if process is still alive
    try { process.kill(this.gatewayProc.pid, 0); this.emit('log', 'Gateway process running but not yet listening'); }
    catch { this.emit('log', 'WARNING: Gateway may have failed to start'); }
  }

  /* ── Start Dashboard ─────────────────────────────────────────── */

  async startDashboard() {
    this.emit('log', 'Starting dashboard...');

    const openclawHome = this._resolveOpenclawHome();
    const dashDir = path.join(this.baseDir, 'dashboard-files');

    // Install deps if missing
    if (!fileExists(path.join(dashDir, 'node_modules'))) {
      this.emit('log', 'Installing dashboard dependencies...');
      try { execSync('npm install --omit=dev', { cwd: dashDir, timeout: 120_000 }); }
      catch (e) { this.emit('log', `npm install error: ${e.message}`); }
    }

    // Find an available port
    let port = 3000;
    for (let p = 3000; p <= 3005; p++) {
      if (!(await portInUse(p))) { port = p; break; }
      // If it's our old dashboard, kill it
      try {
        const { stdout } = await run(`lsof -ti tcp:${p}`);
        const pids = stdout.trim().split('\n').filter(Boolean);
        for (const pid of pids) {
          const { stdout: cmd } = await run(`ps -p ${pid} -o command=`);
          if (cmd.includes('server.js') || cmd.includes('dashboard-files')) {
            await killProcess(parseInt(pid, 10));
            port = p;
          }
        }
      } catch { /* ok */ }
      if (!(await portInUse(p))) { port = p; break; }
    }

    // Kill old dashboard PID
    const pidFile = path.join(this.pidDir, 'dashboard.pid');
    if (fileExists(pidFile)) {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      try { await killProcess(pid); } catch { /* ok */ }
      fs.unlinkSync(pidFile);
    }

    this.dashboardPort = port;

    const env = {
      ...process.env,
      QUICKCLAW_ROOT: this.baseDir,
      DASHBOARD_PORT: String(port),
      OPENCLAW_STATE_DIR: openclawHome,
      PORT: String(port)
    };

    const dbLog = path.join(this.logDir, 'dashboard.log');
    const logStream = fs.createWriteStream(dbLog, { flags: 'a' });
    logStream.write(`\n--- Dashboard start: ${new Date().toISOString()} ---\n`);

    this.dashboardProc = spawn('node', ['server.js'], {
      cwd: dashDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    this.dashboardProc.stdout.pipe(logStream, { end: false });
    this.dashboardProc.stderr.pipe(logStream, { end: false });
    this.dashboardProc.stdout.on('data', d => this.emit('log', `[dash] ${d.toString().trim()}`));
    this.dashboardProc.stderr.on('data', d => this.emit('log', `[dash] ${d.toString().trim()}`));
    logStream.on('error', () => {}); // prevent uncaught stream errors

    fs.writeFileSync(pidFile, String(this.dashboardProc.pid));

    this.dashboardProc.on('exit', (code) => {
      this.emit('log', `Dashboard exited with code ${code}`);
      try { logStream.end(); } catch { /* ok */ }
      try { fs.unlinkSync(pidFile); } catch { /* ok */ }
      this.dashboardProc = null;
    });

    // Health check
    this.emit('log', `Waiting for dashboard on port ${port}...`);
    for (let i = 0; i < 10; i++) {
      await sleep(1000);
      const status = await httpGet(`http://localhost:${port}/api/ping`);
      if (status === 200) {
        this.emit('log', `Dashboard is live on port ${port}`);
        return { port };
      }
      // Check if process died
      try { process.kill(this.dashboardProc.pid, 0); } catch {
        throw new Error('Dashboard crashed on startup — check logs');
      }
    }

    this.emit('log', 'Dashboard process running but not yet responding');
    return { port };
  }

  /* ── Stop everything ─────────────────────────────────────────── */

  async stopAll() {
    this.emit('log', 'Stopping all services...');
    let stopped = 0;

    // Stop dashboard
    if (this.dashboardProc) {
      await killProcess(this.dashboardProc.pid);
      this.dashboardProc = null;
      stopped++;
    }

    // Stop gateway
    if (this.gatewayProc) {
      await killProcess(this.gatewayProc.pid);
      this.gatewayProc = null;
      stopped++;
    }

    // Clean PID files
    for (const name of ['gateway', 'dashboard']) {
      const pidFile = path.join(this.pidDir, `${name}.pid`);
      if (fileExists(pidFile)) {
        const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
        try { await killProcess(pid); stopped++; } catch { /* ok */ }
        try { fs.unlinkSync(pidFile); } catch { /* ok */ }
      }
    }

    // Kill orphan dashboard processes on common ports
    for (const port of [3000, 3001, 3002, 3003, 3004, 3005]) {
      try {
        const { stdout } = await run(`lsof -ti tcp:${port}`);
        for (const pidStr of stdout.trim().split('\n').filter(Boolean)) {
          const pid = parseInt(pidStr, 10);
          const { stdout: cmd } = await run(`ps -p ${pid} -o command=`);
          if (cmd.includes('server.js') || cmd.includes('dashboard-files')) {
            await killProcess(pid);
            stopped++;
          }
        }
      } catch { /* ok */ }
    }

    // Kill orphan gateway processes
    for (const port of [5000, 18789]) {
      try {
        const { stdout } = await run(`lsof -ti tcp:${port}`);
        for (const pidStr of stdout.trim().split('\n').filter(Boolean)) {
          const pid = parseInt(pidStr, 10);
          const { stdout: cmd } = await run(`ps -p ${pid} -o command=`);
          if (cmd.includes('openclaw') || cmd.includes('gateway')) {
            await killProcess(pid);
            stopped++;
          }
        }
      } catch { /* ok */ }
    }

    // Remove ~/.openclaw symlink (zero traces on Mac)
    const symlinkPath = path.join(HOME, '.openclaw');
    try {
      const stat = fs.lstatSync(symlinkPath);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(symlinkPath);
        this.emit('log', 'Removed ~/.openclaw symlink');
      }
    } catch { /* ok */ }

    // Remove LaunchAgent
    try { await run('launchctl bootout gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true'); } catch { /* ok */ }
    try { fs.unlinkSync(path.join(HOME, 'Library/LaunchAgents/ai.openclaw.gateway.plist')); } catch { /* ok */ }

    this.emit('log', `Stopped ${stopped} process(es). Safe to unplug the drive.`);
  }

  /* ── Status ──────────────────────────────────────────────────── */

  async getStatus() {
    const gwAlive = this.gatewayProc !== null;
    const gwPort = gwAlive ? await portInUse(18789) : false;
    const dashAlive = this.dashboardProc !== null;
    const dashPort = dashAlive && this.dashboardPort ? await portInUse(this.dashboardPort) : false;

    return {
      gateway: { running: gwAlive, listening: gwPort, port: 18789 },
      dashboard: { running: dashAlive, listening: dashPort, port: this.dashboardPort }
    };
  }
}

module.exports = ProcessManager;
