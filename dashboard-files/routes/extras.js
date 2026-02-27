/**
 * routes/extras.js — Extras routes
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const h = require('../lib/helpers');
const st = require('../lib/state');

const router = Router();

// ═══ UPDATES ═══
router.get('/api/updates/cli', async (req, res) => {
  const c = await h.run(`${h.cliBin()} --version 2>/dev/null`);
  const l = await h.run('npm show openclaw version 2>/dev/null', { timeout: 20000 });
  res.json({ current: h.cleanCli(c.output), latest: l.output, updateAvailable: c.output !== l.output && l.ok });
});
router.post('/api/updates/cli/upgrade', async (req, res) => {
  const r = await h.run('npm install -g openclaw@latest 2>&1', { timeout: 180000 });
  const v = await h.run(`${h.cliBin()} --version 2>/dev/null`);
  res.json({ ok: r.ok, version: h.cleanCli(v.output) || 'unknown', output: h.cleanCli(r.output || ''), error: r.ok ? null : r.output });
});
router.get('/api/updates/workspace/:id', async (req, res) => {
  const pp = st.profilePaths(req.params.id);
  if (!fs.existsSync(path.join(pp.workspace, '.git'))) return res.json({ isGit: false });
  await h.run(`cd "${pp.workspace}" && git fetch origin 2>/dev/null`, { timeout: 20000 });
  const b = await h.run(`cd "${pp.workspace}" && git branch --show-current 2>/dev/null`);
  const bh = await h.run(`cd "${pp.workspace}" && git rev-list --count HEAD..origin/${b.output || 'main'} 2>/dev/null`);
  const lc = await h.run(`cd "${pp.workspace}" && git log -1 --format="%h %s" 2>/dev/null`);
  const d = await h.run(`cd "${pp.workspace}" && git status --porcelain 2>/dev/null`);
  res.json({ isGit: true, branch: b.output, behindBy: parseInt(bh.output) || 0, lastCommit: lc.output, dirty: !!d.output });
});
router.post('/api/updates/workspace/:id/pull', async (req, res) => {
  const pp = st.profilePaths(req.params.id);
  await h.run(`cd "${pp.workspace}" && git stash 2>/dev/null`);
  const r = await h.run(`cd "${pp.workspace}" && git pull 2>/dev/null`, { timeout: 60000 });
  await h.run(`cd "${pp.workspace}" && git stash pop 2>/dev/null`);
  res.json({ ok: r.ok, output: r.output });
});

// ═══ ANTFARM ═══
router.get('/api/antfarm/status', async (req, res) => {
  const i = await h.run('which antfarm 2>/dev/null');
  if (!i.ok || !i.output) return res.json({ installed: false });
  const wf = await h.run('antfarm workflow list 2>/dev/null');
  const wl = []; if (wf.ok) wf.output.split('\n').forEach(l => { const m = l.match(/^\s+(\S+)/); if (m && !l.includes('Available')) wl.push(m[1]); });
  res.json({ installed: true, workflows: wl, runsCount: st.getAntfarmRuns().length });
});
router.get('/api/antfarm/runs', (req, res) => res.json({ runs: st.getAntfarmRuns() }));
router.post('/api/antfarm/run', async (req, res) => {
  const { workflow, task } = req.body;
  if (!task) return res.status(400).json({ error: 'task required' });
  if (workflow) {
    const r = await h.run(`antfarm workflow run ${workflow} "${task.replace(/"/g, '\\"')}" 2>/dev/null`, { timeout: 30000 });
    const runRecord = { id: `run-${Date.now()}`, task, workflow, status: r.ok ? 'completed' : 'failed', createdAt: new Date().toISOString(), output: h.cleanCli(r.output) };
    const runs = st.getAntfarmRuns(); runs.unshift(runRecord); st.saveAntfarmRuns(runs.slice(0, 100));
    return res.json({ ok: r.ok, run: runRecord, output: h.cleanCli(r.output) });
  }
  const runRecord = { id: `run-${Date.now()}`, task, status: 'queued', createdAt: new Date().toISOString(), output: 'Queued. Install antfarm globally for live execution.' };
  const runs = st.getAntfarmRuns(); runs.unshift(runRecord); st.saveAntfarmRuns(runs.slice(0, 100));
  res.json({ ok: true, run: runRecord });
});
router.get('/api/antfarm/version', async (req, res) => {
  const cur = await h.run('antfarm --version 2>/dev/null');
  const latest = await h.run('npm show antfarm version 2>/dev/null', { timeout: 20000 });
  res.json({ current: cur.ok ? cur.output : null, latest: latest.ok ? latest.output : null, updateAvailable: cur.ok && latest.ok && cur.output !== latest.output, installed: cur.ok });
});
router.post('/api/antfarm/update', async (req, res) => {
  const r = await h.run('npm install -g antfarm@latest', { timeout: 120000 });
  const v = await h.run('antfarm --version 2>/dev/null');
  res.json({ ok: r.ok, version: v.output, output: h.cleanCli(r.output) });
});
router.post('/api/antfarm/rollback', async (req, res) => {
  const { version } = req.body; if (!version || !/^[\d.]+$/.test(version)) return res.status(400).json({ error: 'Valid version required' });
  const r = await h.run(`npm install -g antfarm@${version}`, { timeout: 120000 });
  const v = await h.run('antfarm --version 2>/dev/null');
  res.json({ ok: r.ok, version: v.output, output: h.cleanCli(r.output) });
});
router.post('/api/antfarm/dashboard/:action', async (req, res) => {
  const r = await h.run(`antfarm dashboard ${req.params.action} 2>/dev/null`);
  res.json({ ok: r.ok, output: h.cleanCli(r.output) });
});

// ═══ SETTINGS / QUICK-ENABLE ═══
router.get('/api/settings', (req, res) => res.json(st.getSettings()));
router.put('/api/settings', (req, res) => { st.saveSettings(req.body || {}); res.json({ ok: true, settings: st.getSettings() }); });
router.post('/api/openai/quick-enable', (req, res) => {
  const apiKey = String(req.body?.apiKey || '').trim(); const oauth = !!req.body?.oauth;
  if (!apiKey && !oauth) return res.status(400).json({ ok: false, error: 'Provide apiKey or oauth=true' });
  st.saveSettings({ openaiApiKey: apiKey || st.getSettings().openaiApiKey || '', openaiOAuthEnabled: oauth });
  const skills = st.getSkills().map(s => s.id === 'openai-auth' ? { ...s, installed: true, enabled: true } : s); st.saveSkills(skills);
  const out = st.applySettingsToConfigFile();
  res.json({ ok: true, message: 'OpenAI quick-connect enabled', settings: st.getSettings(), backup: out.backup });
});
router.post('/api/telegram/quick-enable', (req, res) => {
  const botToken = String(req.body?.botToken || '').trim();
  if (!botToken || !botToken.includes(':')) return res.status(400).json({ ok: false, error: 'Invalid Telegram bot token format' });
  st.saveSettings({ telegramBotToken: botToken });
  const skills = st.getSkills().map(s => s.id === 'telegram-setup' ? { ...s, installed: true, enabled: true } : s); st.saveSkills(skills);
  const out = st.applySettingsToConfigFile();
  res.json({ ok: true, message: 'Telegram quick-connect enabled', backup: out.backup });
});
router.get('/api/settings/export', (req, res) => { res.setHeader('Content-Type', 'application/json'); res.setHeader('Content-Disposition', 'attachment; filename="quickclaw-settings.json"'); res.send(JSON.stringify({ exportedAt: new Date().toISOString(), settings: st.getSettings() }, null, 2)); });
router.post('/api/settings/import', (req, res) => { st.saveSettings(req.body?.settings || req.body || {}); res.json({ ok: true, settings: st.getSettings() }); });
router.get('/api/skills', (req, res) => res.json({ skills: st.getSkills() }));
router.post('/api/skills/toggle', (req, res) => { const { id, enabled } = req.body || {}; const list = st.getSkills().map(s => s.id === id ? { ...s, enabled: !!enabled } : s); st.saveSkills(list); res.json({ ok: true, skills: list }); });
router.post('/api/skills/install', (req, res) => { const { id } = req.body || {}; const list = st.getSkills().map(s => s.id === id ? { ...s, installed: true } : s); st.saveSkills(list); res.json({ ok: true, skills: list }); });

// ═══ MEMORY ═══
router.get('/api/memory/files', (req, res) => {
  try { const dir = path.join(h.ROOT, 'memory'); if (!fs.existsSync(dir)) return res.json({ files: [] }); const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort().reverse(); res.json({ files: files.map(f => path.join(dir, f)) }); }
  catch (e) { res.status(500).json({ ok: false, error: String(e.message || e) }); }
});
router.get('/api/memory/file', (req, res) => { try { const p = h.ensureWithinRoot(req.query.path || ''); res.json({ ok: true, path: p, content: fs.readFileSync(p, 'utf8') }); } catch (e) { res.status(400).json({ ok: false, error: String(e.message || e) }); } });
router.put('/api/memory/file', (req, res) => { try { const p = h.ensureWithinRoot(req.body?.path || ''); fs.writeFileSync(p, req.body?.content || '', 'utf8'); res.json({ ok: true, path: p }); } catch (e) { res.status(400).json({ ok: false, error: String(e.message || e) }); } });
router.post('/api/memory/create', (req, res) => {
  try { const name = String(req.body?.name || '').trim(); if (!name) return res.status(400).json({ ok: false, error: 'name is required' }); const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_'); const dir = path.join(h.ROOT, 'memory'); fs.mkdirSync(dir, { recursive: true }); const file = path.join(dir, safe.endsWith('.md') ? safe : `${safe}.md`); if (!fs.existsSync(file)) fs.writeFileSync(file, req.body?.content || `# ${safe}\n`, 'utf8'); res.json({ ok: true, path: file }); }
  catch (e) { res.status(400).json({ ok: false, error: String(e.message || e) }); }
});
router.get('/api/memory/export', (req, res) => {
  const files = []; const memDir = path.join(h.ROOT, 'memory');
  if (fs.existsSync(memDir)) for (const f of fs.readdirSync(memDir).filter(x => x.endsWith('.md'))) { const p = path.join(memDir, f); files.push({ path: p, content: fs.readFileSync(p, 'utf8') }); }
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Content-Disposition', 'attachment; filename="quickclaw-memory-export.json"');
  res.send(JSON.stringify({ exportedAt: new Date().toISOString(), files, profiles: st.getProfiles() }, null, 2));
});

// ═══ CHAT ═══
router.get('/api/chat/history', (req, res) => res.json({ messages: st.getChatHistory().slice(-100) }));
router.post('/api/chat/send', (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ ok: false, error: 'text is required' });
  const rows = st.getChatHistory(); rows.push({ role: 'user', text, at: new Date().toISOString() });
  let reply = 'Got it. I saved this in local chat history.';
  if (text.toLowerCase().includes('openai')) reply = 'Use Integrations tab → OpenAI key + Quick Connect.';
  if (text.toLowerCase().includes('memory')) reply = 'Use Memory tab to create/edit files.';
  rows.push({ role: 'assistant', text: reply, at: new Date().toISOString() });
  st.saveChatHistory(rows.slice(-300)); res.json({ ok: true, reply, messages: rows.slice(-40) });
});


module.exports = router;
