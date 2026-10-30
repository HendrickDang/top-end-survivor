import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, makeRepo } from '../src/db.js';
import { createApp } from '../src/app.js';
import { GAME_IDS, REGULAR, scoreOf, cleanName, validateRun, dailySequence, darwinDay } from '../src/scoring.js';
import { LESSONS } from '../../web/js/lessons.js';
import { LOCATIONS, locationAt, journeyStop } from '../../web/js/locations.js';
import { createBattles, BATTLE_ROUNDS } from '../src/battles.js';

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

test('relaxed mode runs count for learning but stay off the boards', async () => {
  const res = await post('/api/runs', { ...makeRun(6), clientId: 'relaxed-device-01', relaxed: true, name: 'SlowAndSteady' });
  assert.equal(res.status, 201);
  const board = await (await fetch(base + '/api/leaderboard?period=today&limit=50')).json();
  assert.ok(!board.entries.some(e => e.name === 'SlowAndSteady'));
  const st = await (await fetch(base + '/api/stats')).json();
  assert.ok(st.runs >= 1);
});

test('learning: same-speed first vs later tries, and survived after a fail', async () => {
  const before = (await (await fetch(base + '/api/stats')).json()).learning;
  const run = (results) => post('/api/runs', { clientId: 'learn-device-01', results, durationMs: results.length * 4000 });
  // Run 1: fails croc-trap on round 1 (sees the rule), loses the run.
  assert.equal((await run([
    { g: 'croc-trap', ok: false, ms: 4000 }, { g: 'flood-road', ok: false, ms: 4000 }, { g: 'heat-drink', ok: false, ms: 4000 }
  ])).status, 201);
  // Run 2: survives croc-trap on round 1 this time.
  assert.equal((await run([
    { g: 'croc-trap', ok: true, ms: 2000 }, { g: 'flood-road', ok: false, ms: 4000 },
    { g: 'heat-drink', ok: false, ms: 4000 }, { g: 'snake-bite', ok: false, ms: 4000 }
  ])).status, 201);
  const l = (await (await fetch(base + '/api/stats')).json()).learning;
  assert.equal(l.sameSpeedRounds, 5);
  assert.ok(l.nAfterFail >= before.nAfterFail + 3); // croc-trap, flood-road, heat-drink all met again after a fail
  assert.ok(l.afterFail > 0 && l.afterFail <= 1);
  assert.ok(l.nLater > before.nLater);
});

test('Roo Run (endless): its own board, no per-round results, speed-checked', async () => {
  const before = (await (await fetch(base + '/api/stats')).json());
  const ok = await post('/api/runs', { clientId: 'roorun-device-01', mode: 'endless', dodged: 23, durationMs: 30000, name: 'RooDodger' });
  assert.equal(ok.status, 201);
  assert.equal((await ok.json()).score, 23);
  // too fast to be real: 100 animals in 10 seconds
  assert.equal((await post('/api/runs', { clientId: 'roorun-device-01', mode: 'endless', dodged: 100, durationMs: 10000 })).status, 400);
  assert.equal((await post('/api/runs', { clientId: 'roorun-device-01', mode: 'endless', dodged: -1, durationMs: 10000 })).status, 400);
  const board = await (await fetch(base + '/api/leaderboard?period=endless')).json();
  assert.ok(board.entries.some(e => e.name === 'RooDodger' && e.score === 23));
  const today = await (await fetch(base + '/api/leaderboard?period=today&limit=50')).json();
  assert.ok(!today.entries.some(e => e.name === 'RooDodger'));
  const after = (await (await fetch(base + '/api/stats')).json());
  assert.equal(after.learning.nFirst + after.learning.nLater, before.learning.nFirst + before.learning.nLater);
});

test('hard mode runs get their own leaderboard', async () => {
  assert.equal((await post('/api/runs', { ...makeRun(6), clientId: 'hard-device-0001', hard: true, name: 'HardAsNails' })).status, 201);
  const today = await (await fetch(base + '/api/leaderboard?period=today&limit=50')).json();
  assert.ok(!today.entries.some(e => e.name === 'HardAsNails'));
  const hard = await (await fetch(base + '/api/leaderboard?period=hard&limit=50')).json();
  assert.equal(hard.period, 'hard');
  assert.ok(hard.entries.some(e => e.name === 'HardAsNails'));
  // not with Relaxed mode, and not in the Daily Challenge
  assert.equal((await post('/api/runs', { ...makeRun(3), clientId: 'hard-device-0002', hard: true, relaxed: true })).status, 400);
});

test('locals vs visitors: group on the run or added later, split by topic in stats', async () => {
  // visitors miss croc rounds, locals don't
  const crocRun = (client, okCroc, extra = {}) => {
    const results = [
      { g: 'croc-edge', ok: okCroc, ms: 2000 }, { g: 'swim-sign', ok: okCroc, ms: 2000 },
      { g: 'heat-drink', ok: true, ms: 5000 }, { g: 'flood-road', ok: false, ms: 3000 }
    ];
    while (results.filter(r => !r.ok).length < 3) results.push({ g: 'snake-bite', ok: false, ms: 3000 });
    return { clientId: client, results, durationMs: results.length * 4000, ...extra };
  };
  assert.equal((await post('/api/runs', crocRun('who-local-0001', true, { who: 'local' }))).status, 201);
  assert.equal((await post('/api/runs', crocRun('who-visit-0001', false, { who: 'visitor' }))).status, 201);
  assert.equal((await post('/api/runs', crocRun('who-bad-00001', true, { who: 'alien' }))).status, 400);
  // the group can be added after the game, by the same device only
  const later = await (await post('/api/runs', crocRun('who-new-00001', false))).json();
  assert.equal((await post(`/api/runs/${later.id}/who`, { clientId: 'someone-else-01', who: 'new' })).status, 403);
  assert.equal((await post(`/api/runs/${later.id}/who`, { clientId: 'who-new-00001', who: 'new' })).status, 200);
  const st = await (await fetch(base + '/api/stats')).json();
  const g = st.groups;
  assert.equal(g.players.local, 1);
  assert.equal(g.players.visitor, 1);
  assert.equal(g.players.new, 1);
  const croc = g.topics.find(t => t.topic === 'crocwise');
  assert.equal(croc.local.failRate, 0);
  assert.equal(croc.visitor.failRate, 1);
  assert.equal(g.topics[0].topic, 'crocwise'); // biggest visitor-vs-local gap first
});

test('classroom mode: teacher code, students join, private report', async () => {
  assert.equal((await post('/api/classes', { name: 'x' })).status, 400);
  const c = await (await post('/api/classes', { name: 'Year 7 Casuarina' })).json();
  assert.match(c.code, /^[A-HJKMNP-Z2-9]{5}$/);
  assert.ok(c.key.length >= 32);
  const info = await (await fetch(`${base}/api/classes/${c.code.toLowerCase()}`)).json();
  assert.equal(info.name, 'Year 7 Casuarina');
  assert.equal(info.key, undefined);
  assert.equal((await fetch(`${base}/api/classes/ZZZZZ`)).status, 404);
  // two students play, one takes the quick check
  assert.equal((await post('/api/runs', { ...makeRun(4), clientId: 'student-0000001', classCode: c.code, name: 'Kai' })).status, 201);
  assert.equal((await post('/api/runs', { ...makeRun(2), clientId: 'student-0000002', classCode: c.code })).status, 201);
  assert.equal((await post('/api/runs', { ...makeRun(2), clientId: 'student-0000003', classCode: 'bad!' })).status, 400);
  const qids = ['q-croc-fish', 'q-stinger', 'q-flood'];
  await post('/api/quiz', { clientId: 'student-0000001', qids, pre: 1, classCode: c.code });
  await post('/api/quiz', { clientId: 'student-0000001', qids, post: 3, classCode: c.code });
  // the report needs the teacher key
  assert.equal((await fetch(`${base}/api/classes/${c.code}/report`)).status, 403);
  assert.equal((await fetch(`${base}/api/classes/${c.code}/report?key=nope`)).status, 403);
  const r = await (await fetch(`${base}/api/classes/${c.code}/report`, { headers: { 'X-Class-Key': c.key } })).json();
  assert.equal(r.players, 2);
  assert.equal(r.runs, 2);
  assert.equal(r.top[0].name, 'Kai');
  assert.ok(r.games.length > 0);
  assert.equal(r.quiz.n, 1);
  assert.equal(r.quiz.postAvg, 1);
});

test('booth battle: join, start, race, podium, saved for stats', async () => {
  let clock = 1_000_000;
  const repo = makeRepo(openDb(':memory:'));
  const battles = createBattles({ now: () => clock, onFinish: (run, name) => repo.addRun(run, name, '2026-11-05') });
  const app = createApp(repo, { battles, writeLimit: 1000 });
  const srv = app.listen(0);
  await new Promise(r => srv.once('listening', r));
  const b2 = `http://127.0.0.1:${srv.address().port}`;
  const p2 = (path, body) => fetch(b2 + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const created = await (await p2('/api/battles', {})).json();
    const { code } = created.battle;
    assert.match(code, /^[A-HJKMNP-Z]{4}$/);
    assert.equal(created.battle.games.length, BATTLE_ROUNDS);
    assert.ok(created.battle.games.every(g => REGULAR.includes(g)));
    assert.equal(new Set(created.battle.games).size, BATTLE_ROUNDS);
    // nobody can start an empty battle, and only the booth can start it
    assert.equal((await p2(`/api/battles/${code}/start`, { hostKey: created.hostKey })).status, 409);
    const a = await (await p2(`/api/battles/${code}/join`, { clientId: 'battle-phone-01', name: 'Ava', character: 'craig', who: 'visitor' })).json();
    const b = await (await p2(`/api/battles/${code}/join`, { clientId: 'battle-phone-02', name: 'Ben', character: 'nobody' })).json();
    assert.equal((await p2(`/api/battles/${code}/join`, { clientId: 'battle-phone-03', name: 'sh1t' })).status, 400);
    assert.equal(b.battle.players.find(p => p.name === 'Ben').character, 'barry');
    assert.equal((await p2(`/api/battles/${code}/start`, { hostKey: 'wrong' })).status, 403);
    const games = created.battle.games;
    const res = (oks) => oks.map((ok, i) => ({ g: games[i], ok, ms: 1500 }));
    assert.equal((await p2(`/api/battles/${code}/progress`, { playerId: a.playerId, clientId: 'battle-phone-01', results: res([true]) })).status, 409);
    const started = await (await p2(`/api/battles/${code}/start`, { hostKey: created.hostKey })).json();
    assert.equal(started.battle.status, 'live');
    // late joiners wait for the next battle
    assert.equal((await p2(`/api/battles/${code}/join`, { clientId: 'battle-phone-09', name: 'Late' })).status, 409);
    clock = started.battle.startsAt + 100;
    // wrong order or someone else's player id is rejected
    const wrong = res([true]); wrong[0].g = games[1];
    assert.equal((await p2(`/api/battles/${code}/progress`, { playerId: a.playerId, clientId: 'battle-phone-01', results: wrong })).status, 400);
    assert.equal((await p2(`/api/battles/${code}/progress`, { playerId: a.playerId, clientId: 'battle-phone-02', results: res([true]) })).status, 403);
    // Ava wins every round, Ben misses one
    await p2(`/api/battles/${code}/progress`, { playerId: a.playerId, clientId: 'battle-phone-01', results: res([true, true]) });
    let live = (await (await fetch(`${b2}/api/battles/${code}`)).json()).battle;
    assert.equal(live.players[0].name, 'Ava');
    assert.equal(live.players[0].round, 2);
    // results can't be rewritten
    assert.equal((await p2(`/api/battles/${code}/progress`, { playerId: a.playerId, clientId: 'battle-phone-01', results: res([false, true, true]) })).status, 400);
    await p2(`/api/battles/${code}/progress`, { playerId: a.playerId, clientId: 'battle-phone-01', results: res([true, true, true, true, true]) });
    const last = await (await p2(`/api/battles/${code}/progress`, { playerId: b.playerId, clientId: 'battle-phone-02', results: res([true, false, true, true, true]) })).json();
    assert.equal(last.battle.status, 'done');
    assert.deepEqual(last.battle.players.map(p => p.name), ['Ava', 'Ben']);
    assert.equal(last.battle.players[0].score, scoreOf(res([true, true, true, true, true])));
    // both runs were saved: they count in the learning stats but not on the leaderboard
    const st = repo.stats({});
    assert.equal(st.battlePlayers, 2);
    assert.equal(st.groups.players.visitor, 1);
    assert.equal(repo.leaderboard({}).length, 0);
    assert.equal((await fetch(`${b2}/api/battles/QQQQ`)).status, 404);
  } finally { srv.close(); battles.stop(); }
});

test('booth battle: someone opening lots of empty battles can\'t lock the booth out', () => {
  let clock = 0;
  const battles = createBattles({ now: () => clock });
  for (let i = 0; i < 300; i++) { clock++; assert.ok(battles.create().battle); }
  clock++;
  const booth = battles.create();
  assert.ok(booth.battle, 'the booth can still open a battle');
  assert.equal(battles.size(), 300);
  battles.stop();
});

test('booth battle: ends after the time limit even if a phone wanders off', () => {
  let clock = 0;
  const battles = createBattles({ now: () => clock });
  const { battle, hostKey } = battles.create();
  battles.join(battle.code, { clientId: 'wander-phone-1', name: 'Zed', character: 'barry' });
  battles.start(battle.code, hostKey);
  clock += 4000 + 91_000;
  assert.equal(battles.get(battle.code).status, 'done');
  battles.stop();
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
  const admin = await fetch(base + '/admin', { redirect: 'manual' });
  assert.equal(admin.status, 302);
  assert.equal(admin.headers.get('location'), '/?admin=1');
});

test('people\'s choice link can be set on the day without code changes', async () => {
  assert.equal((await (await fetch(base + '/api/config')).json()).voteUrl, '');
  assert.equal((await post('/api/admin/config', { voteUrl: 'https://forms.example.com/vote' })).status, 401);
  assert.equal((await post('/api/admin/config', { voteUrl: 'javascript:alert(1)' }, { 'X-Admin-Token': 'secret' })).status, 400);
  assert.equal((await post('/api/admin/config', { voteUrl: 'https://forms.example.com/vote' }, { 'X-Admin-Token': 'secret' })).status, 200);
  assert.equal((await (await fetch(base + '/api/config')).json()).voteUrl, 'https://forms.example.com/vote');
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
