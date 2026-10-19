#!/usr/bin/env node
// Load test: simulates many players finishing games at the same time.
//
// Each virtual player does what a real one does at game over:
//   health check -> submit run -> add name -> view leaderboard -> view town battle -> view stats
//
// Usage:
//   node scripts/load_test.mjs --url http://localhost:8080 --players 500 --concurrency 50
//   node scripts/load_test.mjs --url https://your-game.onrender.com --players 200 --concurrency 20 --save
//
// --save writes web/load-test.json, which the Judge's tour shows.
// Fake players use client ids starting with "loadtest-". Remove them afterwards with:
//   curl -X DELETE -H "X-Admin-Token: $ADMIN_TOKEN" <url>/api/admin/loadtest
// Do NOT run this against the live server on competition day.

import { writeFileSync } from 'node:fs';
import { REGULAR } from '../web/js/daily.js';
import { TOWN_IDS } from '../web/js/towns.js';
import { locationAt, journeyStop } from '../web/js/locations.js';

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : def;
};
const URL_BASE = String(arg('url', 'http://localhost:8080')).replace(/\/$/, '');
const PLAYERS = Number(arg('players', 500));
const CONCURRENCY = Number(arg('concurrency', 50));
const SAVE = !!arg('save', false);

const lat = {};       // request type -> [ms]
let errors = 0;
const errorSamples = [];

async function call(type, path, opts = {}, ip) {
  const t0 = performance.now();
  try {
    const res = await fetch(URL_BASE + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip, ...(opts.headers || {}) }
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${type} HTTP ${res.status} ${body.error || ''}`);
    return body;
  } catch (e) {
    errors++;
    if (errorSamples.length < 5) errorSamples.push(e.message);
    return null;
  } finally {
    (lat[type] ||= []).push(performance.now() - t0);
  }
}

function fakeRun() {
  // A believable classic run: 0 to 6 wins with exactly 3 losses, ending on a loss (under 10 rounds).
  const wins = Math.floor(Math.random() * 7);
  const rounds = [];
  for (let i = 0; i < wins; i++) rounds.push({ g: REGULAR[Math.floor(Math.random() * REGULAR.length)], ok: true, ms: 900 + Math.random() * 3000 });
  for (let k = 0; k < 2; k++) rounds.splice(Math.floor(Math.random() * (rounds.length + 1)), 0, { g: REGULAR[k], ok: false, ms: 4000 });
  rounds.push({ g: REGULAR[5], ok: false, ms: 4000 });
  return rounds;
}

// Half the players take the Journey: same wins and losses, but each round is a hazard from that stop.
function toJourney(rounds) {
  return rounds.map((r, i) => { const games = locationAt(journeyStop(i + 1)).games; return { ...r, g: games[i % games.length] }; });
}

async function player(n) {
  const clientId = `loadtest-${Date.now().toString(36)}-${n}`;
  const ip = `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`; // each player looks like a different phone
  const journey = n % 2 === 1;
  const results = journey ? toJourney(fakeRun()) : fakeRun();
  await call('health', '/api/health', {}, ip);
  const run = await call('submit run', '/api/runs', {
    method: 'POST',
    body: JSON.stringify({ clientId, mode: journey ? 'journey' : 'classic', results, durationMs: results.length * 4000, town: TOWN_IDS[n % TOWN_IDS.length] })
  }, ip);
  if (run) {
    await call('add name', `/api/runs/${run.id}/name`, { method: 'POST', body: JSON.stringify({ clientId, name: `Load${n}` }) }, ip);
  }
  await call('leaderboard', '/api/leaderboard?period=today', {}, ip);
  await call('town battle', '/api/towns?period=today', {}, ip);
  await call('stats', '/api/stats?period=today', {}, ip);
}

const q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };

const t0 = performance.now();
let next = 0;
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, PLAYERS) }, async () => {
  while (next < PLAYERS) await player(next++);
}));
const seconds = (performance.now() - t0) / 1000;

const all = Object.values(lat).flat();
const rows = Object.entries(lat).map(([type, a]) => ({
  request: type, count: a.length, p50: Math.round(q(a, .5)), p95: Math.round(q(a, .95)), p99: Math.round(q(a, .99)), max: Math.round(Math.max(...a))
}));
const summary = {
  when: new Date().toISOString(),
  where: URL_BASE.includes('localhost') ? 'local server' : URL_BASE.replace(/^https?:\/\//, ''),
  players: PLAYERS,
  concurrency: CONCURRENCY,
  requests: all.length,
  seconds: +seconds.toFixed(1),
  requestsPerSecond: Math.round(all.length / seconds),
  p50ms: Math.round(q(all, .5)),
  p95ms: Math.round(q(all, .95)),
  p99ms: Math.round(q(all, .99)),
  errors,
  byRequest: rows
};

console.log(`\nTop End Survivor load test: ${PLAYERS} players, ${CONCURRENCY} at a time, against ${URL_BASE}`);
console.table(rows);
console.log(`Total: ${all.length} requests in ${summary.seconds}s = ${summary.requestsPerSecond} req/s | p50 ${summary.p50ms} ms | p95 ${summary.p95ms} ms | p99 ${summary.p99ms} ms | errors ${errors}`);
if (errorSamples.length) console.log('Sample errors:', errorSamples);
if (SAVE) {
  writeFileSync(new URL('../web/load-test.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
  console.log('Saved web/load-test.json (shown in the Judge\'s tour).');
}
process.exit(errors ? 1 : 0);
