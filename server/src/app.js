// HTTP API + static hosting for the web game and booth screen.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { validateRun, validateQuiz, cleanName, cleanClassName, darwinDay } from './scoring.js';
import { createBattles } from './battles.js';
import { TOWN_IDS } from '../../web/js/towns.js';
import { WHO_IDS, CLASS_CODE_RE, BATTLE_CODE_RE } from '../../web/js/groups.js';
import { CHARACTERS } from '../../web/js/characters.js';

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const sameHash = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const CLASS_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, '../../web');
// Optional: put the Android APK here (downloaded from GitHub Actions) to serve it at /app.apk.
const APK_PATH = process.env.APK_PATH || path.resolve(__dirname, '../downloads/top-end-survivor.apk');

// Simple fixed-window rate limiter (per IP). Good enough for one booth + phones.
// Phones retry after Retry-After seconds and keep the score queued meanwhile (see web/js/api.js).
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  let windowStart = Date.now();
  setInterval(() => { hits.clear(); windowStart = Date.now(); }, windowMs).unref();
  return (req, res, next) => {
    const key = req.ip;
    const n = (hits.get(key) || 0) + 1;
    hits.set(key, n);
    if (n > max) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((windowStart + windowMs - Date.now()) / 1000))));
      return res.status(429).json({ error: 'Too many requests, slow down.' });
    }
    next();
  };
}

// How much a run's claimed play time may exceed what the server saw (network and clock slack).
const SESSION_SLACK_MS = 5000;

export function createApp(repo, opts = {}) {
  const adminToken = opts.adminToken ?? process.env.ADMIN_TOKEN ?? '';
  const publicUrl = opts.publicUrl ?? process.env.PUBLIC_URL ?? '';
  const now = opts.now || (() => new Date());
  const clock = opts.clock || (() => Date.now()); // milliseconds, for game sessions
  // requireSession: false (tests only) treats every run as verified.
  const requireSession = opts.requireSession ?? true;

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

  // Per IP. At an event most phones share the venue Wi-Fi (one public IP): 40 phones each sending a
  // session, a run, a name, a town and a group answer a minute is about 200 writes, so allow plenty.
  const writeLimit = rateLimit({ windowMs: 60_000, max: opts.writeLimit ?? (Number(process.env.WRITE_LIMIT) || 3000) });
  // Booth Battles send a small update every round from every phone at once.
  const battleLimit = rateLimit({ windowMs: 60_000, max: opts.battleLimit ?? (Number(process.env.BATTLE_LIMIT) || 6000) });
  const battles = opts.battles || createBattles({ onFinish: (run, name) => repo.addRun(run, name, today()) });
  const today = () => darwinDay(now());

  app.get('/api/health', (req, res) => res.json({ ok: true, day: today(), apk: fs.existsSync(APK_PATH) }));

  app.get('/app.apk', (req, res) => {
    if (!fs.existsSync(APK_PATH)) return res.status(404).send('The Android app is not available yet.');
    res.download(APK_PATH, 'top-end-survivor.apk', { headers: { 'Content-Type': 'application/vnd.android.package-archive' } });
  });

  // Start a game session: the server notes the time, so the finished run can be checked against it.
  app.post('/api/sessions', writeLimit, (req, res) => {
    const { clientId } = req.body || {};
    if (typeof clientId !== 'string' || clientId.length < 8 || clientId.length > 64) return res.status(400).json({ error: 'Invalid client id.' });
    const mode = ['classic', 'daily', 'journey', 'endless'].includes(req.body.mode) ? req.body.mode : 'classic';
    const id = crypto.randomBytes(16).toString('hex');
    repo.startSession(id, clientId, mode, clock());
    res.status(201).json({ sessionId: id });
  });

  // Submit a finished run (name optional, can be attached later).
  app.post('/api/runs', writeLimit, (req, res) => {
    const v = validateRun(req.body, { today: today() });
    if (v.error) return res.status(400).json({ error: v.error });
    // A retry of a run we already saved (the phone lost our reply): answer with the same record.
    const dup = repo.findRunByKey(v.run.clientId, v.run.runKey);
    if (dup) return res.json({ id: dup.id, score: dup.score, rounds: dup.rounds, verified: !!dup.verified, duplicate: true });
    // Verified: played inside a session this device started, no faster than the server's clock allows.
    // Unverified runs (offline play, no session, impossible timing) still count for the learning
    // stats but stay off the leaderboards.
    let verified = !requireSession;
    if (requireSession && v.run.sessionId) {
      const s = repo.getSession(v.run.sessionId);
      const elapsed = s ? clock() - s.created_ms : -1;
      verified = !!s && !s.used && s.client_id === v.run.clientId && s.mode === v.run.mode &&
        v.run.durationMs <= elapsed + SESSION_SLACK_MS && v.run.minPlayMs <= elapsed + SESSION_SLACK_MS &&
        repo.useSession(s.id);
    }
    v.run.verified = verified;
    let name = null;
    if (req.body.name != null) {
      const c = cleanName(req.body.name);
      if (c.error) return res.status(400).json({ error: c.error });
      name = c.name;
    }
    if (v.run.challengeOf && !repo.getChallenge(v.run.challengeOf)) v.run.challengeOf = null;
    if (v.run.classCode && !repo.getClass(v.run.classCode)) v.run.classCode = null;
    let id;
    try { id = repo.addRun(v.run, name, today()); } catch (e) {
      // Two copies of the same run arriving at once: the unique run key keeps just one.
      const again = repo.findRunByKey(v.run.clientId, v.run.runKey);
      if (!again) throw e;
      return res.json({ id: again.id, score: again.score, rounds: again.rounds, verified: !!again.verified, duplicate: true });
    }
    res.status(201).json({ id, score: v.run.score, rounds: v.run.rounds, verified });
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

  // Locals vs visitors: set the group on a run you submitted (same device only).
  app.post('/api/runs/:id/who', writeLimit, (req, res) => {
    const id = Number(req.params.id);
    const run = Number.isInteger(id) ? repo.getRun(id) : null;
    if (!run) return res.status(404).json({ error: 'Run not found.' });
    if (run.client_id !== req.body?.clientId) return res.status(403).json({ error: 'Not your run.' });
    if (!WHO_IDS.includes(req.body.who)) return res.status(400).json({ error: 'Unknown group.' });
    repo.setWho(id, req.body.who);
    res.json({ id, who: req.body.who });
  });

  app.get('/api/leaderboard', (req, res) => {
    const period = ['all', 'daily', 'hard', 'endless'].includes(req.query.period) ? req.query.period : 'today';
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const client = typeof req.query.client === 'string' ? req.query.client : null;
    const entries = repo.leaderboard({
      // ?scope=all: all-time for the Daily, Hard and Roo Run boards too (the booth shows all-time records).
      day: period === 'all' || req.query.scope === 'all' ? null : today(), limit, client, mode: ['daily', 'hard', 'endless'].includes(period) ? period : 'classic'
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
    if (v.quiz.classCode && !repo.getClass(v.quiz.classCode)) v.quiz.classCode = null;
    const r = repo.saveQuiz({ ...v.quiz, day: today() });
    if (r.error) return res.status(400).json(r);
    res.json(r);
  });

  // Public settings for the game and booth screens.
  app.get('/api/config', (req, res) => res.json({ voteUrl: repo.getSetting('voteUrl') || process.env.VOTE_URL || '' }));

  // ---- Classroom mode ----
  // A teacher creates a class and gets a join code for students plus a private key for the dashboard.
  app.post('/api/classes', writeLimit, (req, res) => {
    const c = cleanClassName(req.body?.name);
    if (c.error) return res.status(400).json({ error: c.error });
    let code = '';
    for (let i = 0; i < 50 && (!code || repo.getClass(code)); i++) {
      code = Array.from({ length: 5 }, () => CLASS_LETTERS[crypto.randomInt(CLASS_LETTERS.length)]).join('');
    }
    const key = crypto.randomBytes(16).toString('hex');
    repo.createClass(code, c.name, sha256(key));
    res.status(201).json({ code, key, name: c.name });
  });
  app.get('/api/classes/:code', (req, res) => {
    const code = String(req.params.code).toUpperCase();
    const c = CLASS_CODE_RE.test(code) ? repo.getClass(code) : null;
    if (!c) return res.status(404).json({ error: 'No class with that code.' });
    res.json({ code: c.code, name: c.name });
  });
  app.get('/api/classes/:code/report', (req, res) => {
    const code = String(req.params.code).toUpperCase();
    const c = CLASS_CODE_RE.test(code) ? repo.getClass(code) : null;
    if (!c) return res.status(404).json({ error: 'No class with that code.' });
    const key = req.get('X-Class-Key') || req.query.key || '';
    if (!sameHash(sha256(key), c.key_hash)) return res.status(403).json({ error: 'Wrong teacher key.' });
    res.json({ code: c.code, name: c.name, createdAt: c.created_at, ...repo.classReport(c.code) });
  });

  // ---- Live Booth Battle ----
  const battleCode = (req) => { const c = String(req.params.code || '').toUpperCase(); return BATTLE_CODE_RE.test(c) ? c : null; };
  const sendBattle = (res, r) => (r.error ? res.status(r.status || 400).json({ error: r.error }) : res.json(r));
  app.post('/api/battles', writeLimit, (req, res) => {
    const r = battles.create();
    if (r.error) return res.status(503).json({ error: r.error });
    res.status(201).json({ hostKey: r.hostKey, battle: battles.get(r.battle.code) });
  });
  // Phones and the booth poll this about once a second; reads are cheap, so no rate limit here.
  app.get('/api/battles/:code', (req, res) => {
    const code = battleCode(req);
    const b = code && battles.get(code);
    if (!b) return res.status(404).json({ error: 'No battle with that code.' });
    res.json({ battle: b });
  });
  app.post('/api/battles/:code/join', battleLimit, (req, res) => {
    const code = battleCode(req);
    if (!code) return res.status(404).json({ error: 'No battle with that code.' });
    const { clientId, character, who } = req.body || {};
    if (typeof clientId !== 'string' || clientId.length < 8 || clientId.length > 64) return res.status(400).json({ error: 'Invalid client id.' });
    const n = cleanName(req.body?.name);
    if (n.error) return res.status(400).json({ error: n.error });
    sendBattle(res, battles.join(code, {
      clientId, name: n.name,
      character: CHARACTERS.some(c => c.id === character) ? character : CHARACTERS[0].id,
      who: WHO_IDS.includes(who) ? who : null
    }));
  });
  app.post('/api/battles/:code/start', battleLimit, (req, res) => {
    const code = battleCode(req);
    if (!code) return res.status(404).json({ error: 'No battle with that code.' });
    sendBattle(res, battles.start(code, String(req.body?.hostKey || '')));
  });
  app.post('/api/battles/:code/progress', battleLimit, (req, res) => {
    const code = battleCode(req);
    if (!code) return res.status(404).json({ error: 'No battle with that code.' });
    const { playerId, clientId, results } = req.body || {};
    sendBattle(res, battles.progress(code, { playerId: String(playerId || ''), clientId: String(clientId || ''), results }));
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
  // People's Choice voting link. Set it on the day without changing code: either the VOTE_URL
  // environment variable on the host, or POST here (the booth does it for you: /booth?vote=<link>&token=<ADMIN_TOKEN>).
  app.post('/api/admin/config', requireAdmin, (req, res) => {
    const v = typeof req.body?.voteUrl === 'string' ? req.body.voteUrl.trim() : '';
    if (v && !(/^https?:\/\/\S+$/.test(v) && v.length <= 500)) return res.status(400).json({ error: 'The vote link must start with http:// or https://' });
    repo.setSetting('voteUrl', v);
    res.json({ voteUrl: v });
  });
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
  // Friendly URL for the sandbox tester (same screen as /?admin=1).
  app.get(['/admin', '/debug'], (req, res) => res.redirect('/?admin=1'));
  app.get('/sw.js', (req, res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(WEB_DIR, 'sw.js')); });
  app.get('/booth', (req, res) => res.sendFile(path.join(WEB_DIR, 'booth.html')));
  app.get('/class', (req, res) => res.sendFile(path.join(WEB_DIR, 'class.html')));
  app.use(express.static(WEB_DIR, { maxAge: '1h', setHeaders: (res, p) => { if (p.endsWith('.html')) res.set('Cache-Control', 'no-cache'); } }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  });

  return app;
}
