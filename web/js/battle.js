// Live Booth Battle, phone side: join with the code from the big screen, wait in the lobby,
// count down together, race through the same 5 hazards, then see the podium.
// The booth screen (booth.html) hosts the battle; the server keeps score (server/src/battles.js).
import * as api from './api.js';
import { characterSVG, profile } from './characters.js';
import { GAME_ICONS, GAME_LABELS } from './lessons.js';
import { BATTLE_CODE_RE } from './groups.js';
import { sfx } from './sound.js';
import { confetti } from './fx.js';

const $ = (s) => document.querySelector(s);
const NAME_RE = /^[A-Za-z0-9 _-]{2,16}$/;
let app = null;   // { show, startGame, escapeHtml, kiosk, isDemo, getWho }
let me = null;    // { code, playerId, name }
let phase = null; // 'lobby' | 'count' | 'playing' | 'result'
let pollTimer = 0, countTimer = 0, homeTimer = 0, offset = 0, lastKey = '', celebrated = false, final = null;

export const inBattle = () => !!me;

export function initBattle(a) {
  app = a;
  $('#btn-battle').addEventListener('click', () => openJoin());
  $('#battle-join-form').addEventListener('submit', onJoin);
  $('#battle-cancel').addEventListener('click', () => { $('#battle-sheet').hidden = true; });
  $('#battle-leave').addEventListener('click', leave);
  $('#battle-menu').addEventListener('click', leave);
  $('#battle-again').addEventListener('click', () => { leave(); openJoin(); });
  $('#battle-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); });
}

export function openJoin(code = '') {
  $('#battle-code').value = String(code).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  let name = '';
  if (!app.kiosk) { try { name = localStorage.getItem('tes_name') || ''; } catch { /* ignore */ } }
  $('#battle-name').value = name;
  $('#battle-msg').textContent = '';
  $('#battle-sheet').hidden = false;
  ($('#battle-code').value.length === 4 ? $('#battle-name') : $('#battle-code')).focus();
}

async function onJoin(e) {
  e.preventDefault();
  const code = $('#battle-code').value.trim().toUpperCase();
  const name = $('#battle-name').value.trim().replace(/\s+/g, ' ');
  const msg = $('#battle-msg');
  if (!BATTLE_CODE_RE.test(code)) { msg.textContent = 'The code is the 4 letters on the big screen.'; return; }
  if (!NAME_RE.test(name)) { msg.textContent = 'Name: 2 to 16 letters, numbers, spaces, - or _.'; return; }
  msg.textContent = 'Joining...';
  sfx.unlock();
  try {
    const r = await api.battle.join(code, { name, character: profile.selected, who: app.getWho() || undefined });
    if (!app.kiosk) { try { localStorage.setItem('tes_name', name); } catch { /* ignore */ } }
    me = { code, playerId: r.playerId, name };
    $('#battle-sheet').hidden = true;
    sfx.coin();
    phase = 'lobby'; lastKey = ''; celebrated = false; final = null;
    view('lobby');
    $('#battle-title').textContent = `⚔️ Booth Battle ${code}`;
    $('#battle-status').textContent = `You're in, ${name}! Waiting for the booth to start...`;
    onState(r.battle);
    poll();
  } catch (err) {
    msg.textContent = err.status ? err.message : 'Could not reach the booth. Check your internet.';
  }
}

function view(v) {
  $('#screen-battle').dataset.view = v;
  app.show('screen-battle');
}

function leave() {
  clearTimeout(pollTimer); clearTimeout(countTimer); clearTimeout(homeTimer);
  me = null; phase = null;
  app.show('screen-menu');
}

function poll() {
  clearTimeout(pollTimer);
  if (!me) return;
  const code = me.code, t0 = Date.now();
  api.battle.get(code).then(({ battle }) => {
    if (!me || me.code !== code) return;
    offset = battle.now - (t0 + Date.now()) / 2; // server clock vs ours, for a fair countdown
    onState(battle);
  }).catch((err) => {
    if (err.status === 404 && me && phase !== 'playing') {
      $('#battle-status').textContent = 'That battle has closed. Join the next one!';
      $('#battle-wait').textContent = 'That battle has closed.';
      clearTimeout(pollTimer); me = null;
    }
  }).finally(() => {
    if (me && phase !== 'result-final') pollTimer = setTimeout(poll, phase === 'playing' ? 2000 : 1000);
  });
}

const esc = (s) => app.escapeHtml(s);

function playerList(b, { scores = false } = {}) {
  return b.players.map(p => `<li class="${p.id === me?.playerId ? 'me' : ''}">
      <span class="av">${characterSVG(p.character, 'idle')}</span>
      <span class="n">${scores ? `<i>#${p.rank}</i> ` : ''}${esc(p.name)}</span>
      ${scores ? `<span class="marks">${p.marks.map(ok => ok ? '🟩' : '🟥').join('')}</span><b>${p.score}</b>` : ''}
    </li>`).join('');
}

function onState(b) {
  if (phase === 'lobby') {
    if (b.status === 'lobby') {
      const key = b.players.map(p => p.id).join();
      if (key !== lastKey) { lastKey = key; $('#battle-players').innerHTML = playerList(b); }
    } else if (b.status === 'live') {
      startCountdown(b);
    } else {
      $('#battle-status').textContent = 'That battle finished before it reached you. Join the next one!';
    }
  } else if (phase === 'result') {
    showResult(b);
  }
}

function startCountdown(b) {
  phase = 'count';
  view('count');
  $('#battle-hazards').innerHTML = b.games.map(g => `<span title="${esc(GAME_LABELS[g] || g)}">${GAME_ICONS[g] || '❓'}</span>`).join('');
  const startLocal = b.startsAt - offset;
  let shown = '';
  const tick = () => {
    if (phase !== 'count') return;
    const left = startLocal - Date.now();
    if (left <= 0) {
      phase = 'playing';
      app.startGame('battle', null, { code: b.code, playerId: me.playerId, games: b.games });
      return;
    }
    const n = String(Math.ceil(left / 1000));
    if (n !== shown) { shown = n; $('#battle-count').textContent = n; sfx.tick(); }
    countTimer = setTimeout(tick, 80);
  };
  tick();
}

// main.js calls this after every round, so the booth screen can show the race live.
export function sendProgress(results) {
  if (!me) return;
  const { code, playerId } = me;
  const body = results.map(({ g, ok, ms }) => ({ g, ok, ms }));
  const attempt = (n) => api.battle.progress(code, playerId, body)
    .then(({ battle }) => { if (phase === 'result') showResult(battle); })
    .catch((e) => { if (!e.status && n < 4) setTimeout(() => attempt(n + 1), 800); });
  attempt(0);
}

// main.js calls this when all 5 rounds are played.
export function finish(state) {
  phase = 'result';
  final = { score: state.score, wins: state.results.filter(r => r.ok).length, rounds: state.results.length };
  view('result');
  $('#battle-you').innerHTML = `You scored <b>${final.score}</b> · survived ${final.wins} of ${final.rounds}`;
  $('#battle-wait').textContent = 'Waiting for everyone to finish...';
  $('#battle-podium').innerHTML = '';
  $('#battle-standings').innerHTML = '';
  sendProgress(state.results);
  poll();
}

function showResult(b) {
  if (!me) return;
  const mine = b.players.find(p => p.id === me.playerId);
  $('#battle-standings').innerHTML = playerList(b, { scores: true });
  if (b.status !== 'done') {
    const done = b.players.filter(p => p.done).length;
    $('#battle-wait').textContent = `Waiting for everyone to finish... ${done} of ${b.players.length} done`;
    return;
  }
  if (celebrated) return;
  celebrated = true;
  phase = 'result-final';
  clearTimeout(pollTimer);
  const top = b.players.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  $('#battle-podium').innerHTML = order.map(p => `<div class="pod pod-${p.rank}">
      <div class="av">${characterSVG(p.character, 'win')}</div>
      <b>${['🥇', '🥈', '🥉'][p.rank - 1]} ${esc(p.name)}</b><span>${p.score}</span>
    </div>`).join('');
  if (mine && mine.rank === 1) {
    $('#battle-wait').textContent = '🏆 You won the Booth Battle!';
    sfx.fanfare(); confetti(160, { x: .5, y: .3 });
  } else {
    $('#battle-wait').textContent = mine ? `You came #${mine.rank} of ${b.players.length}. So close!` : 'Battle over!';
    sfx.over();
  }
  // Shared booth phones go back to the menu for the next person.
  if (app.kiosk) homeTimer = setTimeout(() => { if (phase === 'result-final') leave(); }, 30000);
}
