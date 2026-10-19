// HTTP API + static hosting for the web game and booth screen.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import fs from 'node:fs';
import { validateRun, validateQuiz, cleanName, darwinDay } from './scoring.js';
import { TOWN_IDS } from '../../web/js/towns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, '../../web');
// Optional: put the Android APK here (downloaded from GitHub Actions) to serve it at /app.apk.
const APK_PATH = process.env.APK_PATH || path.resolve(__dirname, '../downloads/top-end-survivor.apk');

// Simple fixed-window rate limiter (per IP). Good enough for one booth + phones.
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, res, next) => {
    const key = req.ip;
    const n = (hits.get(key) || 0) + 1;
    hits.set(key, n);
    if (n > max) return res.status(429).json({ error: 'Too many requests, slow down.' });
    next();
  };
}

export function createApp(repo, opts = {}) {
  const adminToken = opts.adminToken ?? process.env.ADMIN_TOKEN ?? '';
  const publicUrl = opts.publicUrl ?? process.env.PUBLIC_URL ?? '';
  const now = opts.now || (() => new Date());

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  // CORS: the Android app runs on its own origin (https://localhost), so allow cross-origin API calls.
  app.use('/api', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
    res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.set('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  const writeLimit = rateLimit({ windowMs: 60_000, max: opts.writeLimit ?? (Number(process.env.WRITE_LIMIT) || 40) });
  const today = () => darwinDay(now());

  app.get('/api/health', (req, res) => res.json({ ok: true, day: today(), apk: fs.existsSync(APK_PATH) }));

  app.get('/app.apk', (req, res) => {
    if (!fs.existsSync(APK_PATH)) return res.status(404).send('The Android app is not available yet.');
    res.download(APK_PATH, 'top-end-survivor.apk', { headers: { 'Content-Type': 'application/vnd.android.package-archive' } });
  });

  // Submit a finished run (name optional, can be attached later).
  app.post('/api/runs', writeLimit, (req, res) => {
    const v = validateRun(req.body, { today: today() });
    if (v.error) return res.status(400).json({ error: v.error });
    let name = null;
    if (req.body.name != null) {
      const c = cleanName(req.body.name);
      if (c.error) return res.status(400).json({ error: c.error });
      name = c.name;
    }
    if (v.run.challengeOf && !repo.getChallenge(v.run.challengeOf)) v.run.challengeOf = null;
    const id = repo.addRun(v.run, name, today());
    res.status(201).json({ id, score: v.run.score, rounds: v.run.rounds });
  });

  // Attach a name to a run you submitted (same device only).
  app.post('/api/runs/:id/name', writeLimit, (req, res) => {
    const id = Number(req.params.id);
    const run = Number.isInteger(id) ? repo.getRun(id) : null;
    if (!run) return res.status(404).json({ error: 'Run not found.' });
    if (run.client_id !== req.body?.clientId) return res.status(403).json({ error: 'Not your run.' });
    const c = cleanName(req.body.name);
    if (c.error) return res.status(400).json({ error: c.error });
    repo.setName(id, c.name);
    res.json({ id, name: c.name, score: run.score });
  });

  // Set the town on a run you submitted (same device only).
  app.post('/api/runs/:id/town', writeLimit, (req, res) => {
    const id = Number(req.params.id);
    const run = Number.isInteger(id) ? repo.getRun(id) : null;
    if (!run) return res.status(404).json({ error: 'Run not found.' });
    if (run.client_id !== req.body?.clientId) return res.status(403).json({ error: 'Not your run.' });
    if (!TOWN_IDS.includes(req.body.town)) return res.status(400).json({ error: 'Unknown town.' });
    repo.setTown(id, req.body.town);
    res.json({ id, town: req.body.town });
  });

  app.get('/api/leaderboard', (req, res) => {
    const period = ['all', 'daily'].includes(req.query.period) ? req.query.period : 'today';
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const client = typeof req.query.client === 'string' ? req.query.client : null;
    const entries = repo.leaderboard({
      day: period === 'all' ? null : today(), limit, client, mode: period === 'daily' ? 'daily' : 'classic'
    });
    res.json({ period, day: today(), entries });
  });

  app.get('/api/stats', (req, res) => {
    const period = req.query.period === 'all' ? 'all' : 'today';
    res.json({ period, day: today(), ...repo.stats({ day: period === 'today' ? today() : null }) });
  });

  // ---- Challenge a mate ----
  app.get('/api/challenge/:id', (req, res) => {
    const id = Number(req.params.id);
    const c = Number.isInteger(id) ? repo.getChallenge(id) : null;
    if (!c) return res.status(404).json({ error: 'Challenge not found.' });
    res.json({ id: c.id, name: c.name || 'A mate', score: c.score, rounds: c.rounds, mode: c.mode, day: c.day, today: today() });
  });
  app.get('/api/challenges/results', (req, res) => {
    const client = typeof req.query.client === 'string' ? req.query.client : '';
    if (client.length < 8) return res.status(400).json({ error: 'Invalid client id.' });
    res.json({ entries: repo.challengeResults(client).map(e => ({ ...e, challenger: e.challenger || 'A mate' })) });
  });

  // ---- Town Battle ----
  app.get('/api/towns', (req, res) => {
    const period = req.query.period === 'all' ? 'all' : 'today';
    res.json({ period, day: today(), entries: repo.towns({ day: period === 'all' ? null : today() }) });
  });

  // ---- Optional quick safety check ----
  app.post('/api/quiz', writeLimit, (req, res) => {
    const v = validateQuiz(req.body);
    if (v.error) return res.status(400).json({ error: v.error });
    const r = repo.saveQuiz({ ...v.quiz, day: today() });
    if (r.error) return res.status(400).json(r);
    res.json(r);
  });

  // Live "just died" feed for the booth screen.
  app.get('/api/feed', (req, res) => {
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12));
    const entries = repo.feed({ day: today(), limit }).map(e => ({ ...e, name: e.name || null }));
    res.json({ day: today(), entries });
  });

  // QR code pointing players to the game (shown on the booth screen).
  app.get('/api/qr.svg', async (req, res) => {
    const target = (typeof req.query.url === 'string' && /^https?:\/\//.test(req.query.url))
      ? req.query.url
      : (publicUrl || `${req.protocol}://${req.get('host')}/`);
    const svg = await QRCode.toString(target, { type: 'svg', margin: 1, color: { dark: '#1d1a16', light: '#fffaf0' } });
    res.type('image/svg+xml').send(svg);
  });

  // ---- admin (demo-day helpers) ----
  const requireAdmin = (req, res, next) => {
    if (!adminToken) return res.status(503).json({ error: 'Admin disabled. Set ADMIN_TOKEN.' });
    if (req.get('X-Admin-Token') !== adminToken && req.query.token !== adminToken) return res.status(401).json({ error: 'Bad token.' });
    next();
  };
  app.post('/api/admin/reset', requireAdmin, (req, res) => { repo.reset(); res.json({ ok: true }); });
  // Remove the fake players created by scripts/load_test.mjs.
  app.delete('/api/admin/loadtest', requireAdmin, (req, res) => res.json({ deleted: repo.deleteLoadTest() }));
  app.delete('/api/admin/runs/:id', requireAdmin, (req, res) => { repo.deleteRun(Number(req.params.id)); res.json({ ok: true }); });
  // Anonymised per-round data for analysis (no device ids).
  app.get('/api/admin/export.csv', requireAdmin, (req, res) => {
    res.type('text/csv').set('Content-Disposition', 'attachment; filename="top-end-survivor-rounds.csv"').send(repo.exportCsv());
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

  // ---- static web game ----
  app.get('/sw.js', (req, res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(WEB_DIR, 'sw.js')); });
  app.get('/booth', (req, res) => res.sendFile(path.join(WEB_DIR, 'booth.html')));
  app.use(express.static(WEB_DIR, { maxAge: '1h', setHeaders: (res, p) => { if (p.endsWith('.html')) res.set('Cache-Control', 'no-cache'); } }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  });

  return app;
}
