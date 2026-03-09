/**
 * installer.js — Full installation logic ported from QuickClaw_Install.command
 *
 * Each step emits progress events via a callback so the renderer can display
 * animated feedback.  All shell work is done through child_process.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, exec, spawn } = require('child_process');
const { listExternalDrives } = require('./state-detector');

const HOME = os.homedir();

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                    */
/* ------------------------------------------------------------------ */

function run(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 300_000, env: process.env, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(err, { stdout, stderr }));
      resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}

function runStream(cmd, args, opts, onLine) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: true, env: process.env, ...opts });
    child.stdout?.on('data', d => d.toString().split('\n').filter(Boolean).forEach(onLine));
    child.stderr?.on('data', d => d.toString().split('\n').filter(Boolean).forEach(onLine));
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`Exit code ${code}`)));
    child.on('error', reject);
  });
}

// Resolve brew to its full path so it works in any shell context
function getBrewPath() {
  const paths = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew'];
  for (const p of paths) { if (fileExists(p)) return p; }
  return 'brew'; // fallback
}

function fileExists(p) { try { return fs.existsSync(p); } catch { return false; } }

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function copyRecursive(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;   // skip — npm install handles it
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Progress helper                                                    */
/* ------------------------------------------------------------------ */

function makeProgress(emit) {
  const TOTAL = 10;
  return (step, name, status, message, extra) => {
    emit({
      step,
      total: TOTAL,
      name,
      status,       // 'working' | 'done' | 'error' | 'skipped' | 'waiting'
      message,
      percent: Math.round((step / TOTAL) * 100),
      ...extra
    });
  };
}

/* ------------------------------------------------------------------ */
/*  Step implementations                                               */
/* ------------------------------------------------------------------ */

async function stepSystemCheck(p, log) {
  p(1, 'System Check', 'working', 'Checking macOS and disk space...');
  log('Verifying system requirements...');

  const platform = process.platform;
  if (platform !== 'darwin') {
    p(1, 'System Check', 'error', 'QuickClaw requires macOS.');
    throw new Error('Not macOS');
  }

  // Check disk space (need at least 500 MB)
  try {
    const { stdout } = await run("df -g / | tail -1 | awk '{print $4}'");
    const freeGB = parseInt(stdout.trim(), 10);
    log(`Free disk space: ${freeGB} GB`);
    if (freeGB < 1) {
      p(1, 'System Check', 'error', 'Less than 1 GB free — need more space.');
      throw new Error('Insufficient disk space');
    }
  } catch (e) {
    if (e.message === 'Insufficient disk space') throw e;
    log('Could not check disk space — continuing anyway');
  }

  p(1, 'System Check', 'done', 'macOS verified, disk space OK');
}

async function stepHomebrew(p, log) {
  p(2, 'Homebrew', 'working', 'Checking for Homebrew...');

  // Source Homebrew env if present
  const brewPaths = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew'];
  let brewFound = false;

  for (const bp of brewPaths) {
    if (fileExists(bp)) {
      log(`Found Homebrew at ${bp}`);
      // Ensure Homebrew bin dirs are in PATH for all subsequent commands
      const brewPrefix = path.dirname(path.dirname(bp));
      const brewBin = path.join(brewPrefix, 'bin');
      const brewSbin = path.join(brewPrefix, 'sbin');
      if (!process.env.PATH.includes(brewBin)) {
        process.env.PATH = `${brewBin}:${brewSbin}:${process.env.PATH}`;
      }
      try {
        const { stdout } = await run(`${bp} shellenv`);
        // Parse and apply environment (skip PATH — we already set it above)
        for (const line of stdout.split('\n')) {
          const m = line.match(/export\s+(\w+)="([^"]+)"/);
          if (m && m[1] !== 'PATH') process.env[m[1]] = m[2];
        }
      } catch { /* ok */ }
      brewFound = true;
      break;
    }
  }

  if (!brewFound) {
    try {
      await run('command -v brew');
      brewFound = true;
    } catch { /* not found */ }
  }

  if (!brewFound) {
    p(2, 'Homebrew', 'working', 'Installing Homebrew (this may take a minute)...');
    log('Homebrew not found — installing...');
    await runStream('/bin/bash', ['-c',
      '"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'],
      { env: { ...process.env, NONINTERACTIVE: '1' } },
      log
    );
    // Source env after install
    for (const bp of brewPaths) {
      if (fileExists(bp)) {
        const brewPrefix = path.dirname(path.dirname(bp));
        const brewBin = path.join(brewPrefix, 'bin');
        const brewSbin = path.join(brewPrefix, 'sbin');
        if (!process.env.PATH.includes(brewBin)) {
          process.env.PATH = `${brewBin}:${brewSbin}:${process.env.PATH}`;
        }
        try {
          const { stdout } = await run(`${bp} shellenv`);
          for (const line of stdout.split('\n')) {
            const m = line.match(/export\s+(\w+)="([^"]+)"/);
            if (m && m[1] !== 'PATH') process.env[m[1]] = m[2];
          }
        } catch { /* ok */ }
        brewFound = true;
        break;
      }
    }
    // Verify installation succeeded
    if (!brewFound) {
      try { await run('command -v brew'); brewFound = true; } catch { /* ok */ }
    }
    if (!brewFound) {
      p(2, 'Homebrew', 'error', 'Homebrew installation may have failed');
      throw new Error('Homebrew installation failed — check your internet connection');
    }
    log('Homebrew installed!');
  }

  p(2, 'Homebrew', 'done', 'Homebrew ready');
}

async function stepNodeJS(p, log) {
  p(3, 'Node.js', 'working', 'Checking for Node.js...');

  let nodeOk = false;
  try {
    const { stdout } = await run('node -v');
    log(`Node.js ${stdout.trim()} found`);
    nodeOk = true;
  } catch { /* not found */ }

  if (!nodeOk) {
    p(3, 'Node.js', 'working', 'Installing Node.js via Homebrew...');
    log('Installing Node.js...');
    await runStream(getBrewPath(), ['install', 'node'], {}, log);
    try {
      const { stdout } = await run('node -v');
      log(`Node.js ${stdout.trim()} installed`);
    } catch {
      p(3, 'Node.js', 'error', 'Node.js installation may have failed');
      throw new Error('Node.js installation failed — try running "brew install node" manually');
    }
  }

  p(3, 'Node.js', 'done', 'Node.js ready');
}

/**
 * Step 4 is interactive — the renderer shows a location picker.
 * This function just returns available options; the user picks in the UI,
 * then the choice is passed into the subsequent steps.
 */
function getInstallLocations(scriptDir) {
  const drives = listExternalDrives();
  return {
    drives: drives.map(d => ({
      name: d.name,
      path: path.join(d.path, 'QuickClaw'),
      type: 'external'
    })),
    currentFolder: { name: 'This Mac (current folder)', path: scriptDir, type: 'local' }
  };
}

async function stepLocation(p, log, choice, scriptDir) {
  p(4, 'Install Location', 'working', `Setting up ${choice.name}...`);

  const baseDir = choice.path;

  if (choice.type === 'external') {
    ensureDir(baseDir);
    log(`Created ${baseDir}`);

    // Copy essential files to the external drive
    const filesToCopy = ['START_HERE.html', 'README.md'];
    for (const f of filesToCopy) {
      const src = path.join(scriptDir, f);
      if (fileExists(src)) {
        fs.copyFileSync(src, path.join(baseDir, f));
        log(`Copied ${f}`);
      }
    }

    // Copy .command scripts
    try {
      for (const f of fs.readdirSync(scriptDir)) {
        if (f.endsWith('.command')) {
          fs.copyFileSync(path.join(scriptDir, f), path.join(baseDir, f));
          log(`Copied ${f}`);
        }
      }
    } catch { /* ok */ }

    // Copy dashboard-files (excluding node_modules)
    const dashSrc = path.join(scriptDir, 'dashboard-files');
    if (fileExists(dashSrc)) {
      log('Copying dashboard files...');
      copyRecursive(dashSrc, path.join(baseDir, 'dashboard-files'));
      log('Dashboard files copied');
    }
  }

  p(4, 'Install Location', 'done', `Location ready: ${baseDir}`);
  return baseDir;
}

async function stepDataMigration(p, log, baseDir, migrationChoice) {
  p(5, 'Data Migration', 'working', 'Checking for existing data...');

  const openclawHome = path.join(baseDir, 'openclaw-state');
  const macData = path.join(HOME, '.openclaw');
  const dataDir = path.join(baseDir, 'dashboard-data');

  const hasMacData = fileExists(macData) && !fs.lstatSync(macData).isSymbolicLink();
  const hasDriveData = fileExists(openclawHome) && fileExists(path.join(openclawHome, 'openclaw.json'));

  if (!hasMacData && !hasDriveData) {
    log('No existing data — fresh install');
    p(5, 'Data Migration', 'done', 'Fresh install — no data to migrate');
    return { openclawHome, dataDir };
  }

  log(`Found data: Mac=${hasMacData}, Drive=${hasDriveData}`);

  // migrationChoice: 'fresh' | 'keep-drive' | 'migrate' | 'keep-all'
  switch (migrationChoice) {
    case 'fresh':
      log('Wiping all existing data...');
      if (hasMacData) {
        try { fs.renameSync(macData, macData + '.old'); } catch {
          fs.rmSync(macData, { recursive: true, force: true });
        }
      }
      try { const s = fs.lstatSync(macData); if (s.isSymbolicLink()) fs.unlinkSync(macData); } catch { /* ok */ }
      if (hasDriveData) {
        try { fs.renameSync(openclawHome, openclawHome + '.old'); } catch {
          fs.rmSync(openclawHome, { recursive: true, force: true });
        }
      }
      // Remove LaunchAgent
      try {
        await run(`launchctl bootout gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true`);
        fs.unlinkSync(path.join(HOME, 'Library/LaunchAgents/ai.openclaw.gateway.plist'));
      } catch { /* ok */ }
      log('Clean slate!');
      break;

    case 'keep-drive':
      if (hasMacData) {
        try { fs.renameSync(macData, macData + '.old'); } catch {
          fs.rmSync(macData, { recursive: true, force: true });
        }
      }
      try { const s = fs.lstatSync(macData); if (s.isSymbolicLink()) fs.unlinkSync(macData); } catch { /* ok */ }
      log('Mac data cleared, drive data kept');
      break;

    case 'migrate':
      if (hasMacData && !hasDriveData) {
        ensureDir(openclawHome);
        copyRecursive(macData, openclawHome);
        fs.rmSync(macData, { recursive: true, force: true });
        log('Migrated Mac data to drive');
      }
      break;

    case 'keep-all':
    default:
      log('Keeping everything');
      break;
  }

  // Reset dashboard settings if requested
  if (migrationChoice === 'fresh' && fileExists(path.join(dataDir, 'settings.json'))) {
    try {
      fs.renameSync(dataDir, dataDir + '.bak');
    } catch { /* ok */ }
  }

  p(5, 'Data Migration', 'done', 'Data migration complete');
  return { openclawHome, dataDir };
}

async function stepDirectorySetup(p, log, baseDir, openclawHome) {
  p(6, 'Directory Setup', 'working', 'Creating directories and symlinks...');

  ensureDir(openclawHome);
  ensureDir(path.join(openclawHome, 'logs'));
  ensureDir(path.join(openclawHome, 'workspace'));
  ensureDir(path.join(baseDir, 'dashboard-data'));
  ensureDir(path.join(baseDir, 'openclaw'));
  ensureDir(path.join(baseDir, 'logs'));
  ensureDir(path.join(baseDir, '.pids'));

  // Create or update ~/.openclaw symlink
  const symlinkPath = path.join(HOME, '.openclaw');

  try {
    const stat = fs.lstatSync(symlinkPath);
    if (stat.isSymbolicLink()) {
      const current = fs.readlinkSync(symlinkPath);
      if (current !== openclawHome) {
        fs.unlinkSync(symlinkPath);
        fs.symlinkSync(openclawHome, symlinkPath);
        log(`Updated symlink: ~/.openclaw → ${openclawHome}`);
      } else {
        log('Symlink already correct');
      }
    } else if (stat.isDirectory()) {
      // Real directory — migrate useful files then replace
      log('Migrating existing ~/.openclaw directory...');
      const items = ['openclaw.json', '.env', 'credentials', 'clawdbot.json', 'agents', 'identity', 'skills'];
      for (const item of items) {
        const src = path.join(symlinkPath, item);
        if (fileExists(src)) {
          const dest = path.join(openclawHome, item);
          try {
            fs.cpSync(src, dest, { recursive: true, force: true });
            log(`  Migrated ${item}`);
          } catch { /* ok */ }
        }
      }
      fs.rmSync(symlinkPath, { recursive: true, force: true });
      fs.symlinkSync(openclawHome, symlinkPath);
      log('Migrated and symlinked');
    }
  } catch {
    // Doesn't exist — create fresh
    fs.symlinkSync(openclawHome, symlinkPath);
    log(`Created symlink: ~/.openclaw → ${openclawHome}`);
  }

  // Remove setup marker (dashboard wizard should run)
  try { fs.unlinkSync(path.join(baseDir, 'dashboard-data', '.setup-complete')); } catch { /* ok */ }

  p(6, 'Directory Setup', 'done', 'Directories and symlinks ready');
}

async function stepOpenClawInstall(p, log, baseDir) {
  p(7, 'OpenClaw Gateway', 'working', 'Installing OpenClaw packages...');

  const installDir = path.join(baseDir, 'openclaw');
  ensureDir(installDir);

  // Create package.json if missing
  const pkgPath = path.join(installDir, 'package.json');
  if (!fileExists(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({
      name: 'quickclaw-v3-openclaw', private: true, dependencies: {}
    }, null, 2));
  }

  log('Running npm install openclaw...');
  await runStream('npm', ['install', '--no-fund', '--no-audit', 'openclaw'], { cwd: installDir }, log);

  // Create default config
  const configDir = path.join(installDir, 'config');
  ensureDir(configDir);
  const configPath = path.join(configDir, 'default.yaml');
  if (!fileExists(configPath)) {
    fs.writeFileSync(configPath, 'gateway:\n  port: 5000\n  host: 0.0.0.0\n');
    log('Created default gateway config');
  }

  p(7, 'OpenClaw Gateway', 'done', 'OpenClaw installed');
}

async function stepDashboardDeps(p, log, baseDir) {
  p(8, 'Dashboard Setup', 'working', 'Installing dashboard dependencies...');

  const dashDir = path.join(baseDir, 'dashboard-files');
  ensureDir(dashDir);

  // Ensure package.json exists
  const pkgPath = path.join(dashDir, 'package.json');
  if (!fileExists(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({
      name: 'quickclaw-v3-dashboard', private: true,
      scripts: { start: 'node server.js' },
      dependencies: { express: '^4.18.2' }
    }, null, 2));
  }

  log('Running npm install for dashboard...');
  await runStream('npm', ['install', '--production', '--no-fund', '--no-audit'], { cwd: dashDir }, log);

  p(8, 'Dashboard Setup', 'done', 'Dashboard dependencies installed');
}

async function stepConfiguration(p, log, baseDir, scriptDir) {
  p(9, 'Configuration', 'working', 'Writing configuration files...');

  // Write .quickclaw-root marker in install location
  fs.writeFileSync(path.join(baseDir, '.quickclaw-root'), baseDir);
  log(`Wrote .quickclaw-root → ${baseDir}`);

  // Also write marker in script dir (so future launches from Downloads find the install)
  if (scriptDir && scriptDir !== baseDir) {
    try {
      fs.writeFileSync(path.join(scriptDir, '.quickclaw-root'), baseDir);
      log(`Wrote .quickclaw-root in source folder too`);
    } catch { /* ok — may be read-only */ }
  }

  // Create dashboard-data directory
  const dataDir = path.join(baseDir, 'dashboard-data');
  ensureDir(dataDir);

  // Remove macOS quarantine flags from installed files
  try {
    await run(`xattr -dr com.apple.quarantine "${baseDir}" 2>/dev/null || true`);
    log('Cleared macOS quarantine flags');
  } catch { /* ok — not critical */ }

  p(9, 'Configuration', 'done', 'Configuration written');
}

/* ------------------------------------------------------------------ */
/*  Main install runner                                                */
/* ------------------------------------------------------------------ */

/**
 * Run the full installation.
 *
 * @param {object} opts
 * @param {string} opts.scriptDir     — where the app/repo lives (source of files)
 * @param {object} opts.location      — chosen location { name, path, type }
 * @param {string} opts.migration     — 'fresh' | 'keep-drive' | 'migrate' | 'keep-all'
 * @param {function} emit             — progress event emitter
 * @param {function} log              — log line emitter
 * @returns {Promise<{ baseDir: string, port: number }>}
 */
async function runInstallation(opts, emit, log) {
  const p = makeProgress(emit);

  try {
    // Step 1: System check
    await stepSystemCheck(p, log);

    // Step 2: Homebrew
    await stepHomebrew(p, log);

    // Step 3: Node.js
    await stepNodeJS(p, log);

    // Step 4: Location (choice already made via UI)
    const baseDir = await stepLocation(p, log, opts.location, opts.scriptDir);

    // Step 5: Data migration (choice already made via UI)
    const { openclawHome, dataDir } = await stepDataMigration(p, log, baseDir, opts.migration);

    // Step 6: Directory setup + symlinks
    await stepDirectorySetup(p, log, baseDir, openclawHome);

    // Step 7: Install OpenClaw
    await stepOpenClawInstall(p, log, baseDir);

    // Step 8: Dashboard dependencies
    await stepDashboardDeps(p, log, baseDir);

    // Step 9: Configuration
    await stepConfiguration(p, log, baseDir, opts.scriptDir);

    // Step 10 is handled by main.js (start services + show completion)
    p(10, 'Launching', 'done', 'Installation complete!');

    return { baseDir };

  } catch (err) {
    log(`ERROR: ${err.message}`);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/*  Data info (for the migration choice UI)                            */
/* ------------------------------------------------------------------ */

function getExistingDataInfo(baseDir) {
  const macData = path.join(HOME, '.openclaw');
  const openclawHome = path.join(baseDir, 'openclaw-state');
  const dataDir = path.join(baseDir, 'dashboard-data');

  let hasMacData = false;
  try {
    hasMacData = fileExists(macData) && !fs.lstatSync(macData).isSymbolicLink();
  } catch { /* ok */ }

  const hasDriveData = fileExists(openclawHome) && fileExists(path.join(openclawHome, 'openclaw.json'));
  const hasDashboardData = fileExists(path.join(dataDir, 'settings.json'));

  return { hasMacData, hasDriveData, hasDashboardData };
}

/* ------------------------------------------------------------------ */
module.exports = { runInstallation, getInstallLocations, getExistingDataInfo };
