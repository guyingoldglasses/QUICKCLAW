/**
 * state-detector.js — Discovers ALL QuickClaw installations across all drives,
 * determines which are reachable, and helps the user pick one to launch or
 * decide to create a new install.
 *
 * Modes:
 *   MANAGER    → multiple installs found, show picker / manager
 *   DASHBOARD  → single install found and reachable, go straight to dashboard
 *   DRIVE_MISSING → install(s) recorded but drive not plugged in
 *   INSTALLER  → no installs found at all, run first-time setup
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const REGISTRY_PATH = path.join(HOME, '.quickclaw-installs.json');

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function fileExists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function writeJSON(p, data) {
  try { fs.writeFileSync(p, JSON.stringify(data, null, 2)); } catch { /* ok */ }
}

/**
 * Scan /Volumes for writable external drives (filters out system volumes).
 */
function listExternalDrives() {
  const skip = new Set([
    'Macintosh HD', 'Macintosh HD - Data', 'Recovery',
    'Preboot', 'VM', 'Update', 'com.apple.TimeMachine.localsnapshots'
  ]);
  const drives = [];
  try {
    for (const name of fs.readdirSync('/Volumes')) {
      if (skip.has(name)) continue;
      const vol = path.join('/Volumes', name);
      try { fs.accessSync(vol, fs.constants.W_OK); drives.push({ name, path: vol }); }
      catch { /* not writable */ }
    }
  } catch { /* not macOS */ }
  return drives;
}

/* ------------------------------------------------------------------ */
/*  Install registry — persists across sessions in ~/.quickclaw-installs.json */
/* ------------------------------------------------------------------ */

function loadRegistry() {
  return readJSON(REGISTRY_PATH) || { installs: [] };
}

function saveRegistry(reg) {
  writeJSON(REGISTRY_PATH, reg);
}

/**
 * Register (or update) an installation in the central registry.
 */
function registerInstall(baseDir, label) {
  const reg = loadRegistry();
  const existing = reg.installs.find(i => i.baseDir === baseDir);
  if (existing) {
    existing.label = label || existing.label;
    existing.lastSeen = new Date().toISOString();
  } else {
    reg.installs.push({
      baseDir,
      label: label || path.basename(path.dirname(baseDir)) || path.basename(baseDir),
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    });
  }
  saveRegistry(reg);
}

/**
 * Remove an installation from the registry.
 */
function unregisterInstall(baseDir) {
  const reg = loadRegistry();
  reg.installs = reg.installs.filter(i => i.baseDir !== baseDir);
  saveRegistry(reg);
}

/* ------------------------------------------------------------------ */
/*  Installation validation                                            */
/* ------------------------------------------------------------------ */

function validateInstall(baseDir) {
  const checks = {
    dirExists:        fileExists(baseDir),
    markerExists:     fileExists(path.join(baseDir, '.quickclaw-root')),
    openclawDir:      fileExists(path.join(baseDir, 'openclaw')),
    dashboardServer:  fileExists(path.join(baseDir, 'dashboard-files', 'server.js')),
    dashboardModules: fileExists(path.join(baseDir, 'dashboard-files', 'node_modules')),
  };

  const healthy = checks.dirExists && checks.markerExists && checks.openclawDir
    && checks.dashboardServer && checks.dashboardModules;

  return { healthy, reachable: checks.dirExists, checks };
}

/* ------------------------------------------------------------------ */
/*  Main detection — scans registry + discovers installs on drives     */
/* ------------------------------------------------------------------ */

/**
 * Also scan external drives for QuickClaw folders not yet registered.
 */
function discoverInstalls() {
  const reg = loadRegistry();
  const known = new Set(reg.installs.map(i => i.baseDir));

  // Scan external drives for QuickClaw directories
  const drives = listExternalDrives();
  for (const drive of drives) {
    const candidate = path.join(drive.path, 'QuickClaw');
    if (!known.has(candidate) && fileExists(path.join(candidate, '.quickclaw-root'))) {
      registerInstall(candidate, `${drive.name} (external)`);
    }
  }

  // Also check for .quickclaw-root markers that point elsewhere
  const appDataCandidates = [
    path.join(HOME, '.quickclaw-root'),
  ];
  for (const marker of appDataCandidates) {
    if (fileExists(marker)) {
      try {
        const target = fs.readFileSync(marker, 'utf8').trim();
        if (target && !known.has(target) && fileExists(target)) {
          registerInstall(target, 'Discovered');
        }
      } catch { /* ok */ }
    }
  }

  return loadRegistry();
}

/**
 * Full state detection.
 *
 * @param {string} appPath — from Electron app.getAppPath()
 * @returns {{ mode, installs, activeInstall }}
 */
function detect(appPath) {
  // Discover any new installs on connected drives
  const reg = discoverInstalls();

  // Also check if there's a marker next to the app itself (dev mode)
  const devMarker = path.join(path.resolve(appPath, '..'), '.quickclaw-root');
  if (fileExists(devMarker)) {
    try {
      const target = fs.readFileSync(devMarker, 'utf8').trim();
      if (target && fileExists(target)) {
        registerInstall(target, 'Local');
      }
    } catch { /* ok */ }
  }

  // Validate all known installs
  const installs = loadRegistry().installs.map(inst => {
    const validation = validateInstall(inst.baseDir);
    return { ...inst, ...validation };
  });

  const reachable = installs.filter(i => i.reachable);
  const healthy = installs.filter(i => i.healthy);
  const missing = installs.filter(i => !i.reachable);

  // Determine mode
  if (healthy.length === 1 && missing.length === 0) {
    // Single healthy install, no missing drives — go straight to dashboard
    return { mode: 'DASHBOARD', installs, activeInstall: healthy[0] };
  }
  if (healthy.length > 1) {
    // Multiple installs — let user pick
    return { mode: 'MANAGER', installs, activeInstall: null };
  }
  if (healthy.length === 1 && missing.length > 0) {
    // One healthy + some missing — show manager so user knows
    return { mode: 'MANAGER', installs, activeInstall: null };
  }
  if (healthy.length === 0 && missing.length > 0) {
    // All installs on unplugged drives
    return { mode: 'DRIVE_MISSING', installs, activeInstall: null };
  }
  if (reachable.length > 0 && healthy.length === 0) {
    // Dirs exist but not fully installed — maybe partial install
    return { mode: 'MANAGER', installs, activeInstall: null };
  }

  // Nothing found anywhere
  return { mode: 'INSTALLER', installs: [], activeInstall: null };
}

/* ------------------------------------------------------------------ */
module.exports = {
  detect, listExternalDrives, loadRegistry, saveRegistry,
  registerInstall, unregisterInstall, validateInstall, discoverInstalls
};
