/**
 * state.js — Stateful data: profiles, settings, skills, usage, news, versions
 */
const fs = require('fs');
const path = require('path');
const h = require('./helpers');

// ═══ PROFILE MANAGEMENT ═══
function getProfiles() {
  const list = h.readJson(h.PROFILES_PATH, null);
  if (Array.isArray(list) && list.length) return list;
  const starter = [{ id: 'default', name: 'Default', active: true, status: 'running', port: 3000, notes: '', soul: '', memoryPath: '', createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString() }];
  h.writeJson(h.PROFILES_PATH, starter);
  return starter;
}
function saveProfiles(list) { h.writeJson(h.PROFILES_PATH, list); }

function profilePaths(profileId) {
  // Primary: external drive state dir (portable, unpluggable)
  const stateDir = h.OPENCLAW_STATE_DIR;
  // Fallback: legacy paths on Mac
  const ocDir = path.join(h.HOME, '.openclaw');
  const cbDir = path.join(h.HOME, '.clawdbot');
  if (profileId === 'default') {
    // Prefer external drive, fall back to legacy Mac paths
    const configDir = fs.existsSync(stateDir) ? stateDir : (fs.existsSync(ocDir) ? ocDir : (fs.existsSync(cbDir) ? cbDir : stateDir));
    const workspace = fs.existsSync(path.join(stateDir, 'workspace')) ? path.join(stateDir, 'workspace') :
      (fs.existsSync(path.join(h.HOME, 'clawd')) ? path.join(h.HOME, 'clawd') : h.ROOT);
    return { configDir, workspace, envPath: path.join(configDir, '.env'), configJson: path.join(configDir, 'clawdbot.json') };
  }
  const suffix = '-' + profileId.replace(/^p-/, '');
  const configDir = fs.existsSync(stateDir + suffix) ? (stateDir + suffix) :
    (fs.existsSync(ocDir + suffix) ? (ocDir + suffix) : (cbDir + suffix));
  const workspace = path.join(stateDir, 'workspace' + suffix);
  return { configDir, workspace, envPath: path.join(configDir, '.env'), configJson: path.join(configDir, 'clawdbot.json') };
}

function profileEnvVars(profileId) {
  const pp = profilePaths(typeof profileId === 'object' ? (profileId.id || profileId) : profileId);
  return {
    CLAWDBOT_CONFIG_DIR: pp.configDir,
    OPENCLAW_CONFIG_DIR: pp.configDir,
    OPENCLAW_STATE_DIR: h.OPENCLAW_STATE_DIR,
    OPENCLAW_CONFIG_PATH: path.join(pp.configDir, 'openclaw.json')
  };
}

// Register with helpers so gatewayExec() always passes the active profile's config dir
h.setProfileEnvProvider(function() {
  try {
    const profiles = getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    if (active) return profileEnvVars(active.id);
  } catch {}
  return {};
});

function findSoul(pp) {
  const cfg = h.readJson(pp.configJson, null);
  const paths = [];
  if (cfg?.soulFile) paths.push(path.resolve(pp.workspace, cfg.soulFile));
  paths.push(path.join(pp.workspace, 'soul.md'), path.join(pp.workspace, 'SOUL.md'), path.join(pp.configDir, 'soul.md'));
  for (const x of paths) if (fs.existsSync(x)) return x;
  return null;
}
function getSkillStates(pp) { return h.readJson(path.join(pp.workspace, '.skill-states.json'), {}); }
function saveSkillStates(pp, s) { h.writeJson(path.join(pp.workspace, '.skill-states.json'), s); }

// ═══ SETTINGS ═══
function getSettings() {
  const defaults = {
    openaiApiKey: '', openaiOAuthEnabled: false, anthropicApiKey: '',
    telegramBotToken: '', ftpHost: '', ftpUser: '', emailUser: ''
  };
  const raw = h.readJson(h.SETTINGS_PATH, defaults);
  // Guard against corrupt file returning non-object (null, string, array, etc.)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  return raw;
}
function saveSettings(s) {
  try {
    const current = getSettings();
    const merged = Object.assign({}, current, s);
    h.writeJson(h.SETTINGS_PATH, merged);
  } catch (err) {
    console.error('saveSettings error:', err.message, '— path:', h.SETTINGS_PATH);
    // Fallback: try to write just the new values
    try { h.writeJson(h.SETTINGS_PATH, s); } catch (e2) { console.error('saveSettings fallback also failed:', e2.message); }
    throw err; // Re-throw so callers can catch
  }
}

// ═══ SKILLS CATALOG ═══
function defaultSkillsCatalog() {
  return [
    { id: 'core-tools', name: 'Core Platform Tools', description: 'Essential local runtime controls.', includes: ['gateway controls', 'log viewer', 'config apply/backup', 'profile persistence'], enabled: true, installed: true, risk: 'low' },
    { id: 'openai-auth', name: 'OpenAI Authentication', description: 'Stores OpenAI credentials and OAuth mode flags.', includes: ['api key field', 'oauth mode flag', 'settings export/import'], enabled: false, installed: true, risk: 'medium' },
    { id: 'ftp-deploy', name: 'FTP Deploy', description: 'Deployment helper settings for FTP workflows.', includes: ['ftp host/user settings', 'future deploy hooks'], enabled: false, installed: false, risk: 'medium' },
    { id: 'telegram-setup', name: 'Telegram Setup', description: 'Easy BotFather token setup and quick-connect.', includes: ['token save', 'config apply', 'connection hints'], enabled: false, installed: false, risk: 'low' },
    { id: 'email', name: 'Email Integration', description: 'Email account settings for notifications.', includes: ['email user settings', 'future send/read actions'], enabled: false, installed: false, risk: 'medium' },
    { id: 'antfarm', name: 'Antfarm Automation', description: 'Task queue + run history panel.', includes: ['run queue', 'recent runs', 'status panel'], enabled: false, installed: false, risk: 'medium' },
  ];
}
function getSkills() {
  const list = h.readJson(h.SKILLS_PATH, null);
  const defaults = defaultSkillsCatalog();
  if (Array.isArray(list)) {
    const byId = Object.fromEntries(defaults.map(s => [s.id, s]));
    const merged = list.map(s => ({ ...byId[s.id], ...s }));
    for (const d of defaults) if (!merged.find(x => x.id === d.id)) merged.push(d);
    return merged;
  }
  h.writeJson(h.SKILLS_PATH, defaults);
  return defaults;
}
function saveSkills(list) { h.writeJson(h.SKILLS_PATH, list); }

function getAntfarmRuns() { return h.readJson(h.ANTFARM_RUNS_PATH, []); }
function saveAntfarmRuns(runs) { h.writeJson(h.ANTFARM_RUNS_PATH, runs); }
function getChatHistory() { return h.readJson(h.CHAT_HISTORY_PATH, []); }
function saveChatHistory(rows) { h.writeJson(h.CHAT_HISTORY_PATH, rows); }

// ═══ PROFILE ENV STORE ═══
function getProfileEnvStore() { return h.readJson(h.PROFILE_ENV_PATH, {}); }
function saveProfileEnvStore(store) { h.writeJson(h.PROFILE_ENV_PATH, store); }
function getProfileEnv(profileId) {
  const st = getProfileEnvStore();
  const raw = st[profileId] || {};
  const cleaned = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === 'object') cleaned[k] = String(v.value ?? '');
    else cleaned[k] = String(v ?? '');
  }
  return cleaned;
}

// ═══ USAGE TRACKING ═══
function findUsageLogs(pp) {
  const locations = [
    path.join(pp.workspace, 'memory', 'usage-log.json'),
    path.join(pp.workspace, 'memory', 'usage.json'),
    path.join(pp.workspace, '.usage-log.json'),
    path.join(pp.configDir, 'usage-log.json'),
    path.join(pp.configDir, 'agents', 'main', 'usage-log.json'),
  ];
  const memDir = path.join(pp.workspace, 'memory');
  try {
    if (fs.existsSync(memDir)) fs.readdirSync(memDir).forEach(f => {
      if (f.match(/^usage[-_]?\d{4}/) && f.endsWith('.json')) locations.push(path.join(memDir, f));
    });
  } catch {}
  return locations.filter(l => fs.existsSync(l));
}

function aggregateUsage(pp) {
  const files = findUsageLogs(pp);
  let tIn = 0, tOut = 0, tCost = 0;
  const byModel = {}, byDay = {}, sessions = [];
  let lastModified = null;

  files.forEach(fp => {
    const data = h.readJson(fp, null); if (!data) return;
    try { const stat = fs.statSync(fp); if (!lastModified || stat.mtime > lastModified) lastModified = stat.mtime; } catch {}
    const entries = data.entries || (Array.isArray(data) ? data : [data]);
    entries.forEach(e => {
      if (e.totals) {
        const dayKey = e.date || e.timestamp?.slice(0, 10) || 'unknown';
        if (!byDay[dayKey]) byDay[dayKey] = { date: dayKey, inputTokens: 0, outputTokens: 0, cost: 0, sessions: 0 };
        byDay[dayKey].inputTokens += e.totals.inputTokens || 0;
        byDay[dayKey].outputTokens += e.totals.outputTokens || 0;
        byDay[dayKey].cost += e.totals.estimatedCostUsd || 0;
        byDay[dayKey].sessions += e.sessions?.length || 0;
        tIn += e.totals.inputTokens || 0; tOut += e.totals.outputTokens || 0; tCost += e.totals.estimatedCostUsd || 0;
      }
      if (e.sessions) e.sessions.forEach(s => {
        const m = s.model || 'unknown';
        if (!byModel[m]) byModel[m] = { inputTokens: 0, outputTokens: 0, cost: 0, sessions: 0 };
        byModel[m].inputTokens += s.inputTokens || 0; byModel[m].outputTokens += s.outputTokens || 0;
        byModel[m].cost += s.estimatedCostUsd || 0; byModel[m].sessions++;
        sessions.push({ model: m, tokens: (s.inputTokens || 0) + (s.outputTokens || 0), cost: s.estimatedCostUsd || 0, timestamp: s.timestamp || e.date });
      });
    });
  });

  const dayList = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  const daysTracked = dayList.length || 1;
  const avgDaily = tCost / daysTracked;
  return {
    totals: { inputTokens: tIn, outputTokens: tOut, estimatedCostUsd: Math.round(tCost * 10000) / 10000, totalTokens: tIn + tOut },
    byModel, byDay: dayList.slice(-30), daysTracked,
    avgDailyCost: Math.round(avgDaily * 10000) / 10000,
    projected30d: Math.round(avgDaily * 30 * 10000) / 10000,
    recentSessions: sessions.slice(-20).reverse(),
    sources: files.map(f => path.basename(f)),
    lastModified: lastModified ? lastModified.toISOString() : null,
    noData: files.length === 0
  };
}

// ═══ NEWS ═══
function loadNews() { return h.readJson(h.NEWS_FILE, { articles: [], lastFetched: null }); }
function saveNews(data) { h.writeJson(h.NEWS_FILE, data); }
function loadNewsPrefs() {
  return h.readJson(h.NEWS_PREFS_FILE, {
    quality: [], useless: [], bookmarks: [], deletedUrls: [],
    sources: { hn_ai: true, hn_openclaw: true, hn_agents: true, hn_llm: true, github: true, reddit_ai: true, arxiv: true, techcrunch: true },
    customSources: {}
  });
}
function saveNewsPrefs(p) { h.writeJson(h.NEWS_PREFS_FILE, p); }

// ═══ VERSIONS ═══
function getVersions() {
  const meta = h.readJson(path.join(h.VERSIONS_DIR, 'versions.json'), null);
  return meta || { versions: [], current: null, baseStable: null };
}
function saveVersionsMeta(data) { h.writeJson(path.join(h.VERSIONS_DIR, 'versions.json'), data); }

// ═══ CONFIG FILE HELPERS ═══
function openclawConfigPath() {
  // Prefer external drive state dir, fall back to Mac ~/.openclaw
  const stateDir = h.OPENCLAW_STATE_DIR;
  const extPath = path.join(stateDir, 'openclaw.json');
  if (fs.existsSync(extPath)) return extPath;
  const macPath = path.join(h.HOME, '.openclaw', 'openclaw.json');
  if (fs.existsSync(macPath)) return macPath;
  // Default to external drive (will be created)
  return extPath;
}
function writeOpenclawTelegramToken(token) {
  // Write to ALL possible config locations — gateway might read from any of them
  const locations = [
    path.join(h.OPENCLAW_STATE_DIR, 'openclaw.json'),     // External drive state dir
    path.join(h.HOME, '.openclaw', 'openclaw.json'),       // ~/.openclaw (symlink or real)
  ];
  // Also check profile config dir if different
  try {
    const profiles = getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    if (active) {
      const pp = profilePaths(active.id);
      const profilePath = path.join(pp.configDir, 'openclaw.json');
      if (!locations.includes(profilePath)) locations.push(profilePath);
    }
  } catch {}

  let anyWritten = false;
  for (const p of locations) {
    try {
      const dir = path.dirname(p);
      fs.mkdirSync(dir, { recursive: true });
      // Create with defaults if doesn't exist
      if (!fs.existsSync(p)) {
        fs.writeFileSync(p, JSON.stringify({
          channels: {},
          plugins: { entries: {} },
          agents: { defaults: { model: { primary: 'openai/gpt-4o' } } }
        }, null, 2));
      }
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
      // Gateway MUST have mode=local or it refuses to start
      if (!cfg.gateway) cfg.gateway = {};
      cfg.gateway.mode = 'local';
      // Telegram channel config
      cfg.channels = cfg.channels || {};
      cfg.channels.telegram = cfg.channels.telegram || {};
      cfg.channels.telegram.botToken = token;
      cfg.channels.telegram.enabled = true;
      cfg.channels.telegram.dmPolicy = cfg.channels.telegram.dmPolicy || 'open';
      if (!cfg.channels.telegram.allowFrom) cfg.channels.telegram.allowFrom = ['*'];
      cfg.channels.telegram.groupPolicy = 'allowlist';
      cfg.plugins = cfg.plugins || {};
      cfg.plugins.entries = cfg.plugins.entries || {};
      cfg.plugins.entries.telegram = cfg.plugins.entries.telegram || {};
      cfg.plugins.entries.telegram.enabled = true;
      fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
      console.log('✓ Wrote telegram config to: ' + p);
      anyWritten = true;
    } catch (e) {
      console.log('⚠ Failed to write telegram config to ' + p + ': ' + e.message);
    }
  }
  return { ok: anyWritten, paths: locations };
}
function backupCurrentConfig() {
  if (!fs.existsSync(h.CONFIG_PATH)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dst = path.join(h.CONFIG_BACKUPS_DIR, `default-${stamp}.yaml`);
  fs.copyFileSync(h.CONFIG_PATH, dst); return dst;
}
function applySettingsToConfigFile() {
  const s = getSettings(); const backup = backupCurrentConfig();
  const lines = ['# QuickClaw V3 generated config', 'gateway:', '  mode: local', '  port: 5000', '  host: 127.0.0.1', ''];
  if (s.openaiApiKey) lines.push('openai:', `  api_key: "${s.openaiApiKey}"`, '');
  if (s.anthropicApiKey) lines.push('anthropic:', `  api_key: "${s.anthropicApiKey}"`, '');
  if (s.telegramBotToken) lines.push('telegram:', `  bot_token: "${s.telegramBotToken}"`, '');
  if (s.ftpHost || s.ftpUser) lines.push('ftp:', ...(s.ftpHost ? [`  host: "${s.ftpHost}"`] : []), ...(s.ftpUser ? [`  user: "${s.ftpUser}"`] : []), '');
  if (s.emailUser) lines.push('email:', `  user: "${s.emailUser}"`, '');
  fs.mkdirSync(path.dirname(h.CONFIG_PATH), { recursive: true });
  fs.writeFileSync(h.CONFIG_PATH, lines.join('\n'));
  return { path: h.CONFIG_PATH, backup };
}

// ═══ COMPREHENSIVE TELEGRAM SAVE — writes token to ALL config locations ═══
function writeTelegramTokenEverywhere(token) {
  const results = { settings: false, env: false, configJson: false, openclawJson: false, yamlConfig: false, cliAdd: false };

  // Get profile env vars so CLI writes to the correct config dir
  const profiles = getProfiles();
  const active = profiles.find(p => p.active) || profiles[0];
  const profileEnv = active ? profileEnvVars(active.id) : {};

  // 0. PRIMARY: Use OpenClaw CLI to properly register the channel
  //    Pass profile env vars so it writes to the right config location
  try {
    const cliResult = h.runSync(
      `${h.cliBin()} channels add --channel telegram --token "${token}"`,
      { cwd: h.INSTALL_DIR, timeout: 10000, env: { ...profileEnv } }
    );
    results.cliAdd = cliResult.ok;
    if (cliResult.ok) console.log('✓ openclaw channels add succeeded');
    else console.log('⚠ openclaw channels add output:', cliResult.output?.slice(0, 200));
  } catch (e) { console.log('⚠ openclaw channels add failed:', e.message?.slice(0, 100)); }

  // 1. Dashboard settings.json
  try { saveSettings({ telegramBotToken: token }); results.settings = true; } catch {}

  // 2. Active profile .env (both key variants OpenClaw might use)
  try {
    const profiles = getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    if (active) {
      const pp = profilePaths(active.id);
      if (fs.existsSync(pp.configDir)) {
        fs.mkdirSync(pp.configDir, { recursive: true });
        const env = h.readEnv(pp.envPath);
        env.TELEGRAM_BOT_TOKEN = token;
        env.TELEGRAM_TOKEN = token;
        h.writeEnv(pp.envPath, env);
        results.env = true;
      }
    }
  } catch {}

  // 3. Profile clawdbot.json (legacy — some flows still read this)
  try {
    const profiles = getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    if (active) {
      const pp = profilePaths(active.id);
      if (fs.existsSync(pp.configJson)) {
        const cfg = h.readJson(pp.configJson, {});
        if (!cfg.channels) cfg.channels = {};
        if (!cfg.channels.telegram) cfg.channels.telegram = {};
        cfg.channels.telegram.botToken = token;
        cfg.channels.telegram.enabled = true;
        if (!cfg.plugins) cfg.plugins = {};
        if (!cfg.plugins.entries) cfg.plugins.entries = {};
        if (!cfg.plugins.entries.telegram) cfg.plugins.entries.telegram = {};
        cfg.plugins.entries.telegram.enabled = true;
        h.writeJson(pp.configJson, cfg);
        results.configJson = true;
      }
    }
  } catch {}

  // 4. ~/.openclaw/openclaw.json — THE file the gateway actually reads
  //    The CLI (step 0) should handle this, but we do it manually too as insurance
  try { const r = writeOpenclawTelegramToken(token); results.openclawJson = r.ok || false; } catch {}

  // 5. YAML config (default.yaml)
  try { applySettingsToConfigFile(); results.yamlConfig = true; } catch {}

  // 6. Also write to credentials dir (some OpenClaw versions read from here)
  try {
    const profiles = getProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    if (active) {
      const pp = profilePaths(active.id);
      const credDir = path.join(pp.configDir, 'credentials');
      fs.mkdirSync(credDir, { recursive: true });
      const credFile = path.join(credDir, 'telegram.json');
      h.writeJson(credFile, { botToken: token, enabled: true, updatedAt: new Date().toISOString() });
    }
  } catch {}

  return results;
}

// ═══ NEWS SOURCE BUILDER — builds curl commands for each news source ═══
function buildNewsSources(prefs, random) {
  const customSources = {};
  if (prefs?.sources) {
    Object.entries(prefs.sources).forEach(([k, v]) => {
      if (k.startsWith('custom_') && v && typeof v === 'object' && v.url) {
        const domain = v.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        customSources[k] = { name: v.name || domain, cmd: `curl -s "https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(domain)}&tags=story&hitsPerPage=8" 2>/dev/null`, type: 'hn' };
      }
    });
  }
  const ALL_SOURCES = {
    hn_ai: { name: 'HN: AI/ML', cmd: 'curl -s "https://hn.algolia.com/api/v1/search?query=open+source+AI+LLM&tags=story&hitsPerPage=15" 2>/dev/null', type: 'hn' },
    hn_openclaw: { name: 'HN: OpenClaw', cmd: 'curl -s "https://hn.algolia.com/api/v1/search?query=openclaw+OR+clawdbot&tags=story&hitsPerPage=12" 2>/dev/null', type: 'hn' },
    hn_agents: { name: 'HN: AI Agents', cmd: 'curl -s "https://hn.algolia.com/api/v1/search?query=AI+agents+autonomous+tool+use&tags=story&hitsPerPage=12" 2>/dev/null', type: 'hn' },
    hn_llm: { name: 'HN: LLM Dev', cmd: 'curl -s "https://hn.algolia.com/api/v1/search?query=LLM+development+fine+tuning+local&tags=story&hitsPerPage=12" 2>/dev/null', type: 'hn' },
    github: { name: 'GitHub Trending', cmd: 'curl -s "https://api.github.com/search/repositories?q=openclaw+OR+llm+agent+OR+open+source+ai&sort=updated&order=desc&per_page=12" 2>/dev/null', type: 'github' },
    reddit_ai: { name: 'Reddit: AI', cmd: 'curl -s "https://www.reddit.com/r/artificial+LocalLLaMA+MachineLearning/top.json?t=day&limit=12" 2>/dev/null', type: 'reddit' },
    arxiv: { name: 'arXiv: AI Papers', cmd: 'curl -s "http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=10" 2>/dev/null', type: 'arxiv' },
    techcrunch: { name: 'HN: TechCrunch AI', cmd: 'curl -s "https://hn.algolia.com/api/v1/search?query=AI+startup+funding&tags=story&hitsPerPage=10" 2>/dev/null', type: 'hn' },
  };
  const combined = Object.assign({}, ALL_SOURCES, customSources);
  if (random) return Object.entries(combined);
  const srcPrefs = prefs?.sources || {};
  return Object.entries(combined).filter(([k]) => srcPrefs[k] !== false);
}

module.exports = {
  getProfiles, saveProfiles, profilePaths, profileEnvVars, findSoul,
  getSkillStates, saveSkillStates, getSettings, saveSettings,
  getSkills, saveSkills, getAntfarmRuns, saveAntfarmRuns,
  getChatHistory, saveChatHistory,
  getProfileEnvStore, saveProfileEnvStore, getProfileEnv,
  aggregateUsage, loadNews, saveNews, loadNewsPrefs, saveNewsPrefs,
  getVersions, saveVersionsMeta,
  openclawConfigPath, writeOpenclawTelegramToken, backupCurrentConfig, applySettingsToConfigFile,
  writeTelegramTokenEverywhere, buildNewsSources
};
