/**
 * preload.js — Secure bridge between the Installer UI (renderer) and the
 * Electron main process.  Only exposes controlled IPC channels.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  /* ── Installer ─────────────────────────────────────────────────── */

  startInstall:       (opts) => ipcRenderer.invoke('install:start', opts),
  getInstallLocations:()     => ipcRenderer.invoke('install:locations'),
  getExistingDataInfo:(dir)  => ipcRenderer.invoke('install:existing-data', dir),

  onProgress: (cb) => {
    const h = (_e, d) => cb(d);
    ipcRenderer.on('install:progress', h);
    return () => ipcRenderer.removeListener('install:progress', h);
  },
  onLogLine: (cb) => {
    const h = (_e, l) => cb(l);
    ipcRenderer.on('install:log', h);
    return () => ipcRenderer.removeListener('install:log', h);
  },

  /* ── Multi-install management ──────────────────────────────────── */

  /** Get full app state including all known installs. */
  getAppState:        ()     => ipcRenderer.invoke('app:state'),

  /** Launch a specific install by its baseDir path. */
  launchInstall:      (dir)  => ipcRenderer.invoke('install:launch', dir),

  /** Remove an install from the registry (doesn't delete files). */
  forgetInstall:      (dir)  => ipcRenderer.invoke('install:forget', dir),

  /** Re-scan drives for installs. Returns updated app state. */
  rescanInstalls:     ()     => ipcRenderer.invoke('install:rescan'),

  /* ── Process control ───────────────────────────────────────────── */

  startServices:      ()     => ipcRenderer.invoke('services:start'),
  stopServices:       ()     => ipcRenderer.invoke('services:stop'),
  getStatus:          ()     => ipcRenderer.invoke('services:status'),

  /* ── Desktop shortcut ──────────────────────────────────────────── */

  createShortcut:     ()     => ipcRenderer.invoke('shortcut:create'),

  /* ── Window transitions ────────────────────────────────────────── */

  launchDashboard:    ()     => ipcRenderer.invoke('window:dashboard'),

  onDashboardReady: (cb) => {
    const h = () => cb();
    ipcRenderer.on('dashboard:ready', h);
    return () => ipcRenderer.removeListener('dashboard:ready', h);
  }
});
