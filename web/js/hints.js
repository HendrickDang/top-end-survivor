// Gesture hints for first-timers: a ghost hand shows HOW to play a mini-game (tap, keep tapping,
// drag, or pick a button) the first time someone meets it. At a busy booth most early fails come
// from not knowing what to do, not from not knowing the rule, so the hint never shows the answer:
// it points at the gesture, and only follows a path when there is just one thing to drag.
import { el } from './art.js';

// kind: 'tap' | 'taps' (keep tapping) | 'drag' | 'pick' (buttons at the bottom)
// at: where to tap, from/to: drag path (SVG units, 360 x 480). Leave them out to show the gesture only.
export const HINTS = {
  'croc-edge': { kind: 'taps', text: 'Tap fast to step back', at: [180, 300] },
  'swim-sign': { kind: 'pick', text: 'Pick an answer' },
  'croc-camp': { kind: 'drag', text: 'Drag the tent past the line', from: [200, 365], to: [200, 110] },
  'stinger-vinegar': { kind: 'drag', text: 'Drag the right bottle onto the sting' },
  'stinger-suit': { kind: 'tap', text: 'Tap what to wear' },
  'cyclone-kit': { kind: 'tap', text: 'Tap the 3 things for your kit' },
  'flood-road': { kind: 'pick', text: 'Pick what to do' },
  'heat-drink': { kind: 'taps', text: 'Keep tapping the water' },
  'snake-bite': { kind: 'drag', text: 'Drag the right first aid onto the bite' },
  'bushfire-leave': { kind: 'pick', text: 'Pick what to do' },
  'lightning-pool': { kind: 'tap', text: 'Tap every swimmer' },
  'mozzie-dusk': { kind: 'drag', text: 'Drag the right thing onto the camper' },
  'sun-slip': { kind: 'tap', text: 'Tap the 3 sun-safe things' },
  'croc-trap': { kind: 'tap', text: 'Tap once, when the croc is in the trap' },
  'rock-hole': { kind: 'drag', text: 'Drag each swimmer to the bank', from: [118, 262], to: [118, 432] },
  'dust-storm': { kind: 'drag', text: 'Drag the ute off the road', from: [180, 380], to: [62, 380] },
  'flash-flood': { kind: 'taps', text: 'Tap fast to climb the bank', at: [180, 300] },
  'roo-dusk': { kind: 'tap', text: 'Hold to brake for roos, let go to drive', at: [180, 240] },
  'boss-cyclone': { kind: 'pick', text: 'Pick the safe choice, 3 times' },
  'boss-croc': { kind: 'pick', text: 'Pick the safe choice, 3 times' }
};
export const HINT_GRACE_MS = 1100; // extra time before the timer starts when a hint shows

const KEY = 'tes_hints_seen_v1';
const ICON = { tap: '👆', taps: '👆', drag: '✋', pick: '👇' };
let runSeen = new Set();

const loadSeen = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const saveSeen = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };

// Call at the start of every run.
export function resetRun() { runSeen = new Set(); }

// Shared devices (kiosk) and relaxed mode: hint each game the first time in every run.
// Everyone else: only the first time ever on this device.
export function needHint(gameId, { perRun = false } = {}) {
  if (!HINTS[gameId] || runSeen.has(gameId)) return false;
  return perRun || !loadSeen()[gameId];
}

export function showHint(ctx, gameId) {
  const h = HINTS[gameId];
  runSeen.add(gameId);
  const seen = loadSeen(); seen[gameId] = 1; saveSeen(seen);

  const badge = document.createElement('div');
  badge.className = `hint-badge hint-${h.kind}`;
  badge.setAttribute('role', 'status');
  const [verb, ...rest] = h.text.split(' ');
  badge.innerHTML = `<span class="hint-hand" aria-hidden="true">${ICON[h.kind]}</span><span><b>${verb}</b> ${rest.join(' ')}</span>`;
  ctx.stage.appendChild(badge);

  // A ghost hand in the scene when there is a clear spot or a single thing to drag.
  let ghost = null, raf = 0;
  const point = h.at || h.from;
  if (point) {
    ghost = el('g', { class: 'hint-ghost', 'pointer-events': 'none' }, [
      el('circle', { r: 26, fill: 'rgba(255,250,240,.55)', stroke: '#1d1a16', 'stroke-width': 3, 'stroke-dasharray': '6 5' }),
      el('text', { x: 4, y: 30, 'font-size': 42, 'text-anchor': 'middle', text: ICON[h.kind] })
    ]);
    ctx.svg.appendChild(ghost);
    const t0 = performance.now();
    const step = (now) => {
      const t = ((now - t0) % 1200) / 1200;
      let [x, y] = point, s = 1;
      if (h.kind === 'drag' && h.to) {
        const k = Math.min(1, t / .75); const e = k * k * (3 - 2 * k);
        x = h.from[0] + (h.to[0] - h.from[0]) * e; y = h.from[1] + (h.to[1] - h.from[1]) * e;
      } else {
        s = 1 - 0.18 * Math.sin(Math.min(1, t / .35) * Math.PI); // a quick press
      }
      ghost.setAttribute('transform', `translate(${x} ${y}) scale(${s})`);
      ghost.setAttribute('opacity', h.kind === 'drag' && t > .85 ? 0 : 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  let gone = false;
  const hide = () => {
    if (gone) return;
    gone = true;
    cancelAnimationFrame(raf);
    ghost?.remove();
    badge.classList.add('out');
    setTimeout(() => badge.remove(), 300);
    ctx.stage.removeEventListener('pointerdown', hide, true);
  };
  ctx.stage.addEventListener('pointerdown', hide, true);
  setTimeout(hide, 2800);
  return HINT_GRACE_MS;
}
