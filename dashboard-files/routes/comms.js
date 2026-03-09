/**
 * routes/comms.js — Comms routes
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const h = require('../lib/helpers');
const st = require('../lib/state');

const router = Router();

// ═══ FTP ═══
router.get('/api/profiles/:id/ftp', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const env = fs.existsSync(pp.envPath) ? h.readEnv(pp.envPath) : {};
  const hasFtpSkill = fs.existsSync(path.join(pp.workspace, 'skills', 'ftp-deploy'));
  res.json({ host: env.FTP_HOST || st.getSettings().ftpHost || '', user: env.FTP_USER || st.getSettings().ftpUser || '', pass: env.FTP_PASS ? h.maskKey(env.FTP_PASS) : '', port: env.FTP_PORT || '21', hasCredentials: !!(env.FTP_HOST && env.FTP_USER) || !!st.getSettings().ftpHost, ftpEnabled: env.FTP_ENABLED !== 'false', hasFtpSkill, revealPass: req.query.reveal === 'true' ? (env.FTP_PASS || '') : undefined });
});
router.put('/api/profiles/:id/ftp', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const { host, user, pass, port } = req.body;
  if (fs.existsSync(pp.envPath)) {
    const env = h.readEnv(pp.envPath);
    if (host !== undefined) env.FTP_HOST = host; if (user !== undefined) env.FTP_USER = user; if (pass !== undefined) env.FTP_PASS = pass; if (port !== undefined) env.FTP_PORT = port || '21';
    h.writeEnv(pp.envPath, env);
  } else { st.saveSettings({ ftpHost: host || '', ftpUser: user || '' }); }
  res.json({ ok: true });
});
router.post('/api/profiles/:id/ftp/toggle', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  if (fs.existsSync(pp.envPath)) { const env = h.readEnv(pp.envPath); env.FTP_ENABLED = req.body.enabled ? 'true' : 'false'; h.writeEnv(pp.envPath, env); }
  res.json({ ok: true, ftpEnabled: req.body.enabled });
});

// ═══ SMTP ═══
router.get('/api/profiles/:id/smtp', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const env = fs.existsSync(pp.envPath) ? h.readEnv(pp.envPath) : {};
  res.json({ host: env.SMTP_HOST || '', port: env.SMTP_PORT || '587', user: env.SMTP_USER || st.getSettings().emailUser || '', pass: env.SMTP_PASS ? h.maskKey(env.SMTP_PASS) : '', from: env.SMTP_FROM || '', secure: env.SMTP_SECURE === 'true', hasCredentials: !!(env.SMTP_HOST && env.SMTP_USER), smtpEnabled: env.SMTP_ENABLED !== 'false', revealPass: req.query.reveal === 'true' ? (env.SMTP_PASS || '') : undefined });
});
router.put('/api/profiles/:id/smtp', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  const { host, port, user, pass, from, secure } = req.body;
  if (fs.existsSync(pp.envPath)) {
    const env = h.readEnv(pp.envPath);
    if (host !== undefined) env.SMTP_HOST = host; if (port !== undefined) env.SMTP_PORT = port; if (user !== undefined) env.SMTP_USER = user; if (pass !== undefined) env.SMTP_PASS = pass; if (from !== undefined) env.SMTP_FROM = from; if (secure !== undefined) env.SMTP_SECURE = secure ? 'true' : 'false';
    h.writeEnv(pp.envPath, env);
  }
  res.json({ ok: true });
});
router.post('/api/profiles/:id/smtp/toggle', (req, res) => {
  const pp = st.profilePaths(req.params.id);
  if (fs.existsSync(pp.envPath)) { const env = h.readEnv(pp.envPath); env.SMTP_ENABLED = req.body.enabled ? 'true' : 'false'; h.writeEnv(pp.envPath, env); }
  res.json({ ok: true, smtpEnabled: req.body.enabled });
});


module.exports = router;
