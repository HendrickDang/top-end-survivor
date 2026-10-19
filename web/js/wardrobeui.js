// Wardrobe screen: pick your hat, shirt and specs. Locked gear shows which badge unlocks it.
// Skin and the default shirt colour come from the Territory Character you play as.
import { NS, person, setOutfit } from './art.js';
import { profile } from './characters.js';
import { GEAR, current, save, isUnlocked } from './wardrobe.js';
import { BADGES, unlocked } from './badges.js';
import { sfx } from './sound.js';

const $ = (s) => document.querySelector(s);
let app = null, tab = 'hat';

function mini(outfit, w = 70, h = 110) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-36 -124 72 132');
  svg.setAttribute('width', w); svg.setAttribute('height', h);
  svg.appendChild(person({ outfit, mood: 'happy' }));
  return svg;
}

// The look every person() in the games wears: character skin + shirt, plus wardrobe gear.
export function look() {
  const c = profile.character;
  return { ...current(), skin: c.skin, ownShirt: c.shirt };
}
export function applyLook() { setOutfit(look()); }

export function renderWardrobe() {
  const o = look();
  setOutfit(o);
  $('#wardrobe-who').textContent = `Dressing ${profile.character.name}. Swap characters in the Characters screen.`;
  const prev = $('#wardrobe-preview');
  prev.innerHTML = '';
  prev.appendChild(mini(o, 150, 230));
  document.querySelectorAll('.wtab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const got = unlocked();
  const grid = $('#wardrobe-grid');
  grid.innerHTML = '';
  for (const item of GEAR[tab]) {
    const have = isUnlocked(item, got);
    const b = document.createElement('button');
    b.className = 'witem' + (o[tab] === item.id ? ' on' : '') + (have ? '' : ' locked');
    b.appendChild(mini({ ...o, [tab]: item.id }));
    const badge = item.badge && BADGES.find(x => x.id === item.badge);
    b.insertAdjacentHTML('beforeend', `<small>${have ? '' : '🔒 '}${app.escapeHtml(item.name)}</small>` +
      (have ? '' : `<em>${badge ? badge.icon + ' ' + app.escapeHtml(badge.name) : ''}</em>`));
    b.onclick = () => {
      if (!have) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); sfx.boing(); $('#wardrobe-hint').textContent = badge ? `Unlock with the "${badge.name}" badge: ${badge.hint}.` : ''; return; }
      save({ ...current(), [tab]: item.id }); sfx.pop(); $('#wardrobe-hint').textContent = ''; renderWardrobe();
    };
    grid.appendChild(b);
  }
}

export function initWardrobe(a) {
  app = a;
  applyLook();
  document.querySelectorAll('.wtab').forEach(t => t.addEventListener('click', () => { tab = t.dataset.tab; renderWardrobe(); }));
}
