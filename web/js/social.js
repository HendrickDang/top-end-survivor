// Challenge a mate + Town Battle.
import * as api from './api.js';
import { TOWNS, townName } from './towns.js';
import * as badges from './badges.js';
import { gearFor } from './wardrobe.js';
import { sfx } from './sound.js';
import { confetti, floatText, toast } from './fx.js';

const $ = (s) => document.querySelector(s);
let app = null;            // { show, startGame, escapeHtml, playUrl, isDemo }
let incoming = null;       // challenge from a ?vs= link
let passedTarget = false;

// ---------- badges earned outside a run ----------
export function celebrate(fresh) {
  if (!fresh.length) return;
  sfx.badge(); confetti(70, { x: .5, y: .2 });
  for (const b of fresh) {
    const gear = gearFor([b.id]).map(g => g.name).join(', ');
    toast(`<b>${b.icon} ${app.escapeHtml(b.name)}</b> badge unlocked!${gear ? `<br>New gear: ${app.escapeHtml(gear)}` : ''}`);
  }
}

// ---------- Town Battle ----------
export function getTown() { try { return localStorage.getItem('tes_town') || null; } catch { return null; } }
function saveTown(id) { try { localStorage.setItem('tes_town', id); } catch { /* ignore */ } }

export function renderTownChip() {
  const t = getTown();
  $('#town-chip').innerHTML = t ? `📍 Playing for <b>${app.escapeHtml(townName(t))}</b> · change` : '📍 Pick your town for the Town Battle';
}

export function openTownPicker(onPick) {
  const sheet = $('#town-sheet');
  const cur = getTown();
  $('#town-list').innerHTML = TOWNS.map(t =>
    `<button class="btn town-btn ${t.id === cur ? 'on' : ''}" data-town="${t.id}">${app.escapeHtml(t.name)}</button>`).join('');
  sheet.hidden = false;
  sheet.querySelectorAll('[data-town]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.town;
    saveTown(id);
    sheet.hidden = true;
    renderTownChip();
    celebrate(badges.grant1('town'));
    onPick && onPick(id);
  }));
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0); // numbers from the server, never HTML

export async function renderTownsBoard(list, msg) {
  const data = await api.getTowns('today');
  const mine = getTown();
  const max = Math.max(1, ...data.entries.map(e => e.points));
  list.innerHTML = data.entries.map(e => `
    <li class="${e.town === mine ? 'me' : ''}">
      <span class="n">${app.escapeHtml(townName(e.town))}<small>${num(e.players)} player${num(e.players) > 1 ? 's' : ''}</small>
        <i class="tbar" style="width:${Math.round(num(e.points) / max * 100)}%"></i></span>
      <span class="s">${num(e.points)}</span>
    </li>`).join('');
  msg.textContent = data.entries.length ? 'Each player\'s best score today counts for their town.' : 'No towns on the board yet. Put yours there!';
}

// ---------- Challenge a mate ----------
export async function loadIncoming(params) {
  const id = params.get('vs');
  if (!id || app.isDemo) return;
  try {
    incoming = await api.getChallenge(id);
    const daily = incoming.mode === 'daily' && incoming.day === incoming.today;
    $('#challenge-banner').hidden = false;
    const where = daily ? ' in today\'s Daily Challenge' : incoming.mode === 'journey' ? ' on the Journey' : '';
    $('#challenge-text').innerHTML = `⚔️ <b>${app.escapeHtml(incoming.name)}</b> challenged you!<br>Beat <b>${num(incoming.score)}</b> points${where}.`;
    incoming.useDaily = daily;
  } catch {
    $('#challenge-banner').hidden = true;
  }
}

export function acceptIncoming() {
  if (!incoming) return;
  $('#challenge-banner').hidden = true;
  app.startGame(incoming.useDaily ? 'daily' : incoming.mode === 'journey' ? 'journey' : 'classic', incoming);
}
export function dismissIncoming() { $('#challenge-banner').hidden = true; }

export function startRun(challenge) {
  passedTarget = false;
  const t = $('#hud-target');
  t.textContent = challenge ? `🎯 ${challenge.score}` : '';
  t.title = challenge ? `Beat ${challenge.name}` : '';
}

export function onScore(state) {
  if (!state.challenge || passedTarget || state.score <= state.challenge.score) return;
  passedTarget = true;
  floatText($('#stage'), `Passed ${state.challenge.name}!`, '#9fe870');
  sfx.coin();
  $('#hud-target').classList.add('beaten');
}

export function renderOverChallenge(state) {
  const box = $('#over-challenge');
  if (!state.challenge) { box.hidden = true; return; }
  const c = state.challenge, diff = state.score - c.score;
  box.hidden = false;
  box.innerHTML = diff > 0
    ? `<b>🏆 You beat ${app.escapeHtml(c.name)} by ${diff}!</b> Send it back and rub it in.`
    : diff === 0 ? `<b>🤝 Dead heat with ${app.escapeHtml(c.name)}!</b>`
      : `<b>😬 ${app.escapeHtml(c.name)} wins by ${-diff}.</b> <button class="btn btn-small" id="btn-rematch">Rematch</button>`;
  if (diff > 0) setTimeout(() => confetti(120, { x: .5, y: .3 }), 300);
  $('#btn-rematch')?.addEventListener('click', () => app.startGame(state.mode, c));
}

export async function sendChallenge(state) {
  const btn = $('#btn-challenge');
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Getting your link...';
  // Use the name in the box so your mate knows who to beat.
  const nameEl = $('#player-name');
  const name = (nameEl.value || '').trim().replace(/\s+/g, ' ');
  if (/^[A-Za-z0-9 _-]{2,16}$/.test(name)) api.setRunName(state.runLocalId, name);
  await api.flush();
  const st = api.runStatus(state.runLocalId);
  if (!st.serverId) {
    btn.textContent = st.state === 'rejected' ? 'This run could not be sent' : 'Needs internet: try again soon';
    setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 2500);
    return;
  }
  const url = app.playUrl().replace(/\/?$/, '/') + '?vs=' + st.serverId;
  const who = /^[A-Za-z0-9 _-]{2,16}$/.test(name) ? name : 'I';
  const text = `⚔️ ${who === 'I' ? 'I' : who} scored ${state.score} on Top End Survivor. Bet you can't beat it! 🐊`;
  let ok = false;
  try {
    if (navigator.share) { await navigator.share({ title: 'Top End Survivor challenge', text, url }); ok = true; }
    else { await navigator.clipboard.writeText(`${text} ${url}`); ok = true; toast('Challenge link copied! Paste it to your mates.'); }
  } catch (e) {
    if (e && e.name !== 'AbortError') {
      // clipboard blocked: show the link so it can be copied by hand
      $('#challenge-link').hidden = false;
      $('#challenge-link').value = url;
      ok = true;
    }
  }
  if (ok) celebrate(badges.grant1('challenger'));
  btn.textContent = old; btn.disabled = false;
}

export async function renderChallengeResults() {
  const box = $('#challenge-results');
  if (app.isDemo) { box.hidden = true; return; }
  try {
    const { entries } = await api.getChallengeResults();
    if (!entries.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<b>⚔️ Your challenges</b>' + entries.slice(0, 3).map(e =>
      `<div>${e.beatYou ? '😱' : '🛡️'} ${app.escapeHtml(e.challenger)} ${e.beatYou ? `beat your ${num(e.yourScore)} with <b>${num(e.theirScore)}</b>` : `tried to beat your ${num(e.yourScore)} (got ${num(e.theirScore)})`}</div>`).join('');
  } catch { box.hidden = true; }
}

export function initSocial(a) {
  app = a;
  renderTownChip();
  $('#town-chip').addEventListener('click', () => openTownPicker());
  $('#town-close').addEventListener('click', () => { $('#town-sheet').hidden = true; });
  $('#btn-accept').addEventListener('click', acceptIncoming);
  $('#btn-decline').addEventListener('click', dismissIncoming);
}
