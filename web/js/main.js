// Game engine: screens, round loop, scoring, offline leaderboard sync.
import { GAMES } from './games.js';
import { LESSONS, SOURCES, GAME_LABELS, GAME_ICONS } from './lessons.js';
import { REGULAR, DAILY_ROUNDS, dailySequence, darwinDay, prevDay, isBoss, isBossRound, classicBossFor } from './daily.js';
import { inSeason, inSeasonGames } from './season.js';
import { scene, mascotSVG, heartSVG, coinSVG, lockSVG, iconFor, VIEW, NS } from './art.js';
import { CHARACTERS, characterSVG, profile } from './characters.js';
import { failScene } from './fails.js';
import { LOCATIONS, LOCATION_COUNT, locationAt, locationArt, locationBackdrop, homeLocationFor } from './locations.js';
import { sfx, music, toggleMute, isMuted } from './sound.js';
import { shake, confetti, floatText, playFail, failKind, FAIL_TITLES, WIN_TITLES } from './fx.js';
import * as badges from './badges.js';
import { shareCard } from './share.js';
import * as api from './api.js';
import * as social from './social.js';
import * as quiz from './quizui.js';
import { initWardrobe, renderWardrobe, applyLook } from './wardrobeui.js';
import { initJudge, openJudge } from './judge.js';
import { gearFor } from './wardrobe.js';
import { townName } from './towns.js';
import * as battle from './battle.js';
import * as hints from './hints.js';
import { initClassroom, joinFromUrl } from './classroom.js';
import { WHO, whoLabel } from './groups.js';
import { toast } from './fx.js';

const $ = (s) => document.querySelector(s);
const MAX_LIVES = 3;
const PARAMS = new URLSearchParams(location.search);
const KIOSK = PARAMS.has('kiosk');
const DEMO = PARAMS.has('demo'); // self-playing attract mode for the booth screen
const ADMIN = PARAMS.has('admin'); // ?admin=1: mini-game tester for the team
const COINS_PER_POINT_DIVISOR = 10; // 1 coin per 10 points scored
const RELAXED_SLOWER = 1.6;         // relaxed mode: 60% more time every round
const BATTLE_ROUNDS = 5;

// Difficulty: rounds get shorter, down to a floor.
export const roundSeconds = (round) => Math.max(2.6, 5.5 - 0.2 * (round - 1));
// Must match server/src/scoring.js
export const pointsFor = (round) => 100 + 10 * (round - 1);
// Streak bonus: from the 3rd win in a row, +20 per extra win (max +100). Must match the server.
export const streakBonus = (streak) => (streak >= 3 ? Math.min(streak - 2, 5) * 20 : 0);
// Beating a boss round is worth an extra 200. Must match the server.
export const BOSS_BONUS = 200;

const state = {
  mode: 'classic', dailyDay: null, round: 0, lives: MAX_LIVES, score: 0, results: [], startedAt: 0, bag: [], last: null,
  runLocalId: null, streak: 0, newBadges: [], ctx: null,
  // Journey mode: where we are on the road trip
  locationIndex: 0, roundInLocation: 0, pendingIntro: true, furthest: 0
};
// Admin tester (?admin=1 or /admin): play any mini-game or mode as a sandbox.
// A sandbox run never saves anything: no best score, coins, badges, fail stats or leaderboard entry.
let forcedGame = null, adminMode = false, adminLocationIndex = 0;
let adminSearch = '', adminTimerScale = 1, adminDebug = true, adminLastGame = null, adminLastLoc = 0;
const byId = (id) => GAMES.find(g => g.id === id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { if (DEMO) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }
};

// ---------- relaxed mode & locals vs visitors ----------
const isRelaxed = () => store.get('tes_relaxed', false) === true;
// Battles are a race, so everyone plays at normal speed there.
const relaxedNow = () => isRelaxed() && state.mode !== 'battle';
function renderRelaxed() {
  const on = isRelaxed();
  document.body.classList.toggle('relaxed', on);
  const chip = $('#relaxed-chip');
  chip.setAttribute('aria-pressed', String(on));
  chip.innerHTML = on ? '🐢 Relaxed mode: <b>on</b> · slower, bigger text' : '🐢 Relaxed mode: off';
}
// On a shared booth device every player is different, so the answer is never remembered there.
let kioskWho = null;
const getWho = () => (KIOSK ? kioskWho : store.get('tes_who', null));

// ---------- screens ----------
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  if (id === 'screen-menu') { renderBest(); renderBadgeCount(); renderMenuExtras(); renderCoins(); renderMenuAvatar(); renderJourney(); social.renderChallengeResults(); }
}

function renderLives() {
  $('#hud-lives').innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
    `<span class="${i < state.lives ? '' : 'lost'}">${heartSVG()}</span>`).join('');
}

function renderBadgeCount() {
  const n = badges.count();
  $('#btn-badges').textContent = `Badges ${n}/${badges.BADGES.length}`;
}

function renderBest() {
  let best = 0;
  try { best = Number(localStorage.getItem('tes_best') || 0); } catch { /* ignore */ }
  $('#best-score').textContent = best ? `Your best: ${best}` : '';
}

// ---------- Journey: Darwin to Uluru, 5 rounds per stop ----------
function loadFurthest() {
  try { state.furthest = Math.min(LOCATION_COUNT - 1, Math.max(0, Number(localStorage.getItem('tes_location') || 0) | 0)); }
  catch { state.furthest = 0; }
  return state.furthest;
}

function saveFurthest(index) {
  const i = Math.min(index, LOCATION_COUNT - 1);
  if (i <= state.furthest || DEMO) return;
  state.furthest = i;
  try { localStorage.setItem('tes_location', String(i)); } catch { /* ignore */ }
}

function renderJourney() {
  $('#menu-journey').textContent = state.furthest > 0
    ? `Furthest: ${locationAt(state.furthest).name}`
    : 'Darwin to Uluru, 8 stops';
}

function renderHudLocation() {
  const loc = locationAt(state.locationIndex);
  $('#hud-location').textContent = loc.name;
  $('#hud-step').textContent = `${Math.min(Math.max(state.roundInLocation, 1), loc.rounds)}/${loc.rounds}`;
}

let introTimer = 0;
function showLocationIntro(loc, done) {
  const box = $('#loc-intro');
  box.querySelector('.loc-art').innerHTML = locationArt(loc.id);
  box.querySelector('.loc-name').textContent = loc.name;
  box.querySelector('.loc-blurb').textContent = loc.blurb;
  box.querySelector('.loc-kicker').textContent = state.locationIndex >= LOCATION_COUNT ? 'Lap 2! Now arriving' : `Stop ${state.locationIndex % LOCATION_COUNT + 1} of ${LOCATION_COUNT} · Now arriving`;
  box.classList.add('show');
  sfx.coin();
  const finish = () => {
    clearTimeout(introTimer);
    introTimer = 0;
    box.classList.remove('show');
    box.removeEventListener('pointerdown', finish);
    done();
  };
  clearTimeout(introTimer);
  introTimer = setTimeout(finish, 2200);
  box.addEventListener('pointerdown', finish);
}

function advanceLocation() {
  // Counts on past Uluru (wraps back to Darwin), so a great run can do a second lap.
  state.locationIndex++;
  if (!adminMode) saveFurthest(state.locationIndex);
  if (locationAt(state.locationIndex).id === 'uluru' && !DEMO && !adminMode) {
    const fresh = badges.grant1('uluru');
    state.newBadges.push(...fresh);
    if (fresh.length) social.celebrate(fresh);
  }
  state.roundInLocation = 0;
  state.pendingIntro = true;
  state.bag = [];
  playRound();
}

// ---------- game flow ----------
function nextGame() {
  // Test hook: force a specific game (used by scripts/smoke_test.py).
  if (window.__TES_FORCE__) return byId(window.__TES_FORCE__);
  if (forcedGame) return byId(forcedGame);
  if (state.mode === 'battle') return byId(state.battle.games[state.round - 1]);
  if (state.mode === 'daily') return byId(dailySequence(state.dailyDay)[state.round - 1]);
  if (state.mode === 'journey') {
    // Every hazard at this stop once (shuffled), then round again.
    if (!state.bag.length) {
      state.bag = locationAt(state.locationIndex).games.map(byId).filter(Boolean).sort(() => Math.random() - 0.5);
      if (state.bag[0] === state.last && state.bag.length > 1) state.bag.push(state.bag.shift());
    }
    state.last = state.bag.shift();
    return state.last;
  }
  if (isBossRound(state.round)) return byId(classicBossFor(state.round));
  if (!state.bag.length) {
    // Every hazard once per bag, plus an extra copy of whatever is in season right now.
    const ids = [...REGULAR, ...inSeasonGames()];
    state.bag = ids.map(byId).sort(() => Math.random() - 0.5);
    if (state.bag[0] === state.last && state.bag.length > 1) state.bag.push(state.bag.shift());
  }
  state.last = state.bag.shift();
  return state.last;
}

function startGame(mode = 'classic', challenge = null, battleInfo = null) {
  sfx.unlock();
  if (typeof mode !== 'string') mode = 'classic';
  // First game on this device: offer the optional 3-question safety check (once, skippable).
  // Never in a Booth Battle: the countdown waits for nobody.
  if (!DEMO && mode !== 'battle' && quiz.shouldOffer()) { quiz.offer(() => startGame(mode, challenge)); return; }
  state.challenge = challenge || null;
  state.battle = mode === 'battle' ? battleInfo : null;
  kioskWho = null; // shared device: a new run is (probably) a new person
  hints.resetRun();
  social.startRun(state.challenge);
  forcedGame = null;
  adminMode = false;
  Object.assign(state, {
    mode, dailyDay: mode === 'daily' ? darwinDay() : null, round: 0, lives: MAX_LIVES, score: 0, results: [],
    startedAt: performance.now(), bag: [], last: null, runLocalId: null, streak: 0, newBadges: [],
    locationIndex: 0, roundInLocation: 0, pendingIntro: true
  });
  resetHud();
  if (!DEMO) music.play('play');
  playRound();
}

function resetHud() {
  $('#hud-score').textContent = '0';
  renderStreak();
  renderLives();
  music.setTempo(132);
  document.body.classList.toggle('daily-mode', state.mode === 'daily');
  document.body.classList.toggle('journey-mode', state.mode === 'journey' || (adminMode && state.mode === 'test'));
  document.body.classList.toggle('battle-mode', state.mode === 'battle');
}

function playRound() {
  if (state.mode === 'journey') {
    const loc = locationAt(state.locationIndex);
    if (state.roundInLocation >= loc.rounds) { advanceLocation(); return; }
    // "Now arriving" card at each new stop (the smoke test can skip it).
    if (state.pendingIntro && !window.__TES_SKIP_INTRO__) {
      state.pendingIntro = false;
      $('#stage').innerHTML = '';
      $('#banner').classList.remove('show');
      $('#timer-bar').style.transform = 'scaleX(1)';
      $('#hud-round').textContent = state.round + 1;
      renderHudLocation();
      show('screen-game');
      showLocationIntro(loc, runRound);
      return;
    }
    state.pendingIntro = false;
  }
  runRound();
}

// Draw a location's landscape as the bottom layer of a round's scene; the game art goes on top.
function addLocationBackdrop(svg, id) {
  const doc = new DOMParser().parseFromString(`<svg xmlns="${NS}">${locationBackdrop(id)}</svg>`, 'image/svg+xml');
  const node = doc.documentElement.firstChild;
  if (node) svg.appendChild(document.importNode(node, true));
}

// Debug overlay for admin sandbox rounds: which game is running and how long it should last.
function renderDebugHud(game, loc, seconds) {
  const el = $('#debug-hud');
  if (!el) return;
  const on = adminMode && adminDebug;
  el.hidden = !on;
  if (!on) return;
  el.textContent = `${state.mode}${game.boss ? ' · BOSS' : ''} · ${game.id} · ${loc.name} · round ${state.round} · ${seconds.toFixed(1)}s` +
    (adminTimerScale !== 1 ? ` · timer ×${adminTimerScale}` : '');
}

function runRound() {
  state.round++;
  $('#hud-round').textContent = state.mode === 'battle' ? `${state.round}/${BATTLE_ROUNDS}` : state.round;
  music.duck(false);
  const game = nextGame();
  // Journey rounds use the stop you are at; Classic and Daily rounds use the hazard's home location.
  const journey = state.mode === 'journey';
  const sandboxTest = adminMode && state.mode === 'test';
  if (journey) { state.roundInLocation++; renderHudLocation(); }
  const loc = journey || sandboxTest ? locationAt(state.locationIndex) : homeLocationFor(game.id);
  music.setTempo(game.boss ? 190 : 132 + state.round * 4);
  const seconds = (game.seconds || roundSeconds(state.round)) * (adminMode ? adminTimerScale : 1) * (relaxedNow() ? RELAXED_SLOWER : 1);
  renderDebugHud(game, loc, seconds);
  const stage = $('#stage');
  stage.innerHTML = '';
  stage.style.pointerEvents = '';
  show('screen-game');

  const svg = scene(game.bg);
  if (!game.boss && !game.ownBackdrop) addLocationBackdrop(svg, loc.id); // bosses and a few games paint their own sky
  stage.appendChild(svg);

  let finished = false, raf = 0, started = 0;
  const tickers = [];
  const roundStart = performance.now();

  const finish = (ok) => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    stage.style.pointerEvents = 'none';
    endRound(game, ok, performance.now() - roundStart);
  };

  const toSvg = (evt) => {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  };

  const ctx = {
    svg, stage, speed: 5.5 / seconds, location: loc,
    win: () => finish(true),
    lose: () => finish(false),
    onTick: (fn) => tickers.push(fn),
    toSvg,
    failTip: null,
    sound: (name) => sfx[name] && sfx[name](),
    clearButtons() { stage.querySelectorAll('.choice-row').forEach(r => r.remove()); },
    buttons(list) {
      const row = document.createElement('div');
      row.className = 'choice-row';
      list.forEach(({ label, ok, onPick }) => {
        const b = document.createElement('button');
        b.className = 'btn' + (ok ? ' choice-ok' : ' choice-bad');
        b.textContent = label;
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation();
          if (finished) return;
          onPick ? onPick() : finish(ok);
        });
        row.appendChild(b);
      });
      stage.appendChild(row);
    },
    draggable(node, x, y, { scale = 1, onDrop, hitBox } = {}) {
      const home = { x, y };
      let pos = { x, y }, grab = null;
      const put = (p, s = scale) => node.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${s})`);
      put(pos);
      node.classList.add('draggable');
      // Generous invisible grab area (an ellipse when the art is anchored off-centre,
      // e.g. a person whose origin is at the feet).
      const hit = document.createElementNS(svg.namespaceURI, hitBox ? 'ellipse' : 'circle');
      if (hitBox) {
        hit.setAttribute('cx', hitBox.x || 0); hit.setAttribute('cy', hitBox.y || 0);
        hit.setAttribute('rx', hitBox.rx || 42); hit.setAttribute('ry', hitBox.ry || 42);
      } else hit.setAttribute('r', 42);
      hit.setAttribute('fill', 'transparent');
      node.insertBefore(hit, node.firstChild);
      node.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const p = toSvg(e);
        grab = { dx: p.x - pos.x, dy: p.y - pos.y, id: e.pointerId };
        svg.setPointerCapture?.(e.pointerId);
        node.classList.add('dragging');
        svg.appendChild(node); // bring to front
        sfx.tap();
      });
      svg.addEventListener('pointermove', (e) => {
        if (!grab || e.pointerId !== grab.id) return;
        const p = toSvg(e);
        pos = {
          x: Math.max(0, Math.min(VIEW.w, p.x - grab.dx)),
          y: Math.max(0, Math.min(VIEW.h, p.y - grab.dy))
        };
        put(pos, scale * 1.1);
      });
      const drop = (e) => {
        if (!grab || e.pointerId !== grab.id) return;
        grab = null;
        node.classList.remove('dragging');
        put(pos);
        const r = onDrop && onDrop(pos.x, pos.y);
        if (r === 'reset' && !finished) { pos = { ...home }; put(pos); }
      };
      svg.addEventListener('pointerup', drop);
      svg.addEventListener('pointercancel', drop);
    }
  };

  state.ctx = ctx;
  game.setup(ctx);
  if (DEMO) demoBot(ctx, () => finished);
  // First time meeting this game? A ghost hand shows how to play it (and the timer waits a moment).
  const hintGrace = !DEMO && hints.needHint(game.id, { perRun: KIOSK || relaxedNow() }) ? hints.showHint(ctx, game.id) : 0;

  // banner
  const banner = $('#banner');
  banner.textContent = game.prompt;
  banner.classList.toggle('boss', !!game.boss);
  if (game.boss) sfx.fanfare();
  banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
  sfx.go();

  // timer loop (starts after a short grace so players can read the prompt)
  const bar = $('#timer-bar');
  bar.style.transform = 'scaleX(1)';
  bar.classList.remove('urgent');
  const grace = 350 + hintGrace;
  let last = performance.now();
  const loop = (now) => {
    if (finished) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now - roundStart - grace;
    if (t > 0) {
      if (!started) started = now;
      const p = Math.min(1, t / (seconds * 1000));
      bar.style.transform = `scaleX(${1 - p})`;
      if (p > 0.7) bar.classList.add('urgent');
      for (const fn of tickers) fn(p, dt);
      if (p >= 1) {
        const ok = game.timeoutResult ? game.timeoutResult(ctx) : !!game.timeoutWins;
        finish(ok);
        return;
      }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

function renderStreak() {
  const el = $('#hud-streak');
  if (!el) return;
  el.textContent = state.streak >= 2 ? `🔥 ${state.streak}` : '';
  el.classList.toggle('hot', state.streak >= 3);
}

async function endRound(game, ok, ms) {
  const stage = $('#stage');
  const svg = stage.querySelector('svg');
  if (adminMode && state.mode === 'test') return endAdminRound(game, ok, svg);
  // Record the result immediately (the animations below are only cosmetic).
  state.results.push({ g: game.id, ok, ms: Math.round(ms) });
  let bonus = 0;
  if (ok) {
    state.streak++;
    bonus = streakBonus(state.streak) + (game.boss ? BOSS_BONUS : 0);
    const pts = pointsFor(state.round) + bonus;
    state.score += pts;
    floatText(stage, `+${pts}`);
    confetti(state.streak >= 3 ? 90 : 45);
    state.streak >= 3 ? sfx.streak(state.streak) : sfx.win();
  } else {
    state.streak = 0;
    if (state.mode !== 'battle') state.lives--; // a battle has no lives: everyone plays all 5
    if (!DEMO && !adminMode) { const f = store.get('tes_fails', {}); f[game.id] = (f[game.id] || 0) + 1; store.set('tes_fails', f); }
    navigator.vibrate?.([80, 40, 120]);
    shake(stage, 12);
    music.duck(true);
  }
  $('#hud-score').textContent = state.score;
  renderLives();
  renderStreak();
  if (ok) social.onScore(state);
  if (state.mode === 'battle') battle.sendProgress(state.results); // the booth screen shows the race live

  if (ok) await wait(550);
  else {
    const snd = await playFail(game.id, svg);
    (sfx[snd] || sfx.lose)();
    await wait(1100);
  }

  showResultCard(game, ok);
  $('#result-streak').textContent = ok && game.boss ? `👑 Boss beaten! +${bonus} bonus`
    : ok && bonus ? `🔥 ${state.streak} in a row! +${bonus} bonus` : '';

  const dailyDone = state.mode === 'daily' && state.round >= DAILY_ROUNDS;
  const battleDone = state.mode === 'battle' && state.round >= BATTLE_ROUNDS;
  setTimeout(() => {
    if (battleDone) battleOver();
    else if (state.lives <= 0 || dailyDone) gameOver();
    else playRound();
  }, ok ? 1500 : 2300);
}

// Win: your character celebrates. Fail: a looping cartoon of that hazard, starring your character.
function showResultCard(game, ok) {
  const lesson = LESSONS[game.id];
  const c = profile.character;
  $('#result-card').className = 'result-card ' + (ok ? 'win' : 'lose');
  const face = $('#result-face');
  face.classList.toggle('scene', !ok);
  face.innerHTML = ok ? characterSVG(c.id, 'win') : failScene(game.id, c);
  $('#result-title').textContent = ok ? (Math.random() < 0.4 ? c.winLine : pick(WIN_TITLES)) : pick(FAIL_TITLES[failKind(game.id)]);
  $('#result-tip').textContent = ok ? lesson.win : (state.ctx?.failTip || lesson.fail);
  show('screen-result');
}

async function endAdminRound(game, ok, svg) {
  if (ok) { sfx.win(); confetti(45); await wait(550); }
  else { const snd = await playFail(game.id, svg); (sfx[snd] || sfx.lose)(); await wait(900); }
  showResultCard(game, ok);
  adminLastGame = game.id;
  $('#result-streak').textContent = '🛠️ Sandbox test round: nothing was saved';
  setTimeout(() => showAdmin(`Tested ${GAME_LABELS[game.id] || game.id}. Nothing was saved.`), ok ? 1500 : 2300);
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function gameOver() {
  music.setTempo(132);
  if (!DEMO) music.play('menu');
  sfx.over();
  if (DEMO) { show('screen-over'); $('#over-score').textContent = state.score; setTimeout(() => startGame('classic'), 3500); return; }
  if (adminMode) {
    const survived = state.results.filter(r => r.ok).length;
    showAdmin(`Sandbox ${state.mode} run finished: ${state.score} points, survived ${survived}/${state.results.length} rounds. Nothing was saved.`);
    return;
  }
  const durationMs = Math.round(performance.now() - state.startedAt);
  state.runLocalId = api.queueRun({
    mode: state.mode,
    day: state.dailyDay || undefined,
    results: state.results.map(({ g, ok, ms }) => ({ g, ok, ms })),
    durationMs,
    town: (!relaxedNow() && social.getTown()) || undefined,
    challengeOf: state.challenge?.id || undefined,
    relaxed: relaxedNow() || undefined,
    who: getWho() || undefined,
    classCode: api.myClass()?.code || undefined,
    appVersion: window.TES_CONFIG?.APP_VERSION
  });
  api.flush();

  try {
    const best = Number(localStorage.getItem('tes_best') || 0);
    if (state.mode !== 'daily' && state.score > best) localStorage.setItem('tes_best', String(state.score));
  } catch { /* ignore */ }

  state.newBadges.push(...badges.evaluateRun(state.results, state.score));
  if (state.mode === 'daily') state.newBadges.push(...recordDaily());
  renderNewBadges();
  renderDailyResult();
  renderWeakSpot();
  social.renderOverChallenge(state);
  quiz.renderOverQuiz();
  renderOverTown();
  renderOverWho();
  renderOverHome();
  const relaxed = relaxedNow();
  $('#over-relaxed').hidden = !relaxed;
  $('#submit-form').hidden = relaxed;
  $('#btn-challenge').hidden = relaxed;
  $('#challenge-link').hidden = true;
  $('#over-score').textContent = state.score;
  renderOverCoins();
  const survived = state.results.filter(r => r.ok).length;
  const stop = locationAt(state.locationIndex);
  $('#over-rounds').textContent = state.mode === 'daily'
    ? `Daily Challenge: you survived ${survived} of ${DAILY_ROUNDS} hazards.`
    : state.mode === 'journey'
      ? `You made it to ${stop.name}${state.locationIndex >= LOCATION_COUNT ? ' (lap 2!)' : ` (stop ${state.locationIndex + 1} of ${LOCATION_COUNT})`} and survived ${survived} of ${state.results.length} rounds.`
      : `You survived ${survived} of ${state.results.length} rounds.`;
  $('#over-title').textContent = state.mode === 'daily' && state.lives > 0 ? 'Daily complete!' : 'Game over';

  const failed = [...new Set(state.results.filter(r => !r.ok).map(r => r.g))];
  $('#over-lessons').innerHTML = failed.map(id => {
    const l = LESSONS[id], s = SOURCES[l.source];
    return `<li><b>${escapeHtml(s.title)}</b>${escapeHtml(l.fail)} <a href="${s.url}" target="_blank" rel="noopener">Source: ${escapeHtml(s.org)}</a></li>`;
  }).join('') || '<li>No mistakes. Absolute legend.</li>';

  const nameInput = $('#player-name');
  try { nameInput.value = KIOSK ? '' : (localStorage.getItem('tes_name') || ''); } catch { /* ignore */ }
  $('#submit-msg').textContent = '';
  $('#submit-form').querySelector('button').disabled = false;
  show('screen-over');
  if (KIOSK) armKioskReset();
}

let kioskTimer = 0;
function armKioskReset() {
  clearTimeout(kioskTimer);
  kioskTimer = setTimeout(() => { if ($('#screen-over').classList.contains('active')) show('screen-menu'); }, 45000);
}

async function submitName(e) {
  e.preventDefault();
  const input = $('#player-name');
  const name = input.value.trim().replace(/\s+/g, ' ');
  if (!/^[A-Za-z0-9 _-]{2,16}$/.test(name)) {
    $('#submit-msg').textContent = 'Use 2 to 16 letters, numbers, spaces, - or _.';
    return;
  }
  try { if (!KIOSK) localStorage.setItem('tes_name', name); } catch { /* ignore */ }
  api.setRunName(state.runLocalId, name);
  const btn = $('#submit-form').querySelector('button');
  btn.disabled = true;
  $('#submit-msg').textContent = 'Sending...';
  await api.flush();
  const st = api.runStatus(state.runLocalId);
  $('#submit-msg').textContent =
    st.state === 'sent' ? 'On the board! Check the leaderboard.' :
    st.state === 'rejected' ? `Not accepted: ${st.error}` :
    'Saved offline. It will upload when you are back online.';
  if (st.state === 'rejected') btn.disabled = false;
  if (KIOSK) armKioskReset();
}

function renderNewBadges() {
  const box = $('#over-badges');
  if (!state.newBadges.length) { box.innerHTML = ''; box.hidden = true; return; }
  box.hidden = false;
  const gear = gearFor(state.newBadges.map(b => b.id));
  box.innerHTML = '<b>New badge' + (state.newBadges.length > 1 ? 's' : '') + '!</b>' +
    state.newBadges.map(b => `<span class="medal pop-in"><i>${b.icon}</i>${escapeHtml(b.name)}</span>`).join('') +
    (gear.length ? `<small class="gear-note">👕 New gear unlocked: ${gear.map(g => escapeHtml(g.name)).join(', ')}. Check the Wardrobe!</small>` : '');
  setTimeout(() => { sfx.badge(); confetti(80, { x: .5, y: .2 }); }, 400);
}

async function doShare() {
  const btn = $('#btn-share');
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = 'Making your card...';
  try {
    let name = '';
    try { name = $('#player-name').value.trim(); } catch { /* ignore */ }
    const r = await shareCard({
      score: state.score, rounds: state.results.length,
      survived: state.results.filter(x => x.ok).length,
      name: /^[A-Za-z0-9 _-]{2,16}$/.test(name) ? name : '',
      badgeIds: Object.keys(badges.unlocked())
    });
    btn.textContent = r === 'downloaded' ? 'Saved to your device!' : r === 'shared' ? 'Shared!' : old;
  } catch {
    btn.textContent = 'Could not make the card';
  }
  setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 2500);
}

function renderBadges() {
  const got = badges.unlocked();
  $('#badge-count').textContent = `${Object.keys(got).length} of ${badges.BADGES.length} collected`;
  $('#badge-grid').innerHTML = badges.BADGES.map(b => {
    const have = !!got[b.id];
    const prog = badges.progress(b);
    return `<div class="badge ${have ? 'have' : 'locked'}">
      <div class="medal-big">${have ? b.icon : '🔒'}</div>
      <b>${escapeHtml(b.name)}</b>
      <small>${have ? 'Unlocked!' : escapeHtml(b.hint) + (prog ? ` (${prog})` : '')}</small>
    </div>`;
  }).join('');
}

function setMuteIcons() {
  document.querySelectorAll('[data-mute]').forEach(b => {
    b.textContent = isMuted() ? '🔇' : '🔊';
    b.setAttribute('aria-label', isMuted() ? 'Unmute' : 'Mute');
  });
}

// ---------- Daily Challenge ----------
function dailyInfo() {
  const d = store.get('tes_daily', { lastDay: null, streak: 0, best: {} });
  const today = darwinDay();
  const alive = d.lastDay === today || d.lastDay === prevDay(today);
  return { ...d, streak: alive ? d.streak : 0, today, bestToday: d.best?.[today] ?? null };
}

function recordDaily() {
  const d = store.get('tes_daily', { lastDay: null, streak: 0, best: {} });
  const today = state.dailyDay;
  if (d.lastDay !== today) d.streak = d.lastDay === prevDay(today) ? d.streak + 1 : 1;
  d.lastDay = today;
  d.best = d.best || {};
  d.best[today] = Math.max(d.best[today] || 0, state.score);
  // keep the last 30 days only
  d.best = Object.fromEntries(Object.entries(d.best).sort().slice(-30));
  store.set('tes_daily', d);
  return badges.grantDailyStreak(d.streak);
}

function dailyShareText() {
  const seq = dailySequence(state.dailyDay);
  const icons = seq.map(id => GAME_ICONS[id] || '❓').join('');
  const squares = seq.map((id, i) => {
    const r = state.results[i];
    return !r ? '⬛' : r.ok ? '🟩' : '🟥';
  }).join('');
  const survived = state.results.filter(r => r.ok).length;
  const date = new Date(state.dailyDay + 'T12:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `Top End Survivor Daily · ${date}\n${icons}\n${squares}\n${survived}/${DAILY_ROUNDS} · ${state.score} pts\nCan you survive the Top End? ${playUrlSafe()}`;
}

function playUrlSafe() {
  const c = window.TES_CONFIG || {};
  return c.PUBLIC_URL || (window.Capacitor ? c.ANDROID_API_BASE : location.origin + '/');
}

function renderDailyResult() {
  const box = $('#over-daily');
  if (state.mode !== 'daily') { box.hidden = true; return; }
  box.hidden = false;
  const [, icons, squares] = dailyShareText().split('\n');
  $('#daily-grid').innerHTML = `<div>${icons}</div><div>${squares}</div>`;
  const info = dailyInfo();
  $('#daily-streak').textContent = info.streak > 1 ? `🔥 ${info.streak}-day streak! Come back tomorrow for a new challenge.` : 'New challenge every day at midnight (Darwin time).';
}

async function shareDaily() {
  const text = dailyShareText();
  const btn = $('#btn-share-daily');
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text);
    btn.textContent = 'Copied! Paste it in your group chat';
  } catch {
    btn.textContent = 'Copy failed';
  }
  setTimeout(() => { btn.textContent = '📋 Share my Daily result'; }, 2500);
}

function renderMenuExtras() {
  const info = dailyInfo();
  $('#daily-sub').textContent = info.bestToday != null ? `Your best today: ${info.bestToday}` : 'New challenge today!';
  $('#daily-streak-chip').textContent = info.streak > 0 ? `🔥 ${info.streak}-day streak` : '';
  const season = inSeason();
  $('#season-chip').innerHTML = season.length
    ? 'In season now: ' + season.map(x => `<span>${x.icon} ${escapeHtml(x.label)}</span>`).join(' ')
    : '';
}

// ---------- weak spot ----------
function renderWeakSpot() {
  const box = $('#over-weak');
  const fails = store.get('tes_fails', {});
  const [id, n] = Object.entries(fails).sort((a, b) => b[1] - a[1])[0] || [];
  if (!id || n < 2 || !LESSONS[id]) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `🎯 <b>Your weak spot: ${escapeHtml(GAME_LABELS[id] || id)}</b> (missed ${n} times). ${escapeHtml(LESSONS[id].fail)}`;
}

// ---------- install ----------
let installPrompt = null;
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true || !!window.Capacitor;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
let apkAvailable = false;

function renderInstall() {
  // Android always gets the button: Chrome's own install box when it's ready, written steps otherwise.
  const show_ = !DEMO && !isStandalone() && (installPrompt || isIOS() || isAndroid());
  document.querySelectorAll('[data-install]').forEach(b => { b.hidden = !show_; });
}

async function doInstall() {
  if (installPrompt) {
    installPrompt.prompt();
    const r = await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    if (r && r.outcome === 'accepted') celebrateInstall();
    renderInstall();
    return;
  }
  $('#install-ios').hidden = !isIOS();
  $('#install-android').hidden = !isAndroid();
  $('#install-apk').hidden = !(apkAvailable && isAndroid());
  // Any other device (e.g. a laptop without an install prompt): show both sets of steps.
  if (!isIOS() && !isAndroid()) { $('#install-ios').hidden = false; $('#install-android').hidden = false; }
  $('#install-sheet').hidden = false;
}

function celebrateInstall() {
  const fresh = badges.grantInstall();
  if (fresh.length) { sfx.badge(); confetti(90, { x: .5, y: .3 }); }
  renderBadgeCount();
}

// ---------- demo bot (booth attract mode) ----------
function demoBot(ctx, isFinished) {
  const success = Math.random() < 0.72;
  const act = () => {
    if (isFinished()) return;
    const btn = ctx.stage.querySelector(success ? '.choice-ok' : '.choice-bad');
    if (btn) {
      btn.classList.add('demo-press');
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      setTimeout(act, 900);
    } else {
      success ? ctx.win() : ctx.lose();
    }
  };
  setTimeout(act, 900 + Math.random() * 1300);
}

// Booth Battle finished on this phone: coins and badges, then the live podium.
function battleOver() {
  music.setTempo(132);
  music.play('menu');
  if (!DEMO) {
    profile.addCoins(Math.floor(state.score / COINS_PER_POINT_DIVISOR));
    renderCoins();
    social.celebrate(badges.evaluateRun(state.results, state.score));
  }
  battle.finish(state);
}

// Locals vs visitors: one optional tap. It helps show which rules newcomers to the NT miss.
function renderOverWho() {
  const box = $('#over-who');
  const who = getWho();
  box.hidden = false;
  if (who) {
    box.innerHTML = `<span>🙌 Thanks! Counted as <b>${escapeHtml(whoLabel(who))}</b>. ${KIOSK ? '' : '<button class="linkish" id="who-change">Change</button>'}</span>`;
    $('#who-change')?.addEventListener('click', () => { store.set('tes_who', null); renderOverWho(); });
    return;
  }
  box.innerHTML = `<b>👋 Quick one, are you...</b><div class="who-row">${WHO.map(w =>
    `<button class="btn btn-small" data-who="${w.id}">${w.icon} ${escapeHtml(w.label)}</button>`).join('')}</div>
    <small>Optional. It shows which safety rules visitors and newcomers miss most.</small>`;
  box.querySelectorAll('[data-who]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.who;
    if (KIOSK) kioskWho = id; else store.set('tes_who', id);
    api.setRunWho(state.runLocalId, id);
    api.flush();
    sfx.pop();
    renderOverWho();
  }));
}

// Shared booth devices: a big QR so people can take the game home (and vote on their own phone).
function renderOverHome(refetch = true) {
  const cfg = window.TES_CONFIG || {};
  // Pick up a vote link set on the server since this page loaded.
  if (refetch) api.getConfig().then(c => { if (c.voteUrl && c.voteUrl !== cfg.VOTE_URL) { cfg.VOTE_URL = c.voteUrl; renderOverHome(false); } }).catch(() => {});
  const voteUrl = cfg.VOTE_URL || '';
  const vote = $('#btn-vote');
  vote.hidden = !voteUrl || KIOSK;
  if (voteUrl) vote.href = voteUrl;
  const box = $('#over-home');
  box.hidden = !KIOSK;
  if (!KIOSK) return;
  const qr = (url) => `${cfg.API_BASE || ''}/api/qr.svg?url=${encodeURIComponent(url)}`;
  $('#home-qr').src = qr(playUrlSafe());
  $('#vote-qr-box').hidden = !voteUrl;
  if (voteUrl) $('#vote-qr').src = qr(voteUrl);
}

function renderOverTown() {
  const box = $('#over-town');
  if (KIOSK || relaxedNow()) { box.hidden = true; return; }
  const t = social.getTown();
  box.hidden = false;
  box.innerHTML = t
    ? `📍 Your score counts for <b>${escapeHtml(townName(t))}</b> in the Town Battle. <button class="linkish" id="over-town-change">Change</button>`
    : `📍 <b>Which town are you playing for?</b> <button class="btn btn-small" id="over-town-pick">Pick my town</button>`;
  const pickTown = () => social.openTownPicker((id) => { api.setRunTown(state.runLocalId, id); api.flush(); renderOverTown(); });
  $('#over-town-change')?.addEventListener('click', pickTown);
  $('#over-town-pick')?.addEventListener('click', pickTown);
}

// ---------- leaderboard ----------
async function showBoard(period = 'today') {
  show('screen-board');
  document.querySelectorAll('#screen-board .tab').forEach(t => t.classList.toggle('active', t.dataset.period === period));
  const list = $('#board-list'), msg = $('#board-msg');
  list.innerHTML = '';
  msg.textContent = 'Loading...';
  try {
    await api.flush();
    if (period === 'towns') { await social.renderTownsBoard(list, msg); return; }
    const data = await api.getLeaderboard(period);
    list.innerHTML = data.entries.map(e =>
      `<li class="${e.mine ? 'me' : ''}"><span class="n">${escapeHtml(e.name)}</span><span class="s">${num(e.score)}</span></li>`).join('');
    msg.textContent = data.entries.length ? '' : 'No scores yet. Be the first!';
  } catch {
    msg.textContent = 'Leaderboard needs internet. Your scores are saved and will upload later.';
  }
}

// ---------- learn ----------
function renderLearn() {
  $('#learn-list').innerHTML = Object.entries(SOURCES).map(([key, s]) => `
    <div class="learn-item">
      ${iconFor(key)}
      <div>
        <h4>${escapeHtml(s.title)}</h4>
        <p>${escapeHtml(s.summary)}</p>
        <a href="${s.url}" target="_blank" rel="noopener">${escapeHtml(s.org)}</a>
      </div>
    </div>`).join('');
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0); // numbers from the server, never HTML

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Territory Characters and coins ----------
function renderCoins() {
  $('#menu-coins').innerHTML = `${coinSVG()}<span>${profile.coins}</span>`;
  const ic = $('#shop-coin-ic'); if (ic) ic.innerHTML = coinSVG();
  const sc = $('#shop-coins'); if (sc) sc.textContent = profile.coins;
}

function renderMenuAvatar() {
  $('#menu-mascot').innerHTML = characterSVG(profile.selected, 'idle');
}

// Coins: 1 per 10 points, every mode. Shows how close the next character is.
function renderOverCoins() {
  $('#over-char').innerHTML = characterSVG(profile.selected, state.lives > 0 ? 'win' : 'fail');
  const box = $('#over-coins');
  if (DEMO) { box.innerHTML = ''; return; }
  const earned = Math.floor(state.score / COINS_PER_POINT_DIVISOR);
  profile.addCoins(earned);
  const next = CHARACTERS.find(c => !profile.owns(c.id));
  const goal = !next ? 'You own every character!'
    : profile.coins >= next.price ? `Enough to unlock ${next.name}! Open Characters.`
      : `${next.price - profile.coins} more to unlock ${next.name}.`;
  box.innerHTML = `${coinSVG()}<span>+${earned} coin${earned === 1 ? '' : 's'} · ${profile.coins} total</span><small>${escapeHtml(goal)}</small>`;
  box.classList.toggle('can-buy', !!next && profile.coins >= next.price);
  renderCoins();
}

function renderCharacters(msg = '') {
  $('#shop-coins').textContent = profile.coins;
  const grid = $('#char-grid');
  grid.innerHTML = '';
  for (const c of CHARACTERS) {
    const owned = profile.owns(c.id);
    const selected = profile.selected === c.id;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'char-card ' + (owned ? 'owned' : 'locked') + (selected ? ' selected' : '');
    card.innerHTML = `
      ${selected ? '<span class="own-tag">Playing</span>' : owned ? '<span class="own-tag">Owned</span>' : ''}
      <div class="pic">${characterSVG(c.id, 'idle')}</div>
      <h4>${escapeHtml(c.name)}</h4>
      <span class="tag">${escapeHtml(c.tagline)}</span>
      ${owned
        ? '<span class="price">Tap to play</span>'
        : `<span class="price tagrow">${lockSVG()}<span>${c.price} coins</span></span>`}`;
    card.addEventListener('click', () => onCharacterClick(c));
    grid.appendChild(card);
  }
  $('#shop-msg').textContent = msg;
}

function onCharacterClick(c) {
  if (profile.owns(c.id)) {
    if (profile.selected === c.id) { renderCharacters(`Already playing as ${c.name}.`); return; }
    profile.select(c.id);
    applyLook();
    sfx.pop();
    renderCharacters(`Now playing as ${c.name}.`);
    renderMenuAvatar();
    return;
  }
  const res = profile.buy(c.id);
  if (!res.ok) {
    sfx.boing();
    renderCharacters(`Not enough coins for ${c.name}: you need ${c.price - profile.coins} more.`);
    return;
  }
  applyLook();
  sfx.badge();
  confetti(90, { x: .5, y: .3 });
  renderCoins();
  renderCharacters(`Unlocked ${c.name}! They're now your character.`);
  renderMenuAvatar();
}

function showCharacters() {
  show('screen-characters');
  $('#shop-frilly').innerHTML = mascotSVG('happy');
  renderCoins();
  renderCharacters();
}

// ---------- admin tester (?admin=1 or /admin) ----------
// Sandbox runs: look at any location's backdrop, replay one mini-game, or play a whole
// Classic / Daily / Journey run from a stop. Nothing is ever saved.

function playAdminGame(gameId, locationIndex = adminLocationIndex) {
  adminLastGame = gameId;
  adminLastLoc = locationIndex;
  startAdminRun('test', { gameId, locationIndex });
}

function startAdminRun(mode, { gameId = null, locationIndex = 0 } = {}) {
  sfx.unlock();
  music.play('play');
  forcedGame = gameId;
  adminMode = true;
  Object.assign(state, {
    mode, dailyDay: mode === 'daily' ? darwinDay() : null, round: 0, lives: MAX_LIVES, score: 0, results: [],
    startedAt: performance.now(), bag: [], last: null, runLocalId: null, streak: 0, newBadges: [], challenge: null,
    locationIndex, roundInLocation: 0, pendingIntro: false
  });
  social.startRun(null);
  resetHud();
  if (mode === 'test') renderHudLocation();
  playRound();
}

function renderAdmin() {
  renderAdminLocations();
  renderAdminGames();
  const replay = $('#admin-replay');
  if (replay) replay.hidden = !adminLastGame;
}

function renderAdminLocations() {
  const locRow = $('#admin-locs');
  locRow.innerHTML = '';
  LOCATIONS.forEach((loc, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (i === adminLocationIndex ? ' active' : '');
    b.textContent = loc.name;
    b.addEventListener('click', () => { adminLocationIndex = i; renderAdmin(); });
    locRow.appendChild(b);
  });
}

function renderAdminGames() {
  const here = locationAt(adminLocationIndex).games;
  // This location's mini-games first, then the rest (bosses last).
  const ordered = [...GAMES.filter(g => here.includes(g.id)), ...GAMES.filter(g => !here.includes(g.id))];
  const q = adminSearch.trim().toLowerCase();
  const list = q ? ordered.filter(g => `${g.id} ${GAME_LABELS[g.id] || ''} ${g.prompt}`.toLowerCase().includes(q)) : ordered;
  const grid = $('#admin-games');
  grid.innerHTML = '';
  if (!list.length) {
    grid.innerHTML = '<p class="sub small" style="grid-column:1/-1">No mini-games match that search.</p>';
  }
  for (const gme of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'admin-game' + (here.includes(gme.id) ? ' here' : '');
    b.innerHTML = `<b>${escapeHtml((GAME_ICONS[gme.id] || '') + ' ' + (GAME_LABELS[gme.id] || gme.id))}</b>
      <span class="ag-prompt">${escapeHtml(gme.prompt)}</span>
      <span class="ag-id">${escapeHtml(gme.id)}</span>`;
    b.addEventListener('click', () => playAdminGame(gme.id));
    grid.appendChild(b);
  }
  const count = $('#admin-count');
  if (count) count.textContent = `${list.length} of ${GAMES.length}${q ? ' match' : ''}`;
}

function showAdmin(message = '') {
  adminMode = false;
  forcedGame = null;
  show('screen-admin');
  renderAdmin();
  const msg = $('#admin-msg');
  if (msg) msg.textContent = message;
}

function playRandomHere() {
  const here = locationAt(adminLocationIndex).games;
  playAdminGame(here[Math.floor(Math.random() * here.length)]);
}

// ---------- audio ----------
// Browsers block audio until the player interacts, so the effects and the soundtrack
// both wait for the first tap or key press.
function armAudio() {
  const go = () => {
    sfx.unlock();
    if (!document.querySelector('#screen-game.active')) music.play('menu');
    window.removeEventListener('pointerdown', go, true);
    window.removeEventListener('keydown', go, true);
  };
  window.addEventListener('pointerdown', go, true);
  window.addEventListener('keydown', go, true);
}

// ---------- network status ----------
async function updateNet() {
  const pill = $('#net-status');
  try {
    const h = await api.ping();
    apkAvailable = !!h.apk;
    renderInstall();
    pill.textContent = 'Online';
    pill.classList.add('online');
    api.flush();
  } catch {
    pill.textContent = 'Offline ready';
    pill.classList.remove('online');
  }
}

// ---------- wire up ----------
function init() {
  profile.load();
  loadFurthest();
  renderMenuAvatar();
  renderCoins();
  renderJourney();
  renderBest();
  renderLearn();
  $('#btn-play').addEventListener('click', () => startGame('classic'));
  $('#btn-daily').addEventListener('click', () => startGame('daily'));
  $('#btn-journey').addEventListener('click', () => startGame('journey'));
  $('#btn-chars').addEventListener('click', showCharacters);
  $('#btn-again').addEventListener('click', () => startGame(state.mode));
  $('#btn-share-daily').addEventListener('click', shareDaily);
  document.querySelectorAll('[data-install]').forEach(b => b.addEventListener('click', doInstall));
  $('#install-close').addEventListener('click', () => { $('#install-sheet').hidden = true; });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; renderInstall(); });
  window.addEventListener('appinstalled', () => { celebrateInstall(); renderInstall(); });
  if (isStandalone() && !DEMO) badges.grantInstall();
  renderMenuExtras();
  renderInstall();
  $('#btn-over-menu').addEventListener('click', () => show('screen-menu'));
  $('#btn-board').addEventListener('click', () => showBoard('today'));
  $('#btn-learn').addEventListener('click', () => {
    show('screen-learn');
    const fresh = badges.grantReader();
    if (fresh.length) { sfx.badge(); confetti(60, { x: .5, y: .15 }); }
  });
  $('#btn-badges').addEventListener('click', () => { renderBadges(); show('screen-badges'); });
  $('#btn-wardrobe').addEventListener('click', () => { renderWardrobe(); show('screen-wardrobe'); });
  $('#btn-challenge').addEventListener('click', () => social.sendChallenge(state));
  $('#btn-help').addEventListener('click', () => show('screen-help'));
  $('#learn-help').addEventListener('click', () => show('screen-help'));
  $('#over-help').addEventListener('click', () => show('screen-help'));
  $('#relaxed-chip').addEventListener('click', () => {
    store.set('tes_relaxed', !isRelaxed());
    renderRelaxed();
    sfx.pop();
    toast(isRelaxed() ? '🐢 Relaxed mode on: more time, bigger text. Scores stay off the leaderboard.' : 'Relaxed mode off: full speed!');
  });
  renderRelaxed();
  const appCtx = {
    show, startGame, escapeHtml, playUrl: playUrlSafe, isDemo: DEMO, kiosk: KIOSK,
    celebrate: (fresh) => social.celebrate(fresh), getWho, toast
  };
  social.initSocial(appCtx);
  quiz.initQuiz(appCtx);
  initWardrobe(appCtx);
  initJudge(appCtx);
  battle.initBattle(appCtx);
  initClassroom(appCtx);
  social.loadIncoming(PARAMS);
  if (!DEMO) joinFromUrl(PARAMS);
  // People's Choice link: set on the server on the day (no code change). Not taken from the page
  // address, so a crafted link can't swap in a different "vote" site.
  api.getConfig().then(c => { if (c.voteUrl) window.TES_CONFIG.VOTE_URL = c.voteUrl; }).catch(() => { /* offline: keep config.js */ });
  if (!DEMO && /^[A-Za-z]{4}$/.test(PARAMS.get('battle') || '')) battle.openJoin(PARAMS.get('battle'));
  social.renderChallengeResults();
  $('#btn-share').addEventListener('click', doShare);
  document.querySelectorAll('[data-mute]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation(); sfx.unlock(); toggleMute(); setMuteIcons();
  }));
  setMuteIcons();
  renderBadgeCount();
  if (!DEMO) armAudio();
  // Don't keep the music playing in a hidden tab; pick it back up on return.
  document.addEventListener('visibilitychange', () => { if (document.hidden) music.stop(); else if (!DEMO) music.resume(); });
  if (ADMIN) {
    const adminBtn = $('#btn-admin');
    adminBtn.hidden = false;
    adminBtn.addEventListener('click', () => showAdmin());
    $('#admin-random').addEventListener('click', playRandomHere);
    $('#admin-play-classic').addEventListener('click', () => startAdminRun('classic', { locationIndex: adminLocationIndex }));
    $('#admin-play-daily').addEventListener('click', () => startAdminRun('daily', { locationIndex: adminLocationIndex }));
    $('#admin-play-journey').addEventListener('click', () => startAdminRun('journey', { locationIndex: adminLocationIndex }));
    $('#admin-replay').addEventListener('click', () => { if (adminLastGame) playAdminGame(adminLastGame, adminLastLoc); });
    $('#admin-menu').addEventListener('click', () => show('screen-menu'));
    $('#admin-search').addEventListener('input', (e) => { adminSearch = e.target.value; renderAdminGames(); });
    const speed = $('#admin-speed');
    speed.value = String(adminTimerScale);
    speed.addEventListener('change', (e) => { adminTimerScale = Number(e.target.value) || 1; });
    const debug = $('#admin-debug');
    debug.checked = adminDebug;
    debug.addEventListener('change', (e) => {
      adminDebug = e.target.checked;
      if (!adminDebug) $('#debug-hud').hidden = true;
    });
  }
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => show('screen-menu')));
  // Only the leaderboard's tabs: the Wardrobe and Admin screens have their own .tab buttons.
  document.querySelectorAll('#screen-board .tab').forEach(t => t.addEventListener('click', () => showBoard(t.dataset.period)));
  $('#submit-form').addEventListener('submit', submitName);
  window.addEventListener('online', updateNet);
  window.addEventListener('offline', updateNet);
  updateNet();
  // prevent pull-to-refresh / scroll during play
  $('#stage').addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.Capacitor) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* not fatal */ });
  }
  // Test hook used by the automated smoke test (harmless in production).
  window.__TES__ = { state, GAMES, roundSeconds, pointsFor, streakBonus, dailySequence, darwinDay, dailyShareText, startGame, profile, LOCATIONS };
  if (ADMIN && !KIOSK && !DEMO) {
    showAdmin();
  } else if (DEMO) {
    document.body.classList.add('demo');
    setTimeout(() => startGame('classic'), 800);
  } else if (PARAMS.has('judge')) {
    openJudge();
  }
}

init();
