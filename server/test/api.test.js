import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, makeRepo } from '../src/db.js';
import { createApp } from '../src/app.js';
import { GAME_IDS, REGULAR, scoreOf, cleanName, validateRun, dailySequence, darwinDay } from '../src/scoring.js';
import { LESSONS } from '../../web/js/lessons.js';
import { LOCATIONS, locationAt, journeyStop } from '../../web/js/locations.js';

let server, base;
const CLIENT = 'test-client-123456';

before(async () => {
  const app = createApp(makeRepo(openDb(':memory:')), { adminToken: 'secret', writeLimit: 1000 });
  server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, body, headers = {}) => fetch(base + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
});

function makeRun(wins, extra = {}) {
  const results = [];
  for (let i = 0; i < wins; i++) results.push({ g: REGULAR[i % REGULAR.length], ok: true, ms: 1500 });
  results.splice(1, 0, { g: 'flood-road', ok: false, ms: 4000 });
  results.splice(3, 0, { g: 'croc-edge', ok: false, ms: 4000 });
  results.push({ g: 'heat-drink', ok: false, ms: 900 });
  return { clientId: CLIENT, results, durationMs: results.length * 4000, ...extra };
}

test('game ids on the server match the lessons in the web app', () => {
  assert.deepEqual([...GAME_IDS].sort(), Object.keys(LESSONS).sort());
});

test('score is computed server-side from results', async () => {
  const run = makeRun(5, { score: 999999 });
  const res = await post('/api/runs', run);
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.score, scoreOf(run.results));
  assert.notEqual(body.score, 999999);
});

test('rejects runs that do not end on the last life', async () => {
  const run = makeRun(3);
  run.results.pop();
  run.results.push({ g: 'swim-sign', ok: true, ms: 800 });
  const res = await post('/api/runs', run);
  assert.equal(res.status, 400);
});

test('rejects impossibly fast runs', async () => {
  const res = await post('/api/runs', makeRun(10, { durationMs: 1000 }));
  assert.equal(res.status, 400);
});

test('rejects unknown games and bad JSON', async () => {
  const run = makeRun(2);
  run.results[0].g = 'hack';
  assert.equal((await post('/api/runs', run)).status, 400);
  const bad = await fetch(base + '/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{nope' });
  assert.equal(bad.status, 400);
});

test('name can be attached later, only by the same device', async () => {
  const { id } = await (await post('/api/runs', makeRun(6))).json();
  assert.equal((await post(`/api/runs/${id}/name`, { name: 'CrocDodger', clientId: 'someone-else-999' })).status, 403);
  assert.equal((await post(`/api/runs/${id}/name`, { name: 'CrocDodger', clientId: CLIENT })).status, 200);
  const lb = await (await fetch(`${base}/api/leaderboard?period=today&client=${CLIENT}`)).json();
  assert.equal(lb.entries[0].name, 'CrocDodger');
  assert.equal(lb.entries[0].mine, true);
});

test('streak bonus is added server-side', async () => {
  // The browser copy of this formula is checked by scripts/smoke_test.py.
  const { streakBonus } = await import('../src/scoring.js');
  assert.deepEqual([1, 2, 3, 4, 7, 9].map(streakBonus), [0, 0, 20, 40, 100, 100]);
  const five = [1, 2, 3, 4, 5].map(i => ({ g: 'croc-edge', ok: true, ms: 1000 }));
  // rounds 1..5 base = 100+110+120+130+140 = 600, bonus = 20+40+60 = 120
  assert.equal(scoreOf(five), 720);
});

test('booth feed shows recent runs and what ended them', async () => {
  const feed = await (await fetch(base + '/api/feed')).json();
  assert.ok(feed.entries.length >= 1);
  assert.equal(feed.entries[0].killedBy, 'heat-drink');
});

test('boss rounds must be on rounds 10, 20, 30 and are worth +200', () => {
  const ok = (g) => ({ g, ok: true, ms: 2000 });
  const bad = (g) => ({ g, ok: false, ms: 3000 });
  const nine = REGULAR.slice(0, 9).map(ok);
  const run = { clientId: CLIENT, results: [...nine, ok('boss-cyclone'), bad('croc-edge'), bad('croc-edge'), bad('croc-edge')], durationMs: 60000 };
  const v = validateRun(run);
  assert.equal(v.error, undefined);
  const withoutBoss = scoreOf([...nine, { g: 'croc-edge', ok: true, ms: 2000 }]);
  assert.equal(scoreOf([...nine, ok('boss-cyclone')]), withoutBoss + 200);
  const misplaced = { ...run, results: [ok('boss-croc'), bad('croc-edge'), bad('croc-edge'), bad('croc-edge')] };
  assert.match(validateRun(misplaced).error, /Boss/);
});

test('daily challenge: same sequence for everyone, validated by the server', async () => {
  const day = darwinDay();
  const seq = dailySequence(day);
  assert.equal(seq.length, 10);
  assert.deepEqual(seq, dailySequence(day));
  assert.ok(seq[9].startsWith('boss-'));
  assert.equal(new Set(seq).size, 10);
  // complete daily with 2 misses
  const results = seq.map((g, i) => ({ g, ok: i !== 2 && i !== 5, ms: 2000 }));
  const res = await post('/api/runs', { clientId: CLIENT, mode: 'daily', day, results, durationMs: 60000, name: 'DailyDan' });
  assert.equal(res.status, 201);
  // wrong order is rejected
  const swapped = results.slice(); [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  assert.equal((await post('/api/runs', { clientId: CLIENT, mode: 'daily', day, results: swapped, durationMs: 60000 })).status, 400);
  // old days are rejected
  assert.equal((await post('/api/runs', { clientId: CLIENT, mode: 'daily', day: '2020-01-01', results, durationMs: 60000 })).status, 400);
  // daily board is separate from the classic board
  const daily = await (await fetch(base + '/api/leaderboard?period=daily')).json();
  assert.equal(daily.entries[0].name, 'DailyDan');
  const classic = await (await fetch(base + '/api/leaderboard?period=today')).json();
  assert.ok(!classic.entries.some(e => e.name === 'DailyDan'));
});

test('journey: every stop uses real hazards, runs follow the route, shared board with classic', async () => {
  for (const loc of LOCATIONS) assert.ok(loc.games.length >= 3 && loc.games.every(g => REGULAR.includes(g)), loc.id);
  assert.equal(journeyStop(1), 0);
  assert.equal(journeyStop(5), 0);
  assert.equal(journeyStop(6), 1);
  assert.equal(locationAt(journeyStop(41)).id, 'darwin'); // round 41 = back to Darwin after Uluru
  // 7 rounds: 5 in Darwin, then 2 in Kakadu, 3 losses
  const route = [0, 0, 0, 0, 0, 1, 1];
  const oks = [true, false, true, false, true, true, false];
  const results = route.map((stop, i) => ({ g: LOCATIONS[stop].games[i % LOCATIONS[stop].games.length], ok: oks[i], ms: 2000 }));
  const res = await post('/api/runs', { clientId: CLIENT, mode: 'journey', results, durationMs: 40000, name: 'JourneyJo' });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).score, scoreOf(results));
  // a Kakadu-only hazard in Darwin is rejected
  const wrong = results.map(r => ({ ...r }));
  wrong[0].g = 'croc-trap';
  assert.ok(!LOCATIONS[0].games.includes('croc-trap'));
  assert.equal((await post('/api/runs', { clientId: CLIENT, mode: 'journey', results: wrong, durationMs: 40000 })).status, 400);
  // bosses never appear on the Journey
  const boss = results.map(r => ({ ...r })); boss[2].g = 'boss-croc';
  assert.equal((await post('/api/runs', { clientId: CLIENT, mode: 'journey', results: boss, durationMs: 40000 })).status, 400);
  const board = await (await fetch(base + '/api/leaderboard?period=today')).json();
  assert.ok(board.entries.some(e => e.name === 'JourneyJo'));
  const st = await (await fetch(base + '/api/stats')).json();
  assert.ok(st.journeyPlayers >= 1);
});

test('stats include replay rate for the booth', async () => {
  const st = await (await fetch(base + '/api/stats')).json();
  assert.ok(st.replayRate > 0 && st.replayRate <= 1);
  assert.ok(st.dailyPlayers >= 1);
});

test('challenge a mate: link details, challenger results', async () => {
  const mine = await (await post('/api/runs', makeRun(4, { name: 'Hendrick' }))).json();
  const ch = await (await fetch(`${base}/api/challenge/${mine.id}`)).json();
  assert.equal(ch.name, 'Hendrick');
  assert.equal(ch.score, mine.score);
  // a mate on another device accepts and beats it
  const mate = { ...makeRun(6), clientId: 'mate-device-0001', challengeOf: mine.id, name: 'Thomas' };
  assert.equal((await post('/api/runs', mate)).status, 201);
  const r = await (await fetch(`${base}/api/challenges/results?client=${CLIENT}`)).json();
  assert.equal(r.entries[0].challenger, 'Thomas');
  assert.equal(r.entries[0].beatYou, true);
  assert.equal((await fetch(`${base}/api/challenge/999999`)).status, 404);
});

test('town battle counts each player once with their best score', async () => {
  for (const [client, wins] of [['town-a-000001', 2], ['town-a-000001', 5], ['town-b-000002', 3]]) {
    assert.equal((await post('/api/runs', { ...makeRun(wins), clientId: client, town: 'palmerston' })).status, 201);
  }
  assert.equal((await post('/api/runs', { ...makeRun(1), clientId: 'town-c-000003', town: 'atlantis' })).status, 400);
  const t = await (await fetch(base + '/api/towns')).json();
  const p = t.entries.find(e => e.town === 'palmerston');
  assert.equal(p.players, 2);
  assert.equal(p.points, scoreOf(makeRun(5).results) + scoreOf(makeRun(3).results));
});

test('quick safety check: before then after, learning shown in stats', async () => {
  const qids = ['q-croc-fish', 'q-stinger', 'q-flood'];
  assert.equal((await post('/api/quiz', { clientId: 'quiz-device-01', qids, post: 3 })).status, 400); // no "after" without "before"
  assert.equal((await post('/api/quiz', { clientId: 'quiz-device-01', qids, pre: 1 })).status, 200);
  assert.equal((await post('/api/quiz', { clientId: 'quiz-device-01', qids, post: 3 })).status, 200);
  assert.equal((await post('/api/quiz', { clientId: 'quiz-device-02', qids: ['nope', 'q-stinger', 'q-flood'], pre: 1 })).status, 400);
  const st = await (await fetch(base + '/api/stats')).json();
  assert.equal(st.quiz.n, 1);
  assert.equal(st.quiz.preAvg, 0.333);
  assert.equal(st.quiz.postAvg, 1);
  assert.ok(st.learning.nFirst > 0);
  assert.ok(st.challenges >= 1);
});

test('blocks rude names', () => {
  assert.ok(cleanName('sh1t head').error);
  assert.ok(cleanName('a').error);
  assert.ok(cleanName('<script>').error);
  assert.equal(cleanName('  Barra   King ').name, 'Barra King');
});

test('stats rank games by fail rate', async () => {
  const st = await (await fetch(base + '/api/stats')).json();
  assert.ok(st.runs >= 2);
  assert.ok(st.games.length > 0);
  for (let i = 1; i < st.games.length; i++) assert.ok(st.games[i - 1].failRate >= st.games[i].failRate);
});

test('qr code and static game are served', async () => {
  const qr = await fetch(base + '/api/qr.svg?url=https://example.com');
  assert.equal(qr.status, 200);
  assert.match(await qr.text(), /<svg/);
  const page = await fetch(base + '/');
  assert.match(await page.text(), /Top End Survivor/);
  assert.equal((await fetch(base + '/booth')).status, 200);
});

test('admin endpoints need the token', async () => {
  assert.equal((await post('/api/admin/reset', {})).status, 401);
  const csv = await fetch(base + '/api/admin/export.csv', { headers: { 'X-Admin-Token': 'secret' } });
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /^run_id,day/);
  assert.equal((await post('/api/admin/reset', {}, { 'X-Admin-Token': 'secret' })).status, 200);
  const st = await (await fetch(base + '/api/stats?period=all')).json();
  assert.equal(st.runs, 0);
});
