/**
 * routes/versions.js — Versions routes
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const h = require('../lib/helpers');
const st = require('../lib/state');

const router = Router();

// ═══ VERSION TIMELINE ═══
router.post('/api/versions/snapshot', (req, res) => {
  const { label, markAsBase } = req.body;
  const versionId = 'v-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const vDir = path.join(h.VERSIONS_DIR, versionId);
  fs.mkdirSync(vDir, { recursive: true });
  const dashDir = path.resolve(__dirname); const filesToSave = [];
  function collectFiles(dir, prefix) {
    try { fs.readdirSync(dir).forEach(name => { if (name.startsWith('.') || name === 'node_modules') return; const fp = path.join(dir, name); const rel = prefix ? prefix + '/' + name : name; try { const s = fs.statSync(fp); if (s.isDirectory()) collectFiles(fp, rel); else filesToSave.push({ rel, abs: fp }); } catch {} }); } catch {}
  }
  collectFiles(dashDir, '');
  filesToSave.forEach(f => { const dest = path.join(vDir, f.rel); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(f.abs, dest); });
  const meta = st.getVersions();
  const versionInfo = { id: versionId, label: label || 'Snapshot', timestamp: new Date().toISOString(), fileCount: filesToSave.length, isBase: !!markAsBase };
  meta.versions.push(versionInfo);
  if (!meta.current) meta.current = versionId;
  if (markAsBase) meta.baseStable = versionId;
  st.saveVersionsMeta(meta);
  res.json({ ok: true, version: versionInfo });
});
router.get('/api/versions', (req, res) => {
  const meta = st.getVersions();
  meta.versions.forEach(v => {
    const vDir = path.join(h.VERSIONS_DIR, v.id);
    if (fs.existsSync(vDir)) { const r = h.runSync(`du -sh "${vDir}" 2>/dev/null`); v.size = r.ok ? r.output.split('\t')[0] : '?'; v.exists = true; }
    else { v.size = '0'; v.exists = false; }
  });
  res.json(meta);
});
router.post('/api/versions/:id/activate', (req, res) => {
  const meta = st.getVersions(); const version = meta.versions.find(v => v.id === req.params.id);
  if (!version) return res.status(404).json({ error: 'Version not found' });
  const vDir = path.join(h.VERSIONS_DIR, req.params.id);
  if (!fs.existsSync(vDir)) return res.status(404).json({ error: 'Version files missing' });
  // Auto-snapshot current before switching
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); const autoId = 'v-auto-' + ts;
  const autoDir = path.join(h.VERSIONS_DIR, autoId); fs.mkdirSync(autoDir, { recursive: true });
  const dashDir = path.resolve(__dirname);
  function copyCurrentFiles(dir, prefix) { try { fs.readdirSync(dir).forEach(name => { if (name.startsWith('.') || name === 'node_modules') return; const fp = path.join(dir, name); const rel = prefix ? prefix + '/' + name : name; try { const s = fs.statSync(fp); if (s.isDirectory()) copyCurrentFiles(fp, rel); else { const dest = path.join(autoDir, rel); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(fp, dest); } } catch {} }); } catch {} }
  copyCurrentFiles(dashDir, '');
  if (!meta.versions.find(v => v.id === autoId)) meta.versions.push({ id: autoId, label: 'Auto-save before switching to ' + (version.label || req.params.id), timestamp: new Date().toISOString(), isBase: false, isAuto: true });
  function restoreFiles(dir, prefix) { try { fs.readdirSync(dir).forEach(name => { const fp = path.join(dir, name); const rel = prefix ? prefix + '/' + name : name; try { const s = fs.statSync(fp); if (s.isDirectory()) restoreFiles(fp, rel); else { const dest = path.join(dashDir, rel); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(fp, dest); } } catch {} }); } catch {} }
  restoreFiles(vDir, '');
  meta.current = req.params.id; st.saveVersionsMeta(meta);
  res.json({ ok: true, message: 'Switched to ' + (version.label || req.params.id) + '. Restart dashboard to apply.', needsRestart: true });
});
router.delete('/api/versions/:id', (req, res) => {
  const meta = st.getVersions(); const idx = meta.versions.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Version not found' });
  if (meta.baseStable === req.params.id) return res.status(400).json({ error: 'Cannot delete base stable version' });
  if (meta.current === req.params.id) return res.status(400).json({ error: 'Cannot delete currently active version' });
  const vDir = path.join(h.VERSIONS_DIR, req.params.id);
  if (fs.existsSync(vDir)) h.runSync(`rm -rf "${vDir}"`);
  meta.versions.splice(idx, 1); st.saveVersionsMeta(meta);
  res.json({ ok: true });
});
router.put('/api/versions/:id', (req, res) => {
  const meta = st.getVersions(); const version = meta.versions.find(v => v.id === req.params.id);
  if (!version) return res.status(404).json({ error: 'Version not found' });
  if (req.body.label !== undefined) version.label = req.body.label;
  if (req.body.markAsBase !== undefined) { if (req.body.markAsBase) { meta.versions.forEach(v => { v.isBase = false; }); version.isBase = true; meta.baseStable = req.params.id; } else { version.isBase = false; if (meta.baseStable === req.params.id) meta.baseStable = null; } }
  st.saveVersionsMeta(meta); res.json({ ok: true, version });
});


module.exports = router;
