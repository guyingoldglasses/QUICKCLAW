/**
 * OpenClaw Command Center — QuickClaw Backend Server v2.5 (Modular)
 * 
 * Architecture:
 *   lib/helpers.js  — Shared utilities, constants, shell helpers
 *   lib/state.js    — Stateful data: profiles, settings, usage, news, versions
 *   routes/*.js     — Express route modules
 */
const express = require('express');
const http = require('http');
const path = require('path');

// Catch fatal errors early
process.on('uncaughtException', (err) => {
  console.error('\n❌ UNCAUGHT ERROR:', err.message);
  console.error(err.stack);
  console.error('\nDashboard will continue running. The error above may affect some features.\n');
});
process.on('unhandledRejection', (err) => {
  console.error('\n⚠️  Unhandled promise rejection:', err?.message || err);
});

const h = require('./lib/helpers');
const st = require('./lib/state');

const app = express();
const server = http.createServer(app);

// Middleware
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '5mb' }));

// Guaranteed health endpoint (works even if all route modules fail)
app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Mount route modules — with individual error protection
const routeModules = ['system','profiles','channels','comms','security','files','news','versions','auth','extras','chat'];
routeModules.forEach(name => {
  try {
    app.use(require('./routes/' + name));
    console.log('  ✓ routes/' + name);
  } catch (err) {
    console.error('  ✗ routes/' + name + ' FAILED:', err.message);
  }
});

// Profile catch-all (safety net for unmatched profile sub-routes)
app.post('/api/profiles/:id/:action', (req, res) => res.json({ ok: true, action: req.params.action, id: req.params.id }));
app.all('/api/profiles/:id/*', (req, res) => {
  const sub = req.params[0] || '';
  if (sub.startsWith('files')) return res.json({ files: [], dir: null });
  if (sub.startsWith('history')) return res.json({ items: [], sessions: [] });
  if (sub.startsWith('memory')) return res.json({ items: [] });
  if (sub.startsWith('usage')) return res.json({ totals: { cost: 0, input: 0, output: 0 }, byModel: {}, byDay: [], noData: true });
  if (sub.startsWith('config')) return res.json({ config: {} });
  if (sub.startsWith('soul')) return res.json({ content: '' });
  if (sub.startsWith('skills')) return res.json({ skills: st.getSkills() });
  if (sub.startsWith('logs')) return res.json({ logs: '' });
  if (sub.startsWith('auth')) return res.json({ openai: { oauthEnabled: false, hasApiKey: false } });
  if (sub.startsWith('channel')) return res.json({ enabled: false });
  return res.json({ ok: true, note: 'profile endpoint stub', path: sub });
});

// API safety net
app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'API endpoint not implemented', path: req.path, method: req.method }));

// Global error handler for routes
app.use((err, req, res, next) => {
  console.error('Route error:', err.message);
  res.status(500).json({ ok: false, error: 'Internal server error: ' + err.message });
});

// SPA catch-all
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

server.listen(h.PORT, () => {
  console.log('');
  console.log('⚡ OpenClaw Command Center v2.5 (QuickClaw)');
  console.log('  Dashboard: http://localhost:' + h.PORT);
  console.log('  Root:      ' + h.ROOT);
  console.log('');
});
