// Game engine: screens, round loop, scoring, offline leaderboard sync.
import { GAMES } from './games.js';
import { LESSONS, SOURCES } from './lessons.js';
import { scene, mascotSVG, heartSVG, iconFor, VIEW } from './art.js';
import { sfx, music, toggleMute, isMuted } from './sound.js';
import { shake, confetti, floatText, playFail, failKind, FAIL_TITLES, WIN_TITLES } from './fx.js';
import * as badges from './badges.js';
import { shareCard } from './share.js';
import * as api from './api.js';

const $ = (s) => document.querySelector(s);
const MAX_LIVES = 3;
const KIOSK = new URLSearchParams(location.search).has('kiosk');

// Difficulty: rounds get shorter, down to a floor.
export const roundSeconds = (round) => Math.max(2.6, 5.5 - 0.2 * (round - 1));
// Must match server/src/scoring.js
export const pointsFor = (round) => 100 + 10 * (round - 1);
// Streak bonus: from the 3rd win in a row, +20 per extra win (max +100). Must match the server.
export const streakBonus = (streak) => (streak >= 3 ? Math.min(streak - 2, 5) * 20 : 0);

const state = { round: 0, lives: MAX_LIVES, score: 0, results: [], startedAt: 0, bag: [], last: null, runLocalId: null, streak: 0, newBadges: [] };

// ---------- screens ----------
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  if (id === 'screen-menu') { renderBest(); renderBadgeCount(); }
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

// ---------- game flow ----------
function nextGame() {
  // Test hook: force a specific game (used by scripts/smoke_test.py).
  if (window.__TES_FORCE__) return GAMES.find(g => g.id === window.__TES_FORCE__);
  if (!state.bag.length) {
    state.bag = GAMES.slice().sort(() => Math.random() - 0.5);
    if (state.bag[0] === state.last && state.bag.length > 1) state.bag.push(state.bag.shift());
  }
  state.last = state.bag.shift();
  return state.last;
}

function startGame() {
  sfx.unlock();
  Object.assign(state, { round: 0, lives: MAX_LIVES, score: 0, results: [], startedAt: performance.now(), bag: [], last: null, runLocalId: null, streak: 0, newBadges: [] });
  $('#hud-score').textContent = '0';
  renderStreak();
  renderLives();
  music.setTempo(132);
  music.start();
  playRound();
}

function playRound() {
  state.round++;
  $('#hud-round').textContent = state.round;
  music.setTempo(132 + state.round * 4);
  music.duck(false);
  const game = nextGame();
  const seconds = roundSeconds(state.round);
  const stage = $('#stage');
  stage.innerHTML = '';
  stage.style.pointerEvents = '';
  show('screen-game');

  const svg = scene(game.bg);
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
    svg, stage, speed: 5.5 / seconds,
    win: () => finish(true),
    lose: () => finish(false),
    onTick: (fn) => tickers.push(fn),
    toSvg,
    buttons(list) {
      const row = document.createElement('div');
      row.className = 'choice-row';
      list.forEach(({ label, ok }) => {
        const b = document.createElement('button');
        b.className = 'btn' + (ok ? ' choice-ok' : ' choice-bad');
        b.textContent = label;
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); finish(ok); });
        row.appendChild(b);
      });
      stage.appendChild(row);
    },
    draggable(node, x, y, { scale = 1, onDrop } = {}) {
      const home = { x, y };
      let pos = { x, y }, grab = null;
      const put = (p, s = scale) => node.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${s})`);
      put(pos);
      node.classList.add('draggable');
      // generous invisible grab area
      const hit = document.createElementNS(svg.namespaceURI, 'circle');
      hit.setAttribute('r', 42); hit.setAttribute('fill', 'transparent');
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

  game.setup(ctx);

  // banner
  const banner = $('#banner');
  banner.textContent = game.prompt;
  banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
  sfx.go();

  // timer loop (starts after a short grace so players can read the prompt)
  const bar = $('#timer-bar');
  bar.style.transform = 'scaleX(1)';
  bar.classList.remove('urgent');
  const grace = 350;
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
  // Record the result immediately (the animations below are only cosmetic).
  state.results.push({ g: game.id, ok, ms: Math.round(ms) });
  const stage = $('#stage');
  const svg = stage.querySelector('svg');
  let bonus = 0;
  if (ok) {
    state.streak++;
    bonus = streakBonus(state.streak);
    const pts = pointsFor(state.round) + bonus;
    state.score += pts;
    floatText(stage, `+${pts}`);
    confetti(state.streak >= 3 ? 90 : 45);
    state.streak >= 3 ? sfx.streak(state.streak) : sfx.win();
  } else {
    state.streak = 0;
    state.lives--;
    navigator.vibrate?.([80, 40, 120]);
    shake(stage, 12);
    music.duck(true);
  }
  $('#hud-score').textContent = state.score;
  renderLives();
  renderStreak();

  if (ok) await wait(550);
  else {
    const snd = await playFail(game.id, svg);
    (sfx[snd] || sfx.lose)();
    await wait(1100);
  }

  const lesson = LESSONS[game.id];
  const card = $('#result-card');
  card.className = 'result-card ' + (ok ? 'win' : 'lose');
  $('#result-face').innerHTML = mascotSVG(ok ? 'happy' : 'sad');
  $('#result-title').textContent = ok ? pick(WIN_TITLES) : pick(FAIL_TITLES[failKind(game.id)]);
  $('#result-streak').textContent = ok && bonus ? `🔥 ${state.streak} in a row! +${bonus} bonus` : '';
  $('#result-tip').textContent = ok ? lesson.win : lesson.fail;
  show('screen-result');

  setTimeout(() => {
    if (state.lives <= 0) gameOver();
    else playRound();
  }, ok ? 1500 : 2300);
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function gameOver() {
  music.stop();
  sfx.over();
  const durationMs = Math.round(performance.now() - state.startedAt);
  state.runLocalId = api.queueRun({
    results: state.results.map(({ g, ok, ms }) => ({ g, ok, ms })),
    durationMs,
    appVersion: window.TES_CONFIG?.APP_VERSION
  });
  api.flush();

  try {
    const best = Number(localStorage.getItem('tes_best') || 0);
    if (state.score > best) localStorage.setItem('tes_best', String(state.score));
  } catch { /* ignore */ }

  state.newBadges = badges.evaluateRun(state.results, state.score);
  renderNewBadges();
  $('#over-score').textContent = state.score;
  const survived = state.results.filter(r => r.ok).length;
  $('#over-rounds').textContent = `You survived ${survived} of ${state.results.length} rounds.`;

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
  box.innerHTML = '<b>New badge' + (state.newBadges.length > 1 ? 's' : '') + '!</b>' +
    state.newBadges.map(b => `<span class="medal pop-in"><i>${b.icon}</i>${escapeHtml(b.name)}</span>`).join('');
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

// ---------- leaderboard ----------
async function showBoard(period = 'today') {
  show('screen-board');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.period === period));
  const list = $('#board-list'), msg = $('#board-msg');
  list.innerHTML = '';
  msg.textContent = 'Loading...';
  try {
    await api.flush();
    const data = await api.getLeaderboard(period);
    list.innerHTML = data.entries.map(e =>
      `<li class="${e.mine ? 'me' : ''}"><span class="n">${escapeHtml(e.name)}</span><span class="s">${e.score}</span></li>`).join('');
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- network status ----------
async function updateNet() {
  const pill = $('#net-status');
  try {
    await api.ping();
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
  $('#menu-mascot').innerHTML = mascotSVG('happy');
  renderBest();
  renderLearn();
  $('#btn-play').addEventListener('click', startGame);
  $('#btn-again').addEventListener('click', startGame);
  $('#btn-over-menu').addEventListener('click', () => { renderBest(); renderBadgeCount(); show('screen-menu'); });
  $('#btn-board').addEventListener('click', () => showBoard('today'));
  $('#btn-learn').addEventListener('click', () => {
    show('screen-learn');
    const fresh = badges.grantReader();
    if (fresh.length) { sfx.badge(); confetti(60, { x: .5, y: .15 }); }
  });
  $('#btn-badges').addEventListener('click', () => { renderBadges(); show('screen-badges'); });
  $('#btn-share').addEventListener('click', doShare);
  document.querySelectorAll('[data-mute]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation(); sfx.unlock(); toggleMute(); setMuteIcons();
  }));
  setMuteIcons();
  renderBadgeCount();
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => show('screen-menu')));
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showBoard(t.dataset.period)));
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
  window.__TES__ = { state, GAMES, roundSeconds, pointsFor, streakBonus };
}

init();
