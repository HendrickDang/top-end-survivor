// SQLite storage using Node's built-in driver (no native build step needed).
import { DatabaseSync } from 'node:sqlite';
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
  return db;
}

export function makeRepo(db) {
  const insRun = db.prepare(`INSERT INTO runs (client_id, name, score, rounds, wins, duration_ms, app_version, day, mode)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insRes = db.prepare('INSERT INTO results (run_id, idx, game, ok, ms) VALUES (?, ?, ?, ?, ?)');

  return {
    addRun(run, name, day) {
      db.exec('BEGIN');
      try {
        const { lastInsertRowid } = insRun.run(run.clientId, name || null, run.score, run.rounds, run.wins, run.durationMs, run.appVersion, run.day || day, run.mode || 'classic');
        const id = Number(lastInsertRowid);
        run.results.forEach((r, i) => insRes.run(id, i, r.g, r.ok ? 1 : 0, r.ms));
        db.exec('COMMIT');
        return id;
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    },

    getRun: (id) => db.prepare('SELECT * FROM runs WHERE id = ?').get(id),
    setName: (id, name) => db.prepare('UPDATE runs SET name = ? WHERE id = ?').run(name, id),

    // Best named run per player (client + name), highest first.
    leaderboard({ day = null, limit = 20, client = null, mode = 'classic' } = {}) {
      const where = (day ? 'WHERE name IS NOT NULL AND day = ?' : 'WHERE name IS NOT NULL') + ` AND mode = '${mode === 'daily' ? 'daily' : 'classic'}'`;
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
      const games = db.prepare(`
        SELECT r.game AS id, COUNT(*) AS plays, SUM(1 - r.ok) AS fails,
               ROUND(AVG(CASE WHEN r.ok = 1 THEN r.ms END)) AS avgWinMs
        FROM results r JOIN runs u ON u.id = r.run_id ${day ? 'WHERE u.day = ?' : ''}
        GROUP BY r.game`).all(...args)
        .map(g => ({ ...g, failRate: g.plays ? +(g.fails / g.plays).toFixed(3) : 0 }))
        .sort((a, b) => b.failRate - a.failRate || b.plays - a.plays);
      // Engagement: how many players came back for another go.
      const per = db.prepare(`SELECT client_id, COUNT(*) AS n FROM runs ${runWhere} GROUP BY client_id`).all(...args);
      const replayers = per.filter(p => p.n > 1).length;
      const replayRate = per.length ? +(replayers / per.length).toFixed(3) : 0;
      const dailyPlayers = db.prepare(`SELECT COUNT(DISTINCT client_id) AS n FROM runs ${runWhere ? runWhere + ' AND' : 'WHERE'} mode = 'daily'`).get(...args).n;
      return { ...totals, games, replayers, replayRate, dailyPlayers };
    },

    // Recent runs for the booth's live feed, with the game that ended each run.
    feed({ day = null, limit = 12 } = {}) {
      return db.prepare(`
        SELECT u.id, u.name, u.score, u.rounds, u.mode, u.created_at AS at,
               (SELECT game FROM results r WHERE r.run_id = u.id ORDER BY idx DESC LIMIT 1) AS killedBy
        FROM runs u ${day ? 'WHERE u.day = ?' : ''}
        ORDER BY u.id DESC LIMIT ?`).all(...(day ? [day, limit] : [limit]));
    },

    deleteRun: (id) => db.prepare('DELETE FROM runs WHERE id = ?').run(id),
    reset: () => db.exec('DELETE FROM results; DELETE FROM runs;'),
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
