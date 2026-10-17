// Visual "juice": confetti, screen shake, floating text and a cartoon fail animation per mini-game.
// Everything is drawn in code. Animations use the Web Animations API, so no extra libraries.
import { el, g, text, VIEW } from './art.js';

const W = VIEW.w, H = VIEW.h;
const INK = '#1d1a16';
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const anim = (node, frames, opts) => {
  if (!node.animate) return { finished: Promise.resolve() };
  node.style.transformBox = 'fill-box';
  node.style.transformOrigin = opts.origin || 'center';
  return node.animate(frames, { fill: 'forwards', easing: 'ease-out', ...opts });
};

// ---------- screen shake ----------
export function shake(target, strength = 10) {
  if (reduced() || !target.animate) return;
  const s = strength;
  target.animate([
    { transform: 'translate(0,0)' }, { transform: `translate(${-s}px,${s / 2}px) rotate(-1deg)` },
    { transform: `translate(${s}px,${-s / 2}px) rotate(1deg)` }, { transform: `translate(${-s / 2}px,${s / 3}px)` },
    { transform: `translate(${s / 2}px,0)` }, { transform: 'translate(0,0)' }
  ], { duration: 380, easing: 'ease-out' });
}

// ---------- confetti (canvas overlay on the whole app) ----------
let canvas = null, parts = [], running = false;
const COLORS = ['#e0892e', '#ffd25e', '#4f8a3c', '#2f7fd0', '#c8412f', '#f28ab2', '#fffaf0'];
export function confetti(amount = 60, origin = { x: 0.5, y: 0.35 }) {
  if (reduced()) return;
  const app = document.getElementById('app');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    app.appendChild(canvas);
  }
  const r = app.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = r.width * dpr; canvas.height = r.height * dpr;
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let i = 0; i < amount; i++) {
    const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
    parts.push({
      x: origin.x * r.width, y: origin.y * r.height, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6,
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - .5) * .4,
      col: COLORS[i % COLORS.length], life: 70 + Math.random() * 40
    });
  }
  if (running) return;
  running = true;
  const step = () => {
    c.clearRect(0, 0, r.width, r.height);
    parts = parts.filter(p => p.life > 0 && p.y < r.height + 20);
    for (const p of parts) {
      p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = Math.min(1, p.life / 20);
      c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();
    }
    if (parts.length) requestAnimationFrame(step);
    else { running = false; c.clearRect(0, 0, r.width, r.height); }
  };
  requestAnimationFrame(step);
}

// ---------- floating "+120" text over the stage ----------
export function floatText(stage, str, color = '#ffe9a8') {
  const d = document.createElement('div');
  d.className = 'float-text';
  d.textContent = str;
  d.style.color = color;
  stage.appendChild(d);
  setTimeout(() => d.remove(), 1100);
}

// ---------- cartoon fail animations ----------
function bigWord(svg, word, color = '#fffaf0', y = 120) {
  const t = text(W / 2, y, word, { size: 44, fill: color, stroke: INK, strokeWidth: 8 });
  svg.appendChild(t);
  anim(t, [
    { transform: 'scale(0.2) rotate(-12deg)', opacity: 0 },
    { transform: 'scale(1.25) rotate(4deg)', opacity: 1, offset: .45 },
    { transform: 'scale(1) rotate(-2deg)', opacity: 1 }
  ], { duration: 520, easing: 'cubic-bezier(.2,1.6,.4,1)' });
}

function jaws() {
  const teeth = (y, dir) => {
    const pts = [];
    for (let x = 10; x < W - 10; x += 28) pts.push(`M${x} ${y} l14 ${dir * 22} l14 ${-dir * 22}`);
    return el('path', { d: pts.join(' '), fill: '#fffaf0', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' });
  };
  const upper = g([
    el('path', { d: `M-20 -260 H${W + 20} V0 Q${W / 2} 30 -20 0 Z`, fill: '#4f7a33', stroke: INK, 'stroke-width': 5 }),
    el('circle', { cx: 90, cy: -40, r: 22, fill: '#ffe066', stroke: INK, 'stroke-width': 4 }),
    el('circle', { cx: 270, cy: -40, r: 22, fill: '#ffe066', stroke: INK, 'stroke-width': 4 }),
    el('rect', { x: 86, y: -58, width: 8, height: 36, rx: 4, fill: INK }),
    el('rect', { x: 266, y: -58, width: 8, height: 36, rx: 4, fill: INK }),
    teeth(4, 1)
  ]);
  const lower = g([
    el('path', { d: `M-20 260 H${W + 20} V0 Q${W / 2} -30 -20 0 Z`, fill: '#5d8c3d', stroke: INK, 'stroke-width': 5 }),
    teeth(-4, -1)
  ]);
  return { upper, lower };
}

const FAILS = {
  async chomp(svg) {
    const { upper, lower } = jaws();
    const ug = g([upper]), lg = g([lower]);
    svg.append(ug, lg);
    ug.setAttribute('transform', `translate(0 ${-10})`);
    lg.setAttribute('transform', `translate(0 ${H + 10})`);
    const a1 = ug.animate?.([{ transform: 'translate(0px,-10px)' }, { transform: `translate(0px,${H / 2}px)` }], { duration: 330, easing: 'cubic-bezier(.6,0,.9,.5)', fill: 'forwards' });
    lg.animate?.([{ transform: `translate(0px,${H + 10}px)` }, { transform: `translate(0px,${H / 2}px)` }], { duration: 330, easing: 'cubic-bezier(.6,0,.9,.5)', fill: 'forwards' });
    await (a1 ? a1.finished : wait(330));
    bigWord(svg, "CROC'D IT!", '#ffd25e', 90);
    return 'chomp';
  },
  async zap(svg) {
    const jelly = g([
      el('path', { d: 'M-50 0 Q-50 -60 0 -60 Q50 -60 50 0 Q25 10 0 0 Q-25 10 -50 0 Z', fill: 'rgba(242,138,178,.75)', stroke: INK, 'stroke-width': 4 }),
      el('circle', { cx: -16, cy: -28, r: 5, fill: INK }), el('circle', { cx: 16, cy: -28, r: 5, fill: INK }),
      el('path', { d: 'M-12 -14 q12 10 24 0', stroke: INK, 'stroke-width': 3, fill: 'none' }),
      ...[-36, -18, 0, 18, 36].map(x => el('path', { d: `M${x} 4 q8 20 0 40 q-8 20 0 40`, stroke: '#c55a8a', 'stroke-width': 4, fill: 'none' }))
    ]);
    const jg = g([jelly], { transform: `translate(${W / 2} -80)` });
    svg.appendChild(jg);
    jg.animate?.([{ transform: `translate(${W / 2}px,-80px)` }, { transform: `translate(${W / 2}px,200px)` }], { duration: 380, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' });
    await wait(330);
    const bolts = g([0, 1, 2, 3].map(i => el('path', {
      d: 'M0 0 l-14 34 h16 l-12 38 l34 -50 h-18 l12 -22 z', fill: '#ffe066', stroke: INK, 'stroke-width': 3,
      transform: `translate(${60 + i * 80} ${250 + (i % 2) * 40}) rotate(${i * 20 - 30})`
    })));
    svg.appendChild(bolts);
    const flash = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fffaf0', opacity: 0 });
    svg.appendChild(flash);
    flash.animate?.([{ opacity: .8 }, { opacity: 0 }, { opacity: .6 }, { opacity: 0 }], { duration: 320, fill: 'forwards' });
    bigWord(svg, 'ZAPPED!', '#f28ab2', 110);
    return 'zap';
  },
  async blowaway(svg) {
    const kids = [...svg.children];
    const swirl = el('path', { d: 'M0 0 m-80 0 a80 80 0 1 1 80 80 a50 50 0 1 1 -40 -50 a25 25 0 1 1 20 25', stroke: '#6a5aa8', 'stroke-width': 12, fill: 'none', 'stroke-linecap': 'round' });
    const sg = g([swirl], { transform: `translate(${W / 2} ${H / 2})` });
    svg.appendChild(sg);
    anim(swirl, [{ transform: 'scale(.2) rotate(0deg)', opacity: 0 }, { transform: 'scale(1.6) rotate(720deg)', opacity: .9 }], { duration: 800 });
    kids.forEach((k0, i) => {
      let k = k0;
      if (i === 0) return; // keep the background
      // wrap so the CSS animation doesn't wipe the element's own SVG transform
      const w = g([]); svg.insertBefore(w, k0); w.appendChild(k0); k = w;
      const dx = (i % 2 ? 1 : -1) * (200 + Math.random() * 200), dy = -150 - Math.random() * 300;
      anim(k, [{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${dx}px,${dy}px) rotate(${(Math.random() - .5) * 900}deg)`, opacity: 0 }], { duration: 700 + Math.random() * 200, delay: i * 25, easing: 'ease-in' });
    });
    await wait(350);
    bigWord(svg, 'BLOWN AWAY!', '#d9d2f0', 110);
    return 'whoosh';
  },
  async float(svg) {
    const flood = g([
      el('rect', { x: -20, y: 0, width: W + 40, height: H, fill: 'rgba(47,127,143,.85)' }),
      el('path', { d: `M-20 0 q25 -16 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0`, stroke: '#fffaf0', 'stroke-width': 6, fill: 'none', opacity: .7 })
    ]);
    svg.appendChild(flood);
    flood.animate?.([{ transform: `translate(0px,${H}px)` }, { transform: `translate(0px,${H * .35}px)` }], { duration: 600, easing: 'ease-out', fill: 'forwards' });
    for (let i = 0; i < 10; i++) {
      const b = el('circle', { cx: 40 + Math.random() * 280, cy: H, r: 4 + Math.random() * 8, fill: 'none', stroke: '#fffaf0', 'stroke-width': 3 });
      svg.appendChild(b);
      b.animate?.([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(0,-${200 + Math.random() * 200}px)`, opacity: 0 }], { duration: 900, delay: 200 + i * 60, fill: 'forwards' });
    }
    // a little "help!" sign bobbing on the water
    const bob = g([
      el('rect', { x: -40, y: -24, width: 80, height: 34, rx: 6, fill: '#fffaf0', stroke: INK, 'stroke-width': 3 }),
      text(0, 0, 'HELP!', { size: 18, fill: '#c8412f' })
    ]);
    svg.appendChild(g([bob], { transform: `translate(${W / 2} ${H * .37})` }));
    anim(bob, [{ transform: 'translateY(40px) rotate(-10deg)', opacity: 0 }, { transform: 'translateY(0) rotate(8deg)', opacity: 1, offset: .5 }, { transform: 'translateY(6px) rotate(-6deg)', opacity: 1 }], { duration: 900, delay: 300 });
    await wait(300);
    bigWord(svg, 'WASHED AWAY!', '#9fd8ef', 100);
    return 'splash';
  },
  async cooked(svg) {
    const red = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#c8412f', opacity: 0 });
    svg.appendChild(red);
    red.animate?.([{ opacity: 0 }, { opacity: .45 }, { opacity: .3 }, { opacity: .5 }], { duration: 900, fill: 'forwards' });
    for (let i = 0; i < 6; i++) {
      const s = el('path', { d: 'M0 0 q-12 -18 0 -36 q12 -18 0 -36', stroke: '#fffaf0', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round', opacity: .8 });
      const sg = g([s], { transform: `translate(${80 + i * 40} 330)` });
      svg.appendChild(sg);
      anim(s, [{ transform: 'translateY(0)', opacity: 0 }, { transform: 'translateY(-40px)', opacity: .9, offset: .4 }, { transform: 'translateY(-120px)', opacity: 0 }], { duration: 900, delay: i * 90 });
    }
    await wait(200);
    bigWord(svg, 'COOKED LIKE', '#ffd25e', 100);
    setTimeout(() => bigWord(svg, 'A SNAG!', '#ffd25e', 150), 180);
    return 'sizzle';
  },
  async dizzy(svg) {
    const kids = [...svg.children].slice(1);
    const wrap = g(kids);
    svg.appendChild(wrap);
    wrap.animate?.([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(0deg)' }], { duration: 900 });
    const stars = g([0, 1, 2, 3, 4].map(i => el('path', {
      d: 'M0 -14 L4 -4 L14 -4 L6 3 L9 14 L0 7 L-9 14 L-6 3 L-14 -4 L-4 -4 Z', fill: '#ffe066', stroke: INK, 'stroke-width': 2,
      transform: `rotate(${i * 72}) translate(70 0)`
    })));
    svg.appendChild(g([stars], { transform: `translate(${W / 2} 230)` }));
    anim(stars, [{ transform: 'rotate(0deg) scale(.3)' }, { transform: 'rotate(360deg) scale(1)' }], { duration: 900 });
    await wait(150);
    bigWord(svg, 'WRONG FIX!', '#ffd25e', 110);
    return 'boing';
  },
  async smoke(svg) {
    for (let i = 0; i < 14; i++) {
      const c = el('circle', { cx: Math.random() * W, cy: 80 + Math.random() * 380, r: 30 + Math.random() * 40, fill: ['#7d7268', '#968b80', '#a39a90'][i % 3] });
      svg.appendChild(c);
      anim(c, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(2.4)', opacity: .95 }], { duration: 700, delay: i * 35 });
    }
    await wait(400);
    bigWord(svg, 'SMOKED OUT!', '#ffd25e', 110);
    return 'whoosh';
  }
};

Object.assign(FAILS, {
  async struck(svg) {
    const dark = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#1d1a16', opacity: 0 });
    svg.appendChild(dark);
    dark.animate?.([{ opacity: 0 }, { opacity: .55 }], { duration: 200, fill: 'forwards' });
    const bolt = el('path', { d: 'M200 -10 L150 170 H195 L140 330 L250 140 H200 L250 -10 Z', fill: '#ffe066', stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' });
    svg.appendChild(bolt);
    bolt.animate?.([{ opacity: 0 }, { opacity: 1 }, { opacity: .2 }, { opacity: 1 }], { duration: 400, fill: 'forwards' });
    const flash = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fffaf0', opacity: 0 });
    svg.appendChild(flash);
    flash.animate?.([{ opacity: .9 }, { opacity: 0 }, { opacity: .7 }, { opacity: 0 }], { duration: 450, fill: 'forwards' });
    await wait(250);
    bigWord(svg, 'FRAZZLED!', '#ffe066', 400);
    return 'struck';
  },
  async bitten(svg) {
    for (let i = 0; i < 40; i++) {
      const d = el('circle', { cx: 120 + Math.random() * 120, cy: 200 + Math.random() * 150, r: 3 + Math.random() * 4, fill: '#c8412f', stroke: INK, 'stroke-width': 1 });
      svg.appendChild(d);
      d.animate?.([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 200, delay: i * 18, fill: 'forwards' });
    }
    await wait(250);
    bigWord(svg, 'ITCHY!', '#f28ab2', 120);
    return 'buzz';
  },
  async sunburnt(svg) {
    const red = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#e2553f', opacity: 0 });
    svg.appendChild(red);
    red.animate?.([{ opacity: 0 }, { opacity: .5 }, { opacity: .35 }, { opacity: .55 }], { duration: 900, fill: 'forwards' });
    await wait(200);
    bigWord(svg, 'LOBSTER', '#ffd25e', 110);
    setTimeout(() => bigWord(svg, 'MODE!', '#ffd25e', 160), 180);
    return 'sizzle';
  }
});

const FAIL_FOR = {
  'croc-edge': 'chomp', 'swim-sign': 'chomp', 'croc-camp': 'chomp',
  'stinger-vinegar': 'zap', 'stinger-suit': 'zap',
  'cyclone-kit': 'blowaway', 'flood-road': 'float', 'heat-drink': 'cooked',
  'snake-bite': 'dizzy', 'bushfire-leave': 'smoke',
  'lightning-pool': 'struck', 'mozzie-dusk': 'bitten', 'sun-slip': 'sunburnt',
  'boss-cyclone': 'blowaway', 'boss-croc': 'chomp'
};

// Plays the cartoon fail for a game. Returns the name of the matching sound effect.
export async function playFail(gameId, svg) {
  const kind = FAIL_FOR[gameId] || 'chomp';
  if (reduced()) { bigWord(svg, 'OOPS!'); return 'lose'; }
  try { return await FAILS[kind](svg); } catch { return 'lose'; }
}

// Cheeky, kid-safe titles shown on the result card.
export const FAIL_TITLES = {
  chomp: ["Croc'd it!", 'Snapped, mate!', 'Croc lunch!'],
  zap: ['Zapped!', 'Stung, mate!', 'Jelly jolt!'],
  blowaway: ['Blown away!', 'Gone with the wind!', 'Kit fail!'],
  float: ['Washed away!', 'Sunk, mate!', 'Glug glug!'],
  cooked: ['Cooked like a snag!', 'Fried, mate!', 'Toasty!'],
  dizzy: ['Wrong fix, mate!', 'Yikes!', 'Not like that!'],
  smoke: ['Smoked out!', 'Too slow, mate!', 'Should have left!'],
  struck: ['Frazzled!', 'Zapped from above!', 'Shocking, mate!'],
  bitten: ['Eaten alive!', 'Itchy, mate!', 'Mozzie buffet!'],
  sunburnt: ['Lobster mode!', 'Burnt to a crisp!', 'Ouch, sunburn!']
};
export const WIN_TITLES = ['Too easy!', 'Crocwise!', 'Legend!', 'Bonza!', 'Ripper!', 'Spot on, mate!'];
export const failKind = (gameId) => FAIL_FOR[gameId] || 'chomp';
