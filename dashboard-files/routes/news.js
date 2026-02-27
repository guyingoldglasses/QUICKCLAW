/**
 * routes/news.js — News routes
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const h = require('../lib/helpers');
const st = require('../lib/state');

const router = Router();

// ═══ NEWS ═══
router.get('/api/news', (req, res) => {
  const news = st.loadNews(); const prefs = st.loadNewsPrefs();
  if (news.articles) {
    news.articles.forEach(a => { a.isQuality = prefs.quality.includes(a.url); a.isUseless = prefs.useless.includes(a.url); a.isBookmarked = prefs.bookmarks.some(b => b.url === a.url); });
    news.articles = news.articles.filter(a => !prefs.deletedUrls.includes(a.url));
  }
  news.prefs = { sources: prefs.sources, qualityCount: prefs.quality.length, bookmarkCount: prefs.bookmarks.length };
  res.json(news);
});
router.get('/api/news/bookmarks', (req, res) => res.json({ bookmarks: st.loadNewsPrefs().bookmarks }));
router.get('/api/news/quality', (req, res) => {
  const prefs = st.loadNewsPrefs(); const news = st.loadNews();
  const quality = (news.articles || []).filter(a => prefs.quality.includes(a.url) && !prefs.deletedUrls.includes(a.url));
  res.json({ articles: quality });
});
router.post('/api/news/feedback', (req, res) => {
  const { url, action } = req.body; if (!url || !action) return res.status(400).json({ error: 'url and action required' });
  const prefs = st.loadNewsPrefs(); const news = st.loadNews();
  const article = (news.articles || []).find(a => a.url === url);
  if (action === 'quality') { if (!prefs.quality.includes(url)) prefs.quality.push(url); prefs.useless = prefs.useless.filter(u => u !== url); }
  else if (action === 'unquality') prefs.quality = prefs.quality.filter(u => u !== url);
  else if (action === 'useless') { if (!prefs.useless.includes(url)) prefs.useless.push(url); prefs.quality = prefs.quality.filter(u => u !== url); }
  else if (action === 'unuseless') prefs.useless = prefs.useless.filter(u => u !== url);
  else if (action === 'bookmark') { if (!prefs.bookmarks.some(b => b.url === url)) prefs.bookmarks.push({ url, title: article?.title || url, source: article?.source, date: article?.date, savedAt: new Date().toISOString() }); }
  else if (action === 'unbookmark') prefs.bookmarks = prefs.bookmarks.filter(b => b.url !== url);
  else if (action === 'delete') { if (!prefs.deletedUrls.includes(url)) prefs.deletedUrls.push(url); }
  st.saveNewsPrefs(prefs); res.json({ ok: true });
});
router.put('/api/news/sources', (req, res) => {
  const prefs = st.loadNewsPrefs(); prefs.sources = Object.assign(prefs.sources || {}, req.body.sources);
  st.saveNewsPrefs(prefs); res.json({ ok: true, sources: prefs.sources });
});
router.post('/api/news/fetch', async (req, res) => {
  const random = req.body.random === true;
  const prefs = st.loadNewsPrefs();
  const sources = st.buildNewsSources(prefs, random);
  const articles = []; const seenUrls = new Set();

  for (const [key, src] of sources) {
    const r = await h.run(src.cmd, { timeout: 15000 });
    if (!r.ok) continue;
    try {
      if (src.type === 'hn') {
        const data = JSON.parse(r.output);
        if (data.hits) data.hits.forEach(hit => { const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`; if (seenUrls.has(url)) return; seenUrls.add(url); articles.push({ title: hit.title, url, source: src.name, author: hit.author, points: hit.points, comments: hit.num_comments, date: hit.created_at, hnLink: `https://news.ycombinator.com/item?id=${hit.objectID}`, sourceKey: key }); });
      } else if (src.type === 'github') {
        const data = JSON.parse(r.output);
        if (data.items) data.items.forEach(repo => { const url = repo.html_url; if (seenUrls.has(url)) return; seenUrls.add(url); articles.push({ title: `${repo.full_name}: ${(repo.description || '').slice(0, 150)}`, url, source: src.name, author: repo.owner?.login, points: repo.stargazers_count, date: repo.updated_at, isRepo: true, sourceKey: key }); });
      } else if (src.type === 'reddit') {
        const data = JSON.parse(r.output);
        if (data?.data?.children) data.data.children.forEach(c => { const p = c.data; if (!p || p.stickied) return; const url = p.url || `https://reddit.com${p.permalink}`; if (seenUrls.has(url)) return; seenUrls.add(url); articles.push({ title: p.title, url, source: src.name, author: p.author, points: p.score, comments: p.num_comments, date: new Date(p.created_utc * 1000).toISOString(), redditLink: `https://reddit.com${p.permalink}`, sourceKey: key }); });
      } else if (src.type === 'arxiv') {
        const entries = r.output.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
        entries.forEach(entry => {
          const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.replace(/\s+/g, ' ').trim();
          const link = (entry.match(/<id>([\s\S]*?)<\/id>/) || [])[1]?.trim();
          const published = (entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1]?.trim();
          const author = (entry.match(/<name>([\s\S]*?)<\/name>/) || [])[1]?.trim();
          if (title && link && !seenUrls.has(link)) { seenUrls.add(link); articles.push({ title: `[Paper] ${title}`, url: link, source: src.name, author, date: published, isPaper: true, sourceKey: key }); }
        });
      }
    } catch {}
  }

  // Sort with quality boost
  if (!random && prefs.quality.length > 0) {
    const qualitySourceKeys = new Set();
    const oldNews = st.loadNews();
    (oldNews.articles || []).forEach(a => { if (prefs.quality.includes(a.url) && a.sourceKey) qualitySourceKeys.add(a.sourceKey); });
    articles.forEach(a => { if (qualitySourceKeys.has(a.sourceKey)) a.boosted = true; });
    articles.sort((a, b) => { if (a.boosted && !b.boosted) return -1; if (!a.boosted && b.boosted) return 1; return new Date(b.date || 0) - new Date(a.date || 0); });
  } else { articles.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); }

  const news = { articles: articles.slice(0, 60), lastFetched: new Date().toISOString(), fetchCount: articles.length, isRandom: random, sourcesUsed: sources.map(([, s]) => s.name) };
  st.saveNews(news); res.json(news);
});
router.delete('/api/news', (req, res) => { st.saveNews({ articles: [], lastFetched: null }); res.json({ ok: true }); });
router.put('/api/news', (req, res) => {
  const { articles } = req.body;
  if (!Array.isArray(articles)) return res.status(400).json({ error: 'articles array required' });
  const news = { articles, lastFetched: new Date().toISOString(), fetchCount: articles.length };
  st.saveNews(news); res.json(news);
});


module.exports = router;
