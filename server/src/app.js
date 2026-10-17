// HTTP API + static hosting for the web game and booth screen.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { validateRun, cleanName, darwinDay } from './scoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, '../../web');

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

  const writeLimit = rateLimit({ windowMs: 60_000, max: opts.writeLimit ?? 40 });
  const today = () => darwinDay(now());

  app.get('/api/health', (req, res) => res.json({ ok: true, day: today() }));

  // Submit a finished run (name optional, can be attached later).
  app.post('/api/runs', writeLimit, (req, res) => {
    const v = validateRun(req.body);
    if (v.error) return res.status(400).json({ error: v.error });
    let name = null;
    if (req.body.name != null) {
      const c = cleanName(req.body.name);
      if (c.error) return res.status(400).json({ error: c.error });
      name = c.name;
    }
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

  app.get('/api/leaderboard', (req, res) => {
    const period = req.query.period === 'all' ? 'all' : 'today';
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const client = typeof req.query.client === 'string' ? req.query.client : null;
    const entries = repo.leaderboard({ day: period === 'today' ? today() : null, limit, client });
    res.json({ period, day: today(), entries });
  });

  app.get('/api/stats', (req, res) => {
    const period = req.query.period === 'all' ? 'all' : 'today';
    res.json({ period, day: today(), ...repo.stats({ day: period === 'today' ? today() : null }) });
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
