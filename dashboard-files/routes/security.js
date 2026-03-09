/**
 * routes/security.js — Security routes
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const h = require('../lib/helpers');
const st = require('../lib/state');

const router = Router();

// ═══ SECURITY AUDIT — Mac-adapted ═══
router.get('/api/security/audit', async (req, res) => {
  const gw = await h.gatewayState();
  const a = { checks: [], summary: {} };
  function add(cat, name, status, detail, severity, extra = {}) { a.checks.push({ category: cat, name, status, detail, severity, ...extra }); }

  add('Gateway', 'Gateway running', gw.running ? 'pass' : 'warn', gw.running ? 'Active' : 'Not running', 'high');
  add('Config', 'Config file exists', fs.existsSync(h.CONFIG_PATH) ? 'pass' : 'warn', fs.existsSync(h.CONFIG_PATH) ? 'Present' : 'Missing', 'medium');

  // macOS firewall check
  const fw = h.runSync('/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null');
  add('Firewall', 'macOS Firewall', fw.output?.includes('enabled') ? 'pass' : 'warn', fw.output?.includes('enabled') ? 'Enabled' : 'Not enabled', 'medium', {
    explanation: 'The macOS application firewall helps protect against unwanted incoming connections.',
    manualFix: 'System Settings → Network → Firewall → Turn On'
  });

  // Check .env file permissions
  let envSecure = true;
  for (const p of st.getProfiles()) {
    const pp = st.profilePaths(p.id);
    if (fs.existsSync(pp.envPath)) { const mode = fs.statSync(pp.envPath).mode; if (mode & 0o077) envSecure = false; }
  }
  add('Files', 'Env permissions', envSecure ? 'pass' : 'warn', envSecure ? 'Restricted' : 'Loose — some .env files are world-readable', 'high', {
    explanation: 'Your .env files contain API keys. File permissions should be restricted (chmod 600).',
    fixId: 'env-perms', fixDesc: 'Set all .env files to chmod 600'
  });

  // SIP check
  const sip = h.runSync('csrutil status 2>/dev/null');
  add('System', 'SIP (System Integrity Protection)', sip.output?.includes('enabled') ? 'pass' : 'warn', sip.output?.includes('enabled') ? 'Enabled' : 'Disabled or unknown', 'medium', {
    explanation: 'SIP protects critical system files from modification. Keep it enabled unless you have a specific reason to disable it.'
  });

  // Disk encryption
  const fv = h.runSync('fdesetup status 2>/dev/null');
  add('Encryption', 'FileVault', fv.output?.includes('On') ? 'pass' : 'info', fv.output?.includes('On') ? 'Enabled' : 'Not detected (check System Settings)', 'medium', {
    explanation: 'FileVault encrypts your entire disk, protecting your API keys and data if your Mac is stolen.'
  });

  // Node/npm versions
  const nodeV = h.runSync('node --version 2>/dev/null');
  add('System', 'Node.js', nodeV.ok ? 'pass' : 'fail', nodeV.output || 'Not found', 'high');

  const cn = { pass: 0, warn: 0, fail: 0, info: 0 }; a.checks.forEach(c => cn[c.status]++);
  a.summary = cn; a.score = Math.max(0, 100 - (cn.fail * 25) - (cn.warn * 10));
  res.json(a);
});

router.post('/api/security/fix', (req, res) => {
  const { fixId } = req.body;
  if (!fixId) return res.status(400).json({ error: 'fixId required' });
  if (fixId === 'env-perms') {
    for (const p of st.getProfiles()) { const pp = st.profilePaths(p.id); if (fs.existsSync(pp.envPath)) try { fs.chmodSync(pp.envPath, 0o600); } catch {} }
    return res.json({ ok: true, message: 'All .env files set to chmod 600' });
  }
  res.status(400).json({ error: 'Unknown fix: ' + fixId });
});


module.exports = router;
