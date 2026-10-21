// SQLite storage using Node's built-in driver (no native build step needed).
import { DatabaseSync } from 'node:sqlite';
import { LESSONS } from '../../web/js/lessons.js';
import { WHO_IDS } from '../../web/js/groups.js';
import fs from 'node:fs';
import path from 'node:path';

export function openDb(file = process.env.DB_PATH || 'data/tes.sqlite') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS runs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id   TEXT NOT NULL,
      name        TEXT,
      score       INTEGER NOT NULL,
      rounds      INTEGER NOT NULL,
      wins        INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      app_version TEXT,
      day         TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_runs_score ON runs(score DESC);
    CREATE INDEX IF NOT EXISTS idx_runs_day ON runs(day, score DESC);
    CREATE TABLE IF NOT EXISTS results (
      run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      idx    INTEGER NOT NULL,
      game   TEXT NOT NULL,
      ok     INTEGER NOT NULL,
      ms     INTEGER NOT NULL,
      PRIMARY KEY (run_id, idx)
    );
    CREATE INDEX IF NOT EXISTS idx_results_game ON results(game);
  `);
  // v1.2 migration: game mode (classic or daily). Safe to run on an existing database.
  const cols = db.prepare('PRAGMA table_info(runs)').all().map(c => c.name);
  if (!cols.includes('mode')) db.exec("ALTER TABLE runs ADD COLUMN mode TEXT NOT NULL DEFAULT 'classic'");
  db.exec('CREATE INDEX IF NOT EXISTS idx_runs_mode_day ON runs(mode, day, score DESC)');
  // v1.3 migrations: town battle, challenge links, optional quick safety check.
  if (!cols.includes('town')) db.exec('ALTER TABLE runs ADD COLUMN town TEXT');
  if (!cols.includes('challenge_of')) db.exec('ALTER TABLE runs ADD COLUMN challenge_of INTEGER');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_runs_town ON runs(town, day);
    CREATE INDEX IF NOT EXISTS idx_runs_challenge ON runs(challenge_of);
    CREATE TABLE IF NOT EXISTS quiz (
      client_id  TEXT PRIMARY KEY,
      qids       TEXT NOT NULL,
      pre        INTEGER NOT NULL,
      post       INTEGER,
      day        TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `);
  // v1.5 migrations: relaxed mode, locals vs visitors, classroom mode.
  if (!cols.includes('relaxed')) db.exec('ALTER TABLE runs ADD COLUMN relaxed INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('who')) db.exec('ALTER TABLE runs ADD COLUMN who TEXT');
  if (!cols.includes('class_code')) db.exec('ALTER TABLE runs ADD COLUMN class_code TEXT');
  const qcols = db.prepare('PRAGMA table_info(quiz)').all().map(c => c.name);
  if (!qcols.includes('class_code')) db.exec('ALTER TABLE quiz ADD COLUMN class_code TEXT');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_runs_class ON runs(class_code);
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS classes (
      code       TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      key_hash   TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `);
  return db;
}

const rate = (fails, plays) => (plays ? +(fails / plays).toFixed(3) : null);

export function makeRepo(db) {
  const insRun = db.prepare(`INSERT INTO runs (client_id, name, score, rounds, wins, duration_ms, app_version, day, mode, town, challenge_of, relaxed, who, class_code)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  // Fail rates per game, optionally for one day and/or one class.
  function gameRates({ day = null, classCode = null } = {}) {
    const where = [day && 'u.day = ?', classCode && 'u.class_code = ?'].filter(Boolean);
    const args = [day, classCode].filter(Boolean);
    return db.prepare(`
      SELECT r.game AS id, COUNT(*) AS plays, SUM(1 - r.ok) AS fails,
             ROUND(AVG(CASE WHEN r.ok = 1 THEN r.ms END)) AS avgWinMs
      FROM results r JOIN runs u ON u.id = r.run_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      GROUP BY r.game`).all(...args)
      .map(g => ({ ...g, failRate: g.plays ? +(g.fails / g.plays).toFixed(3) : 0 }))
      .sort((a, b) => b.failRate - a.failRate || b.plays - a.plays);
  }

  // Survival rate the FIRST time a player meets a hazard vs. every time after.
  function learningCurve({ day = null, classCode = null } = {}) {
    const where = ["r.game NOT LIKE 'boss-%'", day && 'u.day = ?', classCode && 'u.class_code = ?'].filter(Boolean);
    const lc = db.prepare(`
      WITH t AS (
        SELECT r.ok, ROW_NUMBER() OVER (PARTITION BY u.client_id, r.game ORDER BY u.id, r.idx) AS n
        FROM results r JOIN runs u ON u.id = r.run_id
        WHERE ${where.join(' AND ')}
      )
      SELECT AVG(CASE WHEN n = 1 THEN ok END) AS firstTry, AVG(CASE WHEN n > 1 THEN ok END) AS laterTries,
             COALESCE(SUM(n = 1), 0) AS nFirst, COALESCE(SUM(n > 1), 0) AS nLater
      FROM t`).get(...[day, classCode].filter(Boolean));
    return {
      firstTry: lc.firstTry == null ? null : +lc.firstTry.toFixed(3),
      laterTries: lc.laterTries == null ? null : +lc.laterTries.toFixed(3),
      nFirst: lc.nFirst, nLater: lc.nLater
    };
  }
  const insRes = db.prepare('INSERT INTO results (run_id, idx, game, ok, ms) VALUES (?, ?, ?, ?, ?)');

  return {
    addRun(run, name, day) {
      db.exec('BEGIN');
      try {
        const { lastInsertRowid } = insRun.run(run.clientId, name || null, run.score, run.rounds, run.wins, run.durationMs, run.appVersion ?? null,
          run.day || day, run.mode || 'classic', run.town || null, run.challengeOf || null, run.relaxed ? 1 : 0, run.who || null, run.classCode || null);
        const id = Number(lastInsertRowid);
        run.results.forEach((r, i) => insRes.run(id, i, r.g, r.ok ? 1 : 0, r.ms));
        db.exec('COMMIT');
        return id;
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    },

    getRun: (id) => db.prepare('SELECT * FROM runs WHERE id = ?').get(id),
    setTown: (id, town) => db.prepare('UPDATE runs SET town = ? WHERE id = ?').run(town, id),
    setWho: (id, who) => db.prepare('UPDATE runs SET who = ? WHERE id = ?').run(who, id),
    deleteLoadTest() {
      const n = db.prepare("SELECT COUNT(*) AS n FROM runs WHERE client_id LIKE 'loadtest-%'").get().n;
      db.prepare("DELETE FROM runs WHERE client_id LIKE 'loadtest-%'").run();
      return n;
    },
    setName: (id, name) => db.prepare('UPDATE runs SET name = ? WHERE id = ?').run(name, id),

    // Best named run per player (client + name), highest first.
    // The main boards mix Classic and Journey runs (same scoring); the Daily board is separate.
    leaderboard({ day = null, limit = 20, client = null, mode = 'classic' } = {}) {
      // Relaxed-mode runs (slower timer) never go on the boards.
      const where = (day ? 'WHERE name IS NOT NULL AND day = ?' : 'WHERE name IS NOT NULL') + ' AND relaxed = 0' + (mode === 'daily' ? ` AND mode = 'daily'` : ` AND mode IN ('classic', 'journey')`);
      const rows = db.prepare(`
        SELECT name, client_id, MAX(score) AS score, MAX(rounds) AS rounds, MIN(created_at) AS first_at
        FROM runs ${where}
        GROUP BY client_id, name
        ORDER BY score DESC, first_at ASC
        LIMIT ?`).all(...(day ? [day, limit] : [limit]));
      return rows.map(r => ({ name: r.name, score: r.score, rounds: r.rounds, mine: !!client && r.client_id === client }));
    },

    // Learning analytics: which safety lessons people get wrong most often.
    stats({ day = null } = {}) {
      const runWhere = day ? 'WHERE day = ?' : '';
      const args = day ? [day] : [];
      const totals = db.prepare(`SELECT COUNT(*) AS runs, COUNT(DISTINCT client_id) AS players,
                                 COALESCE(ROUND(AVG(score)), 0) AS avgScore, COALESCE(MAX(score), 0) AS topScore,
                                 COALESCE(SUM(rounds), 0) AS rounds
                                 FROM runs ${runWhere}`).get(...args);
      const games = gameRates({ day });
      // Engagement: how many players came back for another go.
      const per = db.prepare(`SELECT client_id, COUNT(*) AS n FROM runs ${runWhere} GROUP BY client_id`).all(...args);
      const replayers = per.filter(p => p.n > 1).length;
      const replayRate = per.length ? +(replayers / per.length).toFixed(3) : 0;
      const dailyPlayers = db.prepare(`SELECT COUNT(DISTINCT client_id) AS n FROM runs ${runWhere ? runWhere + ' AND' : 'WHERE'} mode = 'daily'`).get(...args).n;
      const journeyPlayers = db.prepare(`SELECT COUNT(DISTINCT client_id) AS n FROM runs ${runWhere ? runWhere + ' AND' : 'WHERE'} mode = 'journey'`).get(...args).n;
      const learning = learningCurve({ day });
      const qz = db.prepare(`SELECT COUNT(*) AS n, AVG(pre) AS pre, AVG(post) AS post FROM quiz
                             WHERE post IS NOT NULL ${day ? 'AND day = ?' : ''}`).get(...args);
      const quiz = { n: qz.n, preAvg: qz.n ? +(qz.pre / 3).toFixed(3) : null, postAvg: qz.n ? +(qz.post / 3).toFixed(3) : null };
      const challenges = db.prepare(`SELECT COUNT(*) AS n FROM runs ${runWhere ? runWhere + ' AND' : 'WHERE'} challenge_of IS NOT NULL`).get(...args).n;
      const battlePlayers = db.prepare(`SELECT COUNT(*) AS n FROM runs ${runWhere ? runWhere + ' AND' : 'WHERE'} mode = 'battle'`).get(...args).n;
      return { ...totals, games, replayers, replayRate, dailyPlayers, journeyPlayers, battlePlayers, learning, quiz, challenges, groups: this.groups({ day }) };
    },

    // Locals vs visitors: fail rates per safety topic for each player group.
    groups({ day = null } = {}) {
      const rows = db.prepare(`
        SELECT u.who AS who, r.game AS game, COUNT(*) AS plays, SUM(1 - r.ok) AS fails, COUNT(DISTINCT u.client_id) AS players
        FROM results r JOIN runs u ON u.id = r.run_id
        WHERE u.who IS NOT NULL AND r.game NOT LIKE 'boss-%' ${day ? 'AND u.day = ?' : ''}
        GROUP BY u.who, r.game`).all(...(day ? [day] : []));
      const players = Object.fromEntries(db.prepare(`SELECT who, COUNT(DISTINCT client_id) AS n FROM runs
        WHERE who IS NOT NULL ${day ? 'AND day = ?' : ''} GROUP BY who`).all(...(day ? [day] : [])).map(r => [r.who, r.n]));
      const blank = () => Object.fromEntries(WHO_IDS.map(w => [w, { plays: 0, fails: 0 }]));
      const overall = blank(), topics = {};
      for (const r of rows) {
        if (!WHO_IDS.includes(r.who)) continue;
        const t = LESSONS[r.game]?.source;
        if (!t) continue;
        overall[r.who].plays += r.plays; overall[r.who].fails += r.fails;
        topics[t] ||= blank();
        topics[t][r.who].plays += r.plays; topics[t][r.who].fails += r.fails;
      }
      const withRate = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, failRate: rate(v.fails, v.plays) }]));
      return {
        players: Object.fromEntries(WHO_IDS.map(w => [w, players[w] || 0])),
        overall: withRate(overall),
        topics: Object.entries(topics).map(([topic, v]) => ({ topic, ...withRate(v) }))
          .sort((a, b) => ((b.visitor.failRate ?? 0) - (b.local.failRate ?? 0)) - ((a.visitor.failRate ?? 0) - (a.local.failRate ?? 0)))
      };
    },

    // Small settings the team can change on the day without touching code (e.g. the People's Choice link).
    getSetting: (key) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null,
    setSetting: (key, value) => db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value),

    // ---- Classroom mode ----
    createClass: (code, name, keyHash) => db.prepare('INSERT INTO classes (code, name, key_hash) VALUES (?, ?, ?)').run(code, name, keyHash),
    getClass: (code) => db.prepare('SELECT code, name, key_hash, created_at FROM classes WHERE code = ?').get(code),
    classReport(code) {
      const totals = db.prepare(`SELECT COUNT(*) AS runs, COUNT(DISTINCT client_id) AS players,
                                 COALESCE(ROUND(AVG(score)), 0) AS avgScore, COALESCE(MAX(score), 0) AS topScore,
                                 COALESCE(SUM(rounds), 0) AS rounds, MAX(created_at) AS lastPlayed
                                 FROM runs WHERE class_code = ?`).get(code);
      const top = db.prepare(`SELECT name, MAX(score) AS score, COUNT(*) AS games FROM runs
                              WHERE class_code = ? AND name IS NOT NULL GROUP BY client_id, name ORDER BY score DESC LIMIT 10`).all(code);
      const qz = db.prepare(`SELECT COUNT(*) AS n, AVG(pre) AS pre, AVG(post) AS post FROM quiz WHERE class_code = ? AND post IS NOT NULL`).get(code);
      const started = db.prepare(`SELECT COUNT(*) AS n FROM quiz WHERE class_code = ?`).get(code).n;
      return {
        ...totals,
        top,
        games: gameRates({ classCode: code }),
        learning: learningCurve({ classCode: code }),
        quiz: { n: qz.n, started, preAvg: qz.n ? +(qz.pre / 3).toFixed(3) : null, postAvg: qz.n ? +(qz.post / 3).toFixed(3) : null }
      };
    },

    // Town Battle: each player's best score counts once for their town.
    towns({ day = null } = {}) {
      return db.prepare(`
        WITH best AS (
          SELECT town, client_id, MAX(score) AS score FROM runs
          WHERE town IS NOT NULL AND relaxed = 0 AND mode != 'battle' ${day ? 'AND day = ?' : ''}
          GROUP BY town, client_id
        )
        SELECT town, COUNT(*) AS players, SUM(score) AS points, MAX(score) AS best
        FROM best GROUP BY town ORDER BY points DESC`).all(...(day ? [day] : []));
    },

    // Challenge a mate
    getChallenge: (id) => db.prepare(`SELECT id, name, score, rounds, mode, day, client_id FROM runs WHERE id = ?`).get(id),
    challengeResults(clientId, limit = 10) {
      return db.prepare(`
        SELECT c.id, c.name AS challenger, c.score AS theirScore, o.score AS yourScore, o.id AS yourRun, c.created_at AS at
        FROM runs c JOIN runs o ON o.id = c.challenge_of
        WHERE o.client_id = ? AND c.client_id != ?
        ORDER BY c.id DESC LIMIT ?`).all(clientId, clientId, limit)
        .map(r => ({ ...r, beatYou: r.theirScore > r.yourScore }));
    },

    // Optional quick safety check: one row per device; "post" is filled in after their first game.
    saveQuiz({ clientId, qids, pre, post, day, classCode = null }) {
      const existing = db.prepare('SELECT * FROM quiz WHERE client_id = ?').get(clientId);
      if (!existing) {
        if (pre == null) return { error: 'Answer the first check before the second.' };
        db.prepare('INSERT INTO quiz (client_id, qids, pre, post, day, class_code) VALUES (?, ?, ?, ?, ?, ?)').run(clientId, qids.join(','), pre, post ?? null, day, classCode);
      } else if (post != null && existing.post == null) {
        db.prepare('UPDATE quiz SET post = ?, class_code = COALESCE(class_code, ?) WHERE client_id = ?').run(post, classCode, clientId);
      }
      return { ok: true };
    },

    // Recent runs for the booth's live feed, with the game that ended each run.
    feed({ day = null, limit = 12 } = {}) {
      return db.prepare(`
        SELECT u.id, u.name, u.score, u.rounds, u.mode, u.town, u.challenge_of AS challengeOf, u.created_at AS at,
               (SELECT game FROM results r WHERE r.run_id = u.id ORDER BY idx DESC LIMIT 1) AS killedBy
        FROM runs u ${day ? 'WHERE u.day = ?' : ''}
        ORDER BY u.id DESC LIMIT ?`).all(...(day ? [day, limit] : [limit]));
    },

    deleteRun: (id) => db.prepare('DELETE FROM runs WHERE id = ?').run(id),
    reset: () => db.exec('DELETE FROM results; DELETE FROM runs; DELETE FROM quiz;'),
    exportCsv() {
      const rows = db.prepare(`SELECT u.id AS run_id, u.day, u.created_at, u.name, u.score, u.rounds,
                                      r.idx, r.game, r.ok, r.ms
                               FROM runs u JOIN results r ON r.run_id = u.id ORDER BY u.id, r.idx`).all();
      const head = 'run_id,day,created_at,name,score,rounds,round_idx,game,ok,ms';
      const esc = (v) => v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
      return [head, ...rows.map(r => [r.run_id, r.day, r.created_at, r.name, r.score, r.rounds, r.idx, r.game, r.ok, r.ms].map(esc).join(','))].join('\n');
    }
  };
}
