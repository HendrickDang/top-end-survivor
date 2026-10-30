// Judge's tour: a 60-second guided walk through everything, with live numbers from the server.
// Open with the "Judges" link on the menu or ?judge=1 (print that as a QR for the judging table).
import * as api from './api.js';
import { NS, person } from './art.js';
import { townName } from './towns.js';
import { GAMES } from './games.js';
import { characterSVG } from './characters.js';
import { BADGES } from './badges.js';
import { LOCATION_COUNT } from './locations.js';

const $ = (s) => document.querySelector(s);
let app = null, step = 0;
const pct = (x) => (x == null ? '-' : Math.round(x * 100) + '%');

function outfits() {
  const looks = [
    { hat: 'croc', shirt: 'stinger', specs: 'none', skin: 1 },
    { hat: 'crown', shirt: 'gold', specs: 'sunnies', skin: 3 },
    { hat: 'firehelmet', shirt: 'hivis', specs: 'none', skin: 0 },
    { hat: 'party', shirt: 'hawaii', specs: 'heart', skin: 4 }
  ];
  const wrap = document.createElement('div');
  wrap.className = 'judge-looks';
  for (const o of looks) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-36 -124 72 132'); svg.setAttribute('width', 60); svg.setAttribute('height', 100);
    svg.appendChild(person({ outfit: o }));
    wrap.appendChild(svg);
  }
  return wrap.outerHTML;
}

// Three of the Territory Characters players unlock with coins.
const characters = () => `<div class="judge-looks judge-chars">${['craig', 'cheryl', 'mick'].map(id => `<div>${characterSVG(id, 'idle')}</div>`).join('')}</div>`;

// Locals vs visitors: overall fail rate for each group, once there is enough data.
function groupKpi(g) {
  const o = g && g.overall;
  if (!o || !o.local || !o.visitor || o.local.plays < 5 || o.visitor.plays < 5) return '';
  return `<div><b>${pct(o.visitor.failRate)} vs ${pct(o.local.failRate)}</b><span>rounds failed by visitors vs locals</span></div>`;
}

const STEPS = [
  {
    title: 'Top End Survivor',
    async body() {
      const hazards = GAMES.filter(g => !g.boss).length, bosses = GAMES.filter(g => g.boss).length;
      return `<p><b>The problem:</b> newcomers, students and tourists in the NT rarely read safety PDFs, but the Top End's hazards are deadly and seasonal.</p>
        <p><b>Our answer:</b> ${hazards} five-second mini-games and ${bosses} boss rounds. Every one is built from official NT advice (NT Government, NT Health, SecureNT, NTPFES) and links to its source.</p>
        <p class="judge-big">Fail, laugh, learn the real rule.</p>`;
    }
  },
  {
    title: 'See it play',
    async body() {
      return `<div class="judge-demo"><div class="judge-phone"><iframe src="./?demo=1" title="Game demo" tabindex="-1"></iframe></div></div>
        <p class="small">Self-playing demo. On the day, the booth screen switches to this when nobody is playing.</p>`;
    }
  },
  {
    title: 'Is it actually teaching?',
    async body() {
      try {
        const st = await api.getStats('all');
        const l = st.learning || {}, q = st.quiz || {};
        return `<div class="judge-kpis">
            <div><b>${pct(l.afterFail)}</b><span>fail a hazard, then survive it the next time (after seeing the real rule)</span></div>
            <div><b>${pct(l.firstTry)} → ${pct(l.laterTries)}</b><span>survival on a hazard, first time → later tries, at the same speed</span></div>
            <div><b>${q.n ? pct(q.preAvg) + ' → ' + pct(q.postAvg) : '-'}</b><span>optional safety check, before → after one game (${Number(q.n) || 0} players)</span></div>
            ${groupKpi(st.groups)}
          </div>
          <p class="small">Live from ${Number(st.rounds) || 0} rounds played by ${Number(st.players) || 0} players. Measured with no extra effort from players, plus an optional 3-question check and an optional "local or visitor?" tap.</p>
          <ul class="judge-list"><li>🏫 <b>Classroom mode:</b> a teacher gets a class code and a live report of the hazards their class misses, with before → after quiz scores (<a href="class.html" target="_blank" rel="noopener">try it</a>)</li></ul>`;
      } catch { return '<p>Live numbers appear here when the server is online.</p>'; }
    }
  },
  {
    title: 'Built to bring people back',
    async body() {
      let towns = '';
      try {
        const t = await api.getTowns('all');
        towns = t.entries.slice(0, 3).map((e, i) => `${['🥇', '🥈', '🥉'][i]} ${app.escapeHtml(townName(e.town))} ${Number(e.points) || 0}`).join(' · ');
      } catch { /* offline */ }
      return `<ul class="judge-list">
          <li>🗺️ <b>Journey:</b> a road trip from Darwin to Uluru, ${LOCATION_COUNT} stops, each with its own landscape and local hazards</li>
          <li>⚔️ <b>Live Booth Battle:</b> everyone at the booth scans a code and races the same 5 hazards, live on the big screen</li>
          <li>🔥 <b>Hard mode:</b> 40% less time, no hints, shuffled answers and its own leaderboard, plus 🦘 <b>Roos at Dusk</b>, a one-button rhythm runner on the Stuart Highway, and <b>Roo Run</b>, its endless, faster-every-roo version with its own leaderboard</li>
          <li>📅 <b>Daily Challenge:</b> same hazards for everyone each day, emoji result to share, day streaks</li>
          <li>⚔️ <b>Challenge a mate:</b> a link that says "Beat my 820"</li>
          <li>📍 <b>Town Battle:</b> ${towns || 'towns compete on the booth map'}</li>
          <li>🪙 <b>Coins</b> from every game unlock 7 cheeky Territory Characters:</li>
        </ul>${characters()}
        <ul class="judge-list"><li>🏅 <b>${BADGES.length} badges</b> that unlock gear they wear in every mini-game:</li></ul>${outfits()}
        <p class="small">For everyone: a ghost hand shows first-timers how to play, Relaxed mode gives kids and older players more time and bigger text, and 🆘 Real help lists checked NT emergency numbers. Installable on any phone, plays fully offline, Android app from the same code.</p>`;
    }
  },
  {
    title: 'Engineered to scale',
    async body() {
      let lt = null;
      try { lt = await (await fetch('./load-test.json', { cache: 'no-store' })).json(); } catch { /* not run yet */ }
      const load = lt ? `<div class="judge-kpis">
          <div><b>${lt.players}</b><span>simulated players</span></div>
          <div><b>${lt.requestsPerSecond}</b><span>requests per second</span></div>
          <div><b>${lt.p95ms} ms</b><span>95% of requests faster than</span></div>
          <div><b>${lt.errors}</b><span>errors</span></div>
        </div><p class="small">Load test: ${Number(lt.requests) || 0} requests, ${Number(lt.concurrency) || 0} at a time${lt.battles ? `, plus ${Number(lt.battles)} full Booth Battles (${Number(lt.battlePlayers) || 0} phones) racing at once, ${Number(lt.battlesFinished) || 0} of ${Number(lt.battles)} finished cleanly` : ''} (${app.escapeHtml(lt.where || '')}).</p>` : '';
      return `${load}<ul class="judge-list">
          <li>🛡️ Server re-scores every run, checks it follows the rules, and times it against its own clock (a game session started by the server); runs it can't verify still count for learning but stay off the boards</li>
          <li>📶 Offline first: runs queue on the phone and sync later (remote NT has patchy signal)</li>
          <li>🧪 Automated API tests (including lost replies, "slow down" responses and fake scores) + a robot that plays all ${GAMES.length} games and every mode in a real browser on every push, then builds the Android app</li>
          <li>⌨️ Every round can be played with a keyboard: Tab, Enter or Space, number keys for answers, arrow keys to drag</li>
          <li>⚔️ Booth Battles run in memory with server-side scoring; finished races still feed the learning stats</li>
          <li>🧩 One codebase for web, installable app and Android; SQLite behind one module, so a move to Postgres is contained work</li>
        </ul>`;
    }
  },
  {
    title: 'Team CAP003',
    async body() {
      return `<ul class="judge-list">
          <li><b>Van Hoi (Hendrick) Dang</b>: tech lead, server, data and analytics</li>
          <li><b>Le Nhat Minh Tran</b>: tech lead, testing and game tuning</li>
          <li><b>Phuong Vy Ho</b>: visuals, video and content</li>
        </ul>
        <p class="judge-big">Now have a go: can you survive the Top End? 🐊</p>
        <button class="btn btn-primary" id="judge-play">Play now</button>`;
    }
  }
];

async function render() {
  const s = STEPS[step];
  $('#judge-title').textContent = s.title;
  $('#judge-dots').innerHTML = STEPS.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('');
  $('#judge-body').innerHTML = '<p class="small">Loading...</p>';
  $('#judge-body').innerHTML = await s.body();
  $('#judge-prev').textContent = step === 0 ? 'Menu' : 'Back';
  $('#judge-next').textContent = step === STEPS.length - 1 ? 'Done' : 'Next';
  $('#judge-play')?.addEventListener('click', () => app.startGame('classic'));
  fitDemo();
}

// The demo is a full-size phone (390 x 760) shrunk to fit the window, so it looks the same everywhere.
function fitDemo() {
  const phone = document.querySelector('#judge-body .judge-phone');
  if (!phone) return;
  const h = Math.max(220, Math.min(480, window.innerHeight - 210));
  phone.style.width = `${Math.round(h * 390 / 760)}px`;
  phone.style.height = `${h}px`;
  phone.querySelector('iframe').style.transform = `scale(${h / 760})`;
}
addEventListener('resize', fitDemo);

export function openJudge() { step = 0; app.show('screen-judge'); render(); }

export function initJudge(a) {
  app = a;
  // Back steps through the tour; on the first step it goes back to the menu.
  $('#judge-prev').addEventListener('click', () => { if (step > 0) { step--; render(); } else app.show('screen-menu'); });
  $('#judge-next').addEventListener('click', () => { if (step < STEPS.length - 1) { step++; render(); } else app.show('screen-menu'); });
  $('#btn-judge').addEventListener('click', openJudge);
}
