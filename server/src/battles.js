// Live Booth Battle: a Kahoot-style race. The booth screen opens a battle and shows a join code,
// everyone who joins plays the same 5 hazards at the same moment, and the booth shows a live race
// and a podium. Battles are short-lived, so they live in memory; finished runs are saved to the
// database like any other game, so they still count in the learning stats.
import crypto from 'node:crypto';
import { REGULAR, scoreOf, validateBattleResults } from './scoring.js';

export const BATTLE_ROUNDS = 5;
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I, L or O
const COUNTDOWN_MS = 4000;      // "3, 2, 1, GO" on every phone
const MAX_LIVE_MS = 90_000;     // a battle ends after 90 s even if someone wandered off
const KEEP_MS = 30 * 60_000;    // forget battles after 30 minutes
const MAX_BATTLES = 300;
export const MAX_PLAYERS = 40;

const pick = (arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };

export function createBattles({ now = () => Date.now(), onFinish = () => {} } = {}) {
  const battles = new Map();

  const sweep = () => {
    const t = now();
    for (const [code, b] of battles) if (t - b.createdAt > KEEP_MS) battles.delete(code);
  };
  const timer = setInterval(sweep, 60_000);
  timer.unref?.();

  function newCode() {
    for (let i = 0; i < 50; i++) {
      const code = Array.from({ length: 4 }, () => LETTERS[crypto.randomInt(LETTERS.length)]).join('');
      if (!battles.has(code)) return code;
    }
    throw new Error('No free battle codes.');
  }

  // Moves a battle on: live -> done when everyone has finished or time is up.
  function tick(b) {
    if (b.status === 'live') {
      const players = [...b.players.values()];
      const allDone = players.length > 0 && players.every(p => p.done);
      if (allDone || now() > b.endsAt) { b.status = 'done'; b.doneAt = now(); }
    }
    return b;
  }

  function ranked(b) {
    return [...b.players.values()]
      .sort((x, y) => y.score - x.score || (x.finishedAt ?? Infinity) - (y.finishedAt ?? Infinity) || x.joinedAt - y.joinedAt);
  }

  function snapshot(b) {
    tick(b);
    const list = ranked(b);
    return {
      code: b.code, status: b.status, games: b.games, rounds: BATTLE_ROUNDS,
      startsAt: b.startsAt, endsAt: b.endsAt, now: now(),
      players: list.map((p, i) => ({
        id: p.id, name: p.name, character: p.character, score: p.score,
        round: p.results.length, wins: p.results.filter(r => r.ok).length, marks: p.results.map(r => r.ok), done: p.done, rank: i + 1
      }))
    };
  }

  return {
    create() {
      sweep();
      if (battles.size >= MAX_BATTLES) return { error: 'Too many battles right now. Try again in a minute.' };
      const b = {
        code: newCode(), hostKey: crypto.randomBytes(12).toString('hex'), status: 'lobby',
        games: pick(REGULAR, BATTLE_ROUNDS), createdAt: now(), startsAt: null, endsAt: null, players: new Map()
      };
      battles.set(b.code, b);
      return { battle: b, hostKey: b.hostKey };
    },

    get(code) { const b = battles.get(code); return b ? snapshot(b) : null; },

    join(code, { clientId, name, character, who }) {
      const b = battles.get(code);
      if (!b) return { error: 'No battle with that code.', status: 404 };
      tick(b);
      // Re-joining from the same phone keeps your place.
      const again = [...b.players.values()].find(p => p.clientId === clientId);
      if (again) { again.name = name; again.character = character; return { playerId: again.id, battle: snapshot(b) }; }
      if (b.status !== 'lobby') return { error: 'That battle has already started. Wait for the next one!', status: 409 };
      if (b.players.size >= MAX_PLAYERS) return { error: 'That battle is full.', status: 409 };
      const p = {
        id: crypto.randomBytes(8).toString('hex'), clientId, name, character, who: who || null,
        results: [], score: 0, done: false, joinedAt: now(), finishedAt: null
      };
      b.players.set(p.id, p);
      return { playerId: p.id, battle: snapshot(b) };
    },

    start(code, hostKey) {
      const b = battles.get(code);
      if (!b) return { error: 'No battle with that code.', status: 404 };
      if (b.hostKey !== hostKey) return { error: 'Only the booth can start this battle.', status: 403 };
      if (b.status !== 'lobby') return { battle: snapshot(b) };
      if (!b.players.size) return { error: 'Nobody has joined yet.', status: 409 };
      b.status = 'live';
      b.startsAt = now() + COUNTDOWN_MS;
      b.endsAt = b.startsAt + MAX_LIVE_MS;
      return { battle: snapshot(b) };
    },

    progress(code, { playerId, clientId, results }) {
      const b = battles.get(code);
      if (!b) return { error: 'No battle with that code.', status: 404 };
      tick(b);
      const p = b.players.get(playerId);
      if (!p || p.clientId !== clientId) return { error: 'Not in this battle.', status: 403 };
      if (b.status === 'lobby' || now() < b.startsAt) return { error: 'The battle has not started.', status: 409 };
      if (b.status === 'done' || p.done) return { battle: snapshot(b) };
      const v = validateBattleResults(results, b.games);
      if (v.error) return { error: v.error, status: 400 };
      // Results only ever grow: earlier rounds can't be changed.
      if (v.results.length < p.results.length || p.results.some((r, i) => r.ok !== v.results[i].ok)) return { error: 'Results can only be added.', status: 400 };
      p.results = v.results;
      p.score = scoreOf(p.results);
      if (p.results.length === BATTLE_ROUNDS) {
        p.done = true;
        p.finishedAt = now();
        try {
          onFinish({
            clientId: p.clientId, mode: 'battle', results: p.results, score: p.score, rounds: BATTLE_ROUNDS,
            wins: p.results.filter(r => r.ok).length, durationMs: Math.max(1, p.finishedAt - b.startsAt), who: p.who
          }, p.name);
        } catch (e) { console.error('battle save failed', e); }
      }
      return { battle: snapshot(b) };
    },

    size: () => battles.size,
    stop: () => clearInterval(timer)
  };
}
