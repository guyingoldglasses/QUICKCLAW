/**
 * main.js — QuickClaw Electron main process.
 *
 * Lifecycle:
 *   1. On app ready → detect all installs across drives
 *   2. INSTALLER      → no installs found, show setup wizard
 *   3. DASHBOARD      → single healthy install, launch straight to dashboard
 *   4. MANAGER        → multiple installs or mixed state, show picker
 *   5. DRIVE_MISSING  → installs exist but drives unplugged, show reconnect screen
 *   6. On quit        → stop services, remove ~/.openclaw symlink
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const {
  detect, listExternalDrives, registerInstall, unregisterInstall, discoverInstalls, loadRegistry
} = require('./state-detector');
const { runInstallation, getInstallLocations, getExistingDataInfo } = require('./installer');
const ProcessManager = require('./process-manager');
const { createDesktopShortcut } = require('./shortcuts');

/* ------------------------------------------------------------------ */
/*  Globals                                                           */
/* ------------------------------------------------------------------ */

let mainWindow = null;
let processManager = null;
let appState = null;

/* ------------------------------------------------------------------ */
/*  Path resolution                                                    */
/* ------------------------------------------------------------------ */

function getScriptDir() {
  if (app.isPackaged) return path.join(process.resourcesPath);
  return path.resolve(app.getAppPath(), '..');
}

function getAppPath() {
  return app.isPackaged ? path.resolve(process.resourcesPath, '..') : app.getAppPath();
}

/* ------------------------------------------------------------------ */
/*  Window creation                                                    */
/* ------------------------------------------------------------------ */

function createInstallerWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();

  mainWindow = new BrowserWindow({
    width: 720,
    height: 680,
    minWidth: 600,
    minHeight: 500,
    resizable: true,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    backgroundColor: '#0d1117',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'installer-ui', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createDashboardWindow(port) {
  const oldWindow = mainWindow;
  mainWindow = null;
  if (oldWindow && !oldWindow.isDestroyed()) {
    oldWindow.removeAllListeners('closed');
    oldWindow.close();
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d1117',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow = win;
  win.loadURL(`http://localhost:${port}`);
  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) {
      win.show();
      win.webContents.send('dashboard:ready');
    }
  });
  win.on('closed', () => { if (mainWindow === win) mainWindow = null; });
}

/* ------------------------------------------------------------------ */
/*  macOS dock menu                                                    */
/* ------------------------------------------------------------------ */

function buildDockMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'Open Dashboard',
      click: () => {
        if (mainWindow) mainWindow.show();
        else if (processManager && processManager.dashboardPort) {
          createDashboardWindow(processManager.dashboardPort);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Manage Installs',
      click: () => {
        appState = detect(getAppPath());
        appState.mode = 'MANAGER';  // force manager view
        createInstallerWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Stop Services',
      click: async () => { if (processManager) await processManager.stopAll(); }
    }
  ]);
}

/* ------------------------------------------------------------------ */
/*  Launch a specific install into dashboard mode                      */
/* ------------------------------------------------------------------ */

async function launchSpecificInstall(baseDir) {
  // Stop any running services first
  if (processManager) {
    try { await processManager.stopAll(); } catch { /* ok */ }
  }

  processManager = new ProcessManager(baseDir);
  processManager.on('log', (msg) => {
    // Only forward to renderer during installation (not dashboard mode)
    // Dashboard window doesn't listen for install:log, so sending is wasted IPC
    console.log(msg);
  });

  await processManager.startGateway();
  const { port } = await processManager.startDashboard();

  // Update registry last-seen
  registerInstall(baseDir);

  // Update appState
  appState = detect(getAppPath());
  appState.activeInstall = appState.installs.find(i => i.baseDir === baseDir);

  createDashboardWindow(port);
  return { success: true, port };
}

/* ------------------------------------------------------------------ */
/*  IPC handlers                                                       */
/* ------------------------------------------------------------------ */

function registerIPC() {

  // ── App state (includes all installs) ───────────────────────
  ipcMain.handle('app:state', () => appState);

  // ── Re-scan drives for installs ─────────────────────────────
  ipcMain.handle('install:rescan', () => {
    appState = detect(getAppPath());
    return appState;
  });

  // ── Install locations ───────────────────────────────────────
  ipcMain.handle('install:locations', () => {
    return getInstallLocations(getScriptDir());
  });

  // ── Existing data check ─────────────────────────────────────
  ipcMain.handle('install:existing-data', (_, baseDir) => {
    return getExistingDataInfo(baseDir || getScriptDir());
  });

  // ── Run full installation ───────────────────────────────────
  ipcMain.handle('install:start', async (_, opts) => {
    const scriptDir = getScriptDir();

    const emit = (data) => {
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('install:progress', data);
    };
    const log = (line) => {
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('install:log', line);
    };

    try {
      const result = await runInstallation({
        scriptDir,
        location: opts.location,
        migration: opts.migration || 'fresh'
      }, emit, log);

      // Register this install
      const label = opts.location.type === 'external'
        ? `${opts.location.name} (external)`
        : 'This Mac';
      registerInstall(result.baseDir, label);

      // Update state and set this as the active install
      appState = detect(getAppPath());
      appState.activeInstall = appState.installs.find(i => i.baseDir === result.baseDir)
        || appState.installs[0];

      return { success: true, baseDir: result.baseDir };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Launch a specific install ───────────────────────────────
  ipcMain.handle('install:launch', async (_, baseDir) => {
    try {
      return await launchSpecificInstall(baseDir);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Forget an install (remove from registry) ───────────────
  ipcMain.handle('install:forget', (_, baseDir) => {
    unregisterInstall(baseDir);
    appState = detect(getAppPath());
    return appState;
  });

  // ── Services ────────────────────────────────────────────────
  ipcMain.handle('services:start', async () => {
    if (!appState?.activeInstall) return { success: false, error: 'No active install' };
    try {
      return await launchSpecificInstall(appState.activeInstall.baseDir);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('services:stop', async () => {
    if (processManager) await processManager.stopAll();
    return { success: true };
  });

  ipcMain.handle('services:status', async () => {
    if (!processManager) return { gateway: { running: false }, dashboard: { running: false } };
    return processManager.getStatus();
  });

  // ── Window: switch to dashboard ─────────────────────────────
  ipcMain.handle('window:dashboard', async () => {
    // Find the install to launch — prefer activeInstall, fall back to first healthy one
    const install = appState?.activeInstall
      || appState?.installs?.find(i => i.healthy)
      || appState?.installs?.[0];
    if (!install) return { success: false, error: 'No install found' };
    try {
      return await launchSpecificInstall(install.baseDir);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Shortcut ────────────────────────────────────────────────
  ipcMain.handle('shortcut:create', async () => {
    try {
      const appPath = app.isPackaged ? process.execPath : app.getAppPath();
      await createDesktopShortcut(appPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

/* ------------------------------------------------------------------ */
/*  App lifecycle                                                      */
/* ------------------------------------------------------------------ */

app.whenReady().then(() => {
  appState = detect(getAppPath());
  console.log(`QuickClaw — Mode: ${appState.mode}, Installs: ${appState.installs.length}`);

  registerIPC();

  if (process.platform === 'darwin') {
    app.dock.setMenu(buildDockMenu());
  }

  if (appState.mode === 'DASHBOARD' && appState.activeInstall) {
    // Single healthy install — launch dashboard directly
    launchSpecificInstall(appState.activeInstall.baseDir).catch(err => {
      console.error('Failed to start services:', err);
      // Fall back to installer/manager UI
      appState.mode = 'MANAGER';
      createInstallerWindow();
    });
  } else {
    // Any other mode — show the installer/manager UI
    // (the UI reads appState to decide which screen to show)
    createInstallerWindow();
  }
});

app.on('activate', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    if (processManager?.dashboardPort) {
      createDashboardWindow(processManager.dashboardPort);
    } else {
      createInstallerWindow();
    }
  }
});

// Graceful shutdown with timeout
app.on('before-quit', async (e) => {
  if (processManager) {
    e.preventDefault();
    const pm = processManager;
    processManager = null;

    const forceQuit = setTimeout(() => { app.exit(0); }, 8000);
    try { await pm.stopAll(); } catch { /* ok */ }
    clearTimeout(forceQuit);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
