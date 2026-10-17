import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, makeRepo } from '../src/db.js';
import { createApp } from '../src/app.js';
import { GAME_IDS, scoreOf, cleanName } from '../src/scoring.js';
import { LESSONS } from '../../web/js/lessons.js';

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
  for (let i = 0; i < wins; i++) results.push({ g: GAME_IDS[i % GAME_IDS.length], ok: true, ms: 1500 });
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
  const { id } = await (await post('/api/runs', makeRun(8))).json();
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
