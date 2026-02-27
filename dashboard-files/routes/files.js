/**
 * routes/files.js — Files routes
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const h = require('../lib/helpers');
const st = require('../lib/state');

const router = Router();

// ═══ FILE BROWSER ═══
router.get('/api/profiles/:id/browse', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const dir = req.query.dir;
  const roots = [
    { label: 'config', path: path.resolve(pp.configDir) },
    { label: 'workspace', path: path.resolve(pp.workspace) }
  ];
  if (!dir) return res.json({ roots: roots.map(r => ({ ...r, exists: fs.existsSync(r.path) })) });
  const resolved = path.resolve(dir);
  if (!roots.some(r => resolved === r.path || resolved.startsWith(r.path + '/'))) return res.status(403).json({ error: 'Path not allowed' });
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Not found' });
  try {
    const items = fs.readdirSync(dir).filter(f => !f.startsWith('.')).sort().map(name => {
      const fp = path.join(dir, name);
      try { const s = fs.statSync(fp); return { name, path: fp, isDir: s.isDirectory(), size: s.size, modified: s.mtime.toISOString(), ext: path.extname(name).toLowerCase() }; }
      catch { return { name, path: fp, isDir: false, size: 0, error: true }; }
    });
    items.sort((a, b) => (b.isDir ? 1 : 0) - (a.isDir ? 1 : 0) || a.name.localeCompare(b.name));
    res.json({ dir, items, parent: path.dirname(dir) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/api/profiles/:id/readfile', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const fp = req.query.path;
  const roots = [path.resolve(pp.configDir), path.resolve(pp.workspace)];
  const resolved = path.resolve(fp || '');
  if (!fp || !roots.some(r => resolved === r || resolved.startsWith(r + '/'))) return res.status(403).json({ error: 'Path not allowed' });
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  const stat = fs.statSync(fp);
  if (stat.size > 2 * 1024 * 1024) return res.status(413).json({ error: 'File too large (>2MB)' });
  const ext = path.extname(fp).toLowerCase();
  const textExts = ['.json', '.md', '.txt', '.yml', '.yaml', '.toml', '.env', '.js', '.ts', '.sh', '.py', '.html', '.css', '.xml', '.ini', '.cfg', '.conf', '.log', ''];
  if (!textExts.includes(ext)) return res.json({ content: null, binary: true, size: stat.size, ext });
  res.json({ content: fs.readFileSync(fp, 'utf-8'), size: stat.size, ext, modified: stat.mtime.toISOString(), sensitive: /\.env$|secret|token|password|key/i.test(fp) });
});
router.put('/api/profiles/:id/writefile', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const { filePath, content } = req.body;
  const roots = [path.resolve(pp.configDir), path.resolve(pp.workspace)];
  const resolved = path.resolve(filePath || '');
  if (!filePath || !roots.some(r => resolved === r || resolved.startsWith(r + '/'))) return res.status(403).json({ error: 'Path not allowed' });
  if (fs.existsSync(filePath)) try { fs.writeFileSync(filePath + '.bak', fs.readFileSync(filePath)); } catch {}
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content); res.json({ ok: true });
});
router.post('/api/profiles/:id/mkdir', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const { dirPath } = req.body;
  const roots = [path.resolve(pp.configDir), path.resolve(pp.workspace)];
  const resolved = path.resolve(dirPath || '');
  if (!dirPath || !roots.some(r => resolved === r || resolved.startsWith(r + '/'))) return res.status(403).json({ error: 'Path not allowed' });
  fs.mkdirSync(dirPath, { recursive: true }); res.json({ ok: true });
});
router.delete('/api/profiles/:id/deletefile', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const fp = req.query.path;
  const roots = [path.resolve(pp.configDir), path.resolve(pp.workspace)];
  const resolved = path.resolve(fp || '');
  if (!fp || !roots.some(r => resolved === r || resolved.startsWith(r + '/'))) return res.status(403).json({ error: 'Path not allowed' });
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  const trashDir = path.join(h.DATA_DIR, '.trash'); fs.mkdirSync(trashDir, { recursive: true });
  const stat = fs.statSync(fp);
  if (stat.isDirectory()) fs.renameSync(fp, path.join(trashDir, Date.now() + '-' + path.basename(fp)));
  else { fs.copyFileSync(fp, path.join(trashDir, Date.now() + '-' + path.basename(fp))); fs.unlinkSync(fp); }
  res.json({ ok: true });
});

// ═══ SYSTEM FILE BROWSER ═══
router.get('/api/system/browse', (req, res) => {
  const dir = req.query.dir;
  const allowedRoots = [h.ROOT, h.HOME, '/tmp'];
  if (!dir) return res.json({ roots: [{ label: 'QuickClaw Root', path: h.ROOT }, { label: 'Home (~)', path: h.HOME }, { label: 'Temp', path: '/tmp' }].filter(r => fs.existsSync(r.path)) });
  const resolved = path.resolve(dir);
  if (!allowedRoots.some(r => resolved === r || resolved.startsWith(r + '/'))) return res.status(403).json({ error: 'Path not allowed' });
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Not found' });
  try {
    const items = fs.readdirSync(dir).filter(f => !f.startsWith('.')).sort().map(name => {
      const fp = path.join(dir, name);
      try { const s = fs.statSync(fp); return { name, path: fp, isDir: s.isDirectory(), size: s.size, modified: s.mtime.toISOString(), ext: path.extname(name).toLowerCase() }; }
      catch { return { name, path: fp, isDir: false, size: 0, error: true }; }
    });
    items.sort((a, b) => (b.isDir ? 1 : 0) - (a.isDir ? 1 : 0) || a.name.localeCompare(b.name));
    res.json({ dir, items, parent: path.dirname(dir) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/api/system/readfile', (req, res) => {
  try {
    const fp = req.query.path || '';
    const resolved = path.resolve(fp);
    const allowedRoots = [h.ROOT, h.HOME, '/tmp'];
    if (!allowedRoots.some(r => resolved === r || resolved.startsWith(r + '/'))) return res.status(403).json({ error: 'Not allowed' });
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
    const stat = fs.statSync(fp);
    if (stat.size > 2 * 1024 * 1024) return res.json({ content: null, binary: true, size: stat.size });
    const ext = path.extname(fp).toLowerCase();
    const textExts = ['.json', '.md', '.txt', '.yml', '.yaml', '.toml', '.env', '.js', '.ts', '.sh', '.py', '.html', '.css', '.xml', '.ini', '.cfg', '.conf', '.log', ''];
    if (!textExts.includes(ext)) return res.json({ content: null, binary: true, size: stat.size, ext });
    res.json({ content: fs.readFileSync(fp, 'utf-8'), size: stat.size, ext, modified: stat.mtime.toISOString() });
  } catch (e) { res.status(400).json({ error: String(e.message || e) }); }
});
router.put('/api/system/writefile', (req, res) => {
  try {
    const p = h.ensureWithinRoot(req.body?.path || '');
    fs.writeFileSync(p, req.body?.content || '', 'utf8');
    res.json({ ok: true, path: p });
  } catch (e) { res.status(400).json({ error: String(e.message || e) }); }
});

// ═══ DASHBOARD CODE EDITOR ═══
router.get('/api/dashboard/files', (req, res) => {
  const dashDir = path.resolve(__dirname); const files = [];
  function scanDir(dir, prefix) {
    try { fs.readdirSync(dir).forEach(name => { if (name.startsWith('.') || name === 'node_modules') return; const fp = path.join(dir, name); const rel = prefix ? prefix + '/' + name : name; try { const s = fs.statSync(fp); if (s.isDirectory()) scanDir(fp, rel); else files.push({ name: rel, path: fp, size: s.size, modified: s.mtime.toISOString(), ext: path.extname(name).toLowerCase() }); } catch {} }); } catch {}
  }
  scanDir(dashDir, '');
  res.json({ files, dir: dashDir });
});
router.get('/api/dashboard/file', (req, res) => {
  const fp = req.query.path; if (!fp) return res.status(400).json({ error: 'path required' });
  const dashDir = path.resolve(__dirname); const resolved = path.resolve(fp);
  if (!resolved.startsWith(dashDir)) return res.status(403).json({ error: 'Path not in dashboard directory' });
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  const stat = fs.statSync(fp);
  if (stat.size > 5 * 1024 * 1024) return res.status(413).json({ error: 'Too large' });
  res.json({ content: fs.readFileSync(fp, 'utf-8'), size: stat.size, modified: stat.mtime.toISOString() });
});
router.put('/api/dashboard/file', (req, res) => {
  const { filePath, content } = req.body; if (!filePath) return res.status(400).json({ error: 'filePath required' });
  const dashDir = path.resolve(__dirname); const resolved = path.resolve(filePath);
  if (!resolved.startsWith(dashDir)) return res.status(403).json({ error: 'Path not in dashboard directory' });
  if (fs.existsSync(filePath)) {
    const bakDir = path.join(dashDir, '.backups'); fs.mkdirSync(bakDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.writeFileSync(path.join(bakDir, path.basename(filePath) + '.' + ts + '.bak'), fs.readFileSync(filePath));
  }
  fs.writeFileSync(filePath, content); res.json({ ok: true });
});
router.post('/api/dashboard/restart', (req, res) => {
  res.json({ ok: true, message: 'Restart via QuickClaw_Launch.command recommended.' });
});


module.exports = router;
