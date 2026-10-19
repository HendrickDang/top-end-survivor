// Server-side scoring and run validation.
// The server never trusts the client's score: it recomputes it from the per-round results.

import { REGULAR, BOSSES, DAILY_ROUNDS, dailySequence, darwinDay, prevDay, isBoss, isBossRound } from '../../web/js/daily.js';
import { TOWN_IDS } from '../../web/js/towns.js';
import { QUESTION_IDS, QUIZ_LEN } from '../../web/js/quiz.js';
import { locationAt, journeyStop } from '../../web/js/locations.js';

// Game ids and the Daily Challenge order come from the web app, so the two can never drift apart.
export const GAME_IDS = [...REGULAR, ...BOSSES];
export { REGULAR, BOSSES, dailySequence, darwinDay };
export const MAX_LIVES = 3;
export const BOSS_BONUS = 200; // must match web/js/main.js

// Must match web/js/main.js pointsFor()
export const pointsFor = (round) => 100 + 10 * (round - 1);

// Must match web/js/main.js streakBonus()
export const streakBonus = (streak) => (streak >= 3 ? Math.min(streak - 2, 5) * 20 : 0);

export function scoreOf(results) {
  let sum = 0, streak = 0;
  results.forEach((r, i) => {
    if (r.ok) { streak++; sum += pointsFor(i + 1) + streakBonus(streak) + (isBoss(r.g) ? BOSS_BONUS : 0); }
    else streak = 0;
  });
  return sum;
}

const NAME_RE = /^[A-Za-z0-9 _-]{2,16}$/;
// Small blocklist for a public booth screen. Matching ignores spaces, digits-as-letters and case.
const BLOCK = ['fuck', 'shit', 'cunt', 'bitch', 'dick', 'cock', 'pussy', 'slut', 'whore', 'nigg', 'fag', 'rape', 'nazi', 'hitler', 'wank', 'twat', 'bastard', 'retard', 'penis', 'vagina', 'boob', 'porn', 'sex'];

export function cleanName(raw) {
  if (typeof raw !== 'string') return { error: 'Name is required.' };
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!NAME_RE.test(name)) return { error: 'Use 2 to 16 letters, numbers, spaces, - or _.' };
  const flat = name.toLowerCase()
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/[^a-z]/g, '');
  if (BLOCK.some(w => flat.includes(w))) return { error: 'Please pick a friendlier name.' };
  return { name };
}

export function validateRun(body, { today = darwinDay() } = {}) {
  if (!body || typeof body !== 'object') return { error: 'Invalid body.' };
  const { results, durationMs, clientId } = body;
  const mode = ['daily', 'journey'].includes(body.mode) ? body.mode : 'classic';
  if (typeof clientId !== 'string' || clientId.length < 8 || clientId.length > 64) return { error: 'Invalid client id.' };
  if (!Array.isArray(results) || results.length < 1 || results.length > 300) return { error: 'Invalid results.' };
  for (const r of results) {
    if (!r || !GAME_IDS.includes(r.g) || typeof r.ok !== 'boolean') return { error: 'Invalid result entry.' };
    if (!Number.isFinite(r.ms) || r.ms < 0 || r.ms > 20000) return { error: 'Invalid round time.' };
    if (r.ok && r.ms < 120) return { error: 'Round too fast.' };
  }
  const losses = results.filter(r => !r.ok).length;
  let day = today;

  if (mode === 'daily') {
    // Daily: the fixed sequence for that day, 10 rounds or until the 3rd life is lost.
    day = typeof body.day === 'string' ? body.day : '';
    if (day !== today && day !== prevDay(today)) return { error: 'That Daily Challenge has expired.' };
    const seq = dailySequence(day);
    if (results.length > DAILY_ROUNDS || results.some((r, i) => r.g !== seq[i])) return { error: 'Results do not match the Daily Challenge.' };
    if (losses > MAX_LIVES) return { error: 'Too many lives lost.' };
    if (losses === MAX_LIVES ? results[results.length - 1].ok : results.length !== DAILY_ROUNDS) return { error: 'Daily run is incomplete.' };
  } else if (mode === 'journey') {
    // Journey: Darwin to Uluru (and round again), 5 rounds per stop, only that stop's hazards; ends on the last life.
    if (results.some((r, i) => !locationAt(journeyStop(i + 1)).games.includes(r.g))) return { error: 'Results do not match the Journey.' };
    if (losses !== MAX_LIVES || results[results.length - 1].ok) return { error: 'A run must end on the last life.' };
  } else {
    // Classic: boss rounds only on rounds 10, 20, 30...; ends on the last life.
    if (results.some((r, i) => isBoss(r.g) !== isBossRound(i + 1))) return { error: 'Boss rounds are in the wrong place.' };
    if (losses !== MAX_LIVES || results[results.length - 1].ok) return { error: 'A run must end on the last life.' };
  }
  if (!Number.isFinite(durationMs) || durationMs < results.length * 1500 || durationMs > 4 * 3600 * 1000) return { error: 'Invalid duration.' };
  if (body.town != null && !TOWN_IDS.includes(body.town)) return { error: 'Unknown town.' };
  if (body.challengeOf != null && !(Number.isInteger(body.challengeOf) && body.challengeOf > 0)) return { error: 'Invalid challenge.' };
  return {
    run: {
      clientId,
      mode,
      day,
      results: results.map(r => ({ g: r.g, ok: r.ok, ms: Math.round(r.ms) })),
      durationMs: Math.round(durationMs),
      score: scoreOf(results),
      rounds: results.length,
      wins: results.length - losses,
      appVersion: typeof body.appVersion === 'string' ? body.appVersion.slice(0, 20) : null,
      town: body.town || null,
      challengeOf: body.challengeOf || null
    }
  };
}

export function validateQuiz(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid body.' };
  const { clientId, qids, pre, post } = body;
  if (typeof clientId !== 'string' || clientId.length < 8 || clientId.length > 64) return { error: 'Invalid client id.' };
  if (!Array.isArray(qids) || qids.length !== QUIZ_LEN || new Set(qids).size !== QUIZ_LEN || !qids.every(q => QUESTION_IDS.includes(q))) return { error: 'Invalid questions.' };
  const okScore = (v) => v == null || (Number.isInteger(v) && v >= 0 && v <= QUIZ_LEN);
  if (!okScore(pre) || !okScore(post) || (pre == null && post == null)) return { error: 'Invalid score.' };
  return { quiz: { clientId, qids, pre: pre ?? null, post: post ?? null } };
}
