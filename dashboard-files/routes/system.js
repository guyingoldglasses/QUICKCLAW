/**
 * routes/system.js — System routes
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const h = require('../lib/helpers');
const st = require('../lib/state');

const router = Router();

// ═══ STATUS & SYSTEM ═══
router.get('/api/status', async (req, res) => {
  const gw = await h.gatewayState();
  res.json({
    gateway: gw,
    dashboard: { running: true, pid: process.pid, port: Number(h.PORT), port3000: h.portListeningSync(3000), port3001: h.portListeningSync(3001) },
    root: h.ROOT, installDir: h.INSTALL_DIR, configPath: h.CONFIG_PATH,
    configExists: fs.existsSync(h.CONFIG_PATH),
    addons: { openai: 'check-settings', anthropic: 'check-settings', telegram: 'check-settings', ftp: 'check-settings', email: 'check-settings' }
  });
});

router.get('/api/system', async (req, res) => {
  const gw = await h.gatewayState();
  const diskR = h.runSync("df -h / | tail -1 | awk '{print $3\"/\"$2\" (\"$5\" used)\"}'");
  const memR = h.runSync("vm_stat | awk '/Pages free/{free=$3}/Pages active/{active=$3}/Pages speculative/{spec=$3}END{total=free+active+spec; printf \"%.1fG\", (active*4096)/1073741824}'");
  const ocVer = h.runSync(`${h.cliBin()} --version 2>/dev/null`);
  res.json({
    hostname: os.hostname(), nodeVersion: process.version, platform: process.platform,
    uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`,
    diskUsage: diskR.output || 'unknown', memInfo: memR.output || `${Math.round(os.freemem() / 1073741824)}G free of ${Math.round(os.totalmem() / 1073741824)}G`,
    openclawVersion: h.cleanCli(ocVer.output) || 'not found',
    quickclawRoot: h.ROOT, installDir: h.INSTALL_DIR,
    gateway: { running: gw.running, ws18789: gw.ws18789, port5000: gw.port5000 },
    dashboardPort: h.PORT, profiles: st.getProfiles().length
  });
});

router.get('/api/system/storage', async (req, res) => {
  const profiles = {};
  for (const p of st.getProfiles()) {
    const pp = st.profilePaths(p.id);
    const cfgSize = h.runSync(`du -sh "${pp.configDir}" 2>/dev/null`).output?.split('\t')[0] || '0';
    const wsSize = h.runSync(`du -sh "${pp.workspace}" 2>/dev/null`).output?.split('\t')[0] || '0';
    profiles[p.id] = { configSize: cfgSize, workspaceSize: wsSize };
  }
  const total = h.runSync("df -h / | tail -1 | awk '{print $2}'").output || '?';
  const used = h.runSync("df -h / | tail -1 | awk '{print $3}'").output || '?';
  const avail = h.runSync("df -h / | tail -1 | awk '{print $4}'").output || '?';
  const pct = h.runSync("df -h / | tail -1 | awk '{print $5}'").output?.trim() || '?';
  res.json({ profiles, disk: { total, used, avail, pct }, trash: '0' });
});

// ═══ ACTIVITY FEED ═══
router.get('/api/activity', async (req, res) => {
  const gw = await h.gatewayState();
  const events = [];
  if (gw.running) events.push({ type: 'status', text: 'Gateway running', at: new Date().toISOString() });
  const gwTail = h.tailFile('gateway.log', 40).split('\n').filter(Boolean).slice(-8).map(t => ({ type: 'gateway-log', text: t }));
  const dbTail = h.tailFile('dashboard.log', 20).split('\n').filter(Boolean).slice(-5).map(t => ({ type: 'dashboard-log', text: t }));
  res.json({ events: [...events, ...gwTail, ...dbTail] });
});

// ═══ ALERTS ═══
router.get('/api/alerts', async (req, res) => {
  const alerts = [];
  const gw = await h.gatewayState();
  if (!gw.running) alerts.push({ type: 'warn', message: 'Gateway is not running', icon: '⚠️' });
  if (!fs.existsSync(h.CONFIG_PATH)) alerts.push({ type: 'warn', message: 'No config file found', icon: '📄' });
  const disk = h.runSync("df -h / | tail -1 | awk '{print $5}'").output?.replace('%', '').trim();
  if (parseInt(disk) > 85) alerts.push({ type: 'warn', message: `Disk usage at ${disk}%`, icon: '💾' });
  // Check if any profile has high cost
  let totalDayCost = 0;
  for (const p of st.getProfiles()) {
    const pp = st.profilePaths(p.id);
    const u = st.aggregateUsage(pp);
    if (u.byDay.length > 0) totalDayCost += u.byDay[u.byDay.length - 1].cost || 0;
  }
  if (totalDayCost > 1) alerts.push({ type: 'warn', message: `High daily API cost: $${totalDayCost.toFixed(2)}`, icon: '💰' });
  res.json({ alerts });
});

// ═══ LOGS ═══
router.get('/api/log/:name', (req, res) => {
  const name = req.params.name === 'gateway' ? 'gateway.log' : 'dashboard.log';
  const lines = parseInt(req.query.lines || '120', 10);
  res.type('text/plain').send(h.tailFile(name, lines));
});

// ═══ GATEWAY CONTROLS ═══
router.post('/api/gateway/start', async (req, res) => {
  const result = await h.gatewayFullStart(path.join(h.LOG_DIR, 'gateway.log'));
  res.json({ ok: result.ok, message: result.ok ? 'gateway running' : 'gateway start attempted', log: result.log, gateway: result.gateway });
});
router.post('/api/gateway/stop', async (req, res) => {
  const result = await h.gatewayExec(`${h.gatewayStopCommand()} >> "${path.join(h.LOG_DIR, 'gateway.log')}" 2>&1`);
  const gw = await h.gatewayState();
  res.json({ ok: !gw.running, message: !gw.running ? 'gateway stopped' : 'gateway stop attempted', result, gateway: gw });
});
router.post('/api/gateway/restart', async (req, res) => {
  await h.gatewayExec(`${h.gatewayStopCommand()} >> "${path.join(h.LOG_DIR, 'gateway.log')}" 2>&1`);
  const result = await h.gatewayFullStart(path.join(h.LOG_DIR, 'gateway.log'));
  res.json({ ok: result.ok, message: result.ok ? 'gateway restarted' : 'gateway restart attempted', log: result.log, gateway: result.gateway });
});

// ═══ CONFIG ═══
router.get('/api/config', (req, res) => {
  const exists = fs.existsSync(h.CONFIG_PATH);
  res.json({ exists, path: h.CONFIG_PATH, content: exists ? fs.readFileSync(h.CONFIG_PATH, 'utf8') : '' });
});
router.post('/api/settings/apply-config', (req, res) => {
  const out = st.applySettingsToConfigFile();
  res.json({ ok: true, message: 'Config regenerated from dashboard settings', ...out });
});
router.get('/api/config/backups', (req, res) => {
  const files = fs.readdirSync(h.CONFIG_BACKUPS_DIR).filter(f => f.endsWith('.yaml')).sort().reverse();
  res.json({ files });
});
router.post('/api/config/restore', (req, res) => {
  const file = req.body?.file;
  if (!file) return res.status(400).json({ ok: false, error: 'Missing file' });
  const src = path.join(h.CONFIG_BACKUPS_DIR, file);
  if (!fs.existsSync(src)) return res.status(404).json({ ok: false, error: 'Backup not found' });
  fs.copyFileSync(src, h.CONFIG_PATH);
  res.json({ ok: true, message: 'Config restored', file });
});

// ═══ LOGS ═══
// ═══ ACTIVITY FEED (per-profile) ═══

module.exports = router;
