// Tiny SVG toolkit + original character art for Top End Survivor.
// All art is drawn in code (no image files) so the game stays small and works offline.

export const NS = 'http://www.w3.org/2000/svg';
export const VIEW = { w: 360, h: 480 };

export function el(tag, attrs = {}, children = []) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) n.appendChild(c);
  return n;
}

export function scene(bg = '#f6e7c8') {
  return el('svg', {
    class: 'scene', viewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
    preserveAspectRatio: 'xMidYMid meet', style: `background:${bg}`
  });
}

export function g(children = [], attrs = {}) { return el('g', attrs, children); }

export function text(x, y, str, opts = {}) {
  return el('text', {
    x, y, text: str, 'text-anchor': opts.anchor || 'middle',
    'font-family': "'Baloo 2', 'Trebuchet MS', sans-serif",
    'font-weight': opts.weight || 800, 'font-size': opts.size || 18,
    fill: opts.fill || '#1d1a16', stroke: opts.stroke, 'stroke-width': opts.strokeWidth,
    'paint-order': 'stroke', 'pointer-events': 'none'
  });
}

const INK = '#1d1a16';
export const SKIN = ['#5c3a1e', '#8d5524', '#c68642', '#e0ac69', '#f1c27d'];

// The player's chosen look (set from wardrobeui.js). Every person() in the games wears it.
// skin is an index into SKIN or a colour; shirt 'own' means the character's own shirt colour.
let OUTFIT = { skin: null, hat: 'bush', shirt: 'own', specs: 'none', ownShirt: '#e0892e' };
export function setOutfit(o) { OUTFIT = { ...OUTFIT, ...o }; }

const SHIRTS = {
  orange: { fill: '#e0892e' }, blue: { fill: '#2f7fd0' }, green: { fill: '#4f8a3c' },
  stinger: { fill: '#2f7fd0', legs: '#2f7fd0', sleeves: '#2f7fd0' },
  hivis: { fill: '#e8ff3a', stripes: '#c9c9c9' },
  lifesaver: { fill: '#c8412f', half: '#ffd25e' },
  firstaid: { fill: '#fffaf0', cross: '#c8412f' },
  longs: { fill: '#f3efe2', sleeves: '#f3efe2', legs: '#d9cfb3' },
  territory: { fill: '#e0892e', band: '#1d1a16' },
  hawaii: { fill: '#17a2a2', dots: '#ffd25e' },
  racing: { fill: '#1d1a16', stripes: '#ffd25e' },
  gold: { fill: '#e6b422', shine: '#fff2b0' },
  cooling: { fill: '#9fd8ef', drop: '#2f7fd0' }
};

function shirtParts(kind, colorOverride) {
  const sh = SHIRTS[kind] || { fill: colorOverride || '#e0892e' };
  const p = [];
  if (sh.sleeves) {
    p.push(el('rect', { x: -26, y: -48, width: 10, height: 26, rx: 5, fill: sh.sleeves, stroke: INK, 'stroke-width': 3 }));
    p.push(el('rect', { x: 16, y: -48, width: 10, height: 26, rx: 5, fill: sh.sleeves, stroke: INK, 'stroke-width': 3 }));
  }
  p.push(el('rect', { x: -17, y: -50, width: 34, height: 32, rx: 12, fill: sh.fill, stroke: INK, 'stroke-width': 3 }));
  if (sh.stripes) p.push(el('path', { d: 'M-15 -40 h30 M-15 -30 h30', stroke: sh.stripes, 'stroke-width': 4 }));
  if (sh.half) p.push(el('path', { d: 'M0 -48.5 h5 a10.5 10.5 0 0 1 10.5 10.5 v8 a10.5 10.5 0 0 1 -10.5 10.5 h-5 z', fill: sh.half }));
  if (sh.cross) p.push(el('path', { d: 'M-3 -42 h6 v5 h5 v6 h-5 v5 h-6 v-5 h-5 v-6 h5 z', fill: sh.cross }));
  if (sh.band) p.push(el('rect', { x: -15.5, y: -38, width: 31, height: 7, fill: sh.band }));
  if (sh.dots) [[-8, -42], [7, -40], [-2, -30], [9, -27], [-10, -26]].forEach(([cx, cy]) => p.push(el('circle', { cx, cy, r: 2.6, fill: sh.dots })));
  if (sh.shine) p.push(el('path', { d: 'M-10 -44 l6 0 l-8 18 l-6 0 z', fill: sh.shine, opacity: .8 }));
  if (sh.drop) p.push(el('path', { d: 'M0 -44 q7 9 0 14 q-7 -5 0 -14 z', fill: sh.drop }));
  return { parts: p, legs: sh.legs };
}

function hatParts(kind) {
  const H = {
    none: () => [],
    bush: () => [
      el('ellipse', { cx: 0, cy: -82, rx: 27, ry: 6, fill: '#8a6a3a', stroke: INK, 'stroke-width': 3 }),
      el('path', { d: 'M-15 -82 q2 -16 15 -16 q13 0 15 16 z', fill: '#a7834b', stroke: INK, 'stroke-width': 3 }),
      el('rect', { x: -14, y: -87, width: 28, height: 4, fill: '#5a3d1e' })],
    cap: () => [
      el('path', { d: 'M-17 -80 q0 -18 17 -18 q17 0 17 18 z', fill: '#c8412f', stroke: INK, 'stroke-width': 3 }),
      el('path', { d: 'M8 -81 h24 q2 5 -4 6 h-20 z', fill: '#c8412f', stroke: INK, 'stroke-width': 3 })],
    croc: () => [
      el('path', { d: 'M-19 -78 q0 -22 19 -22 q19 0 19 22 z', fill: '#4f7a33', stroke: INK, 'stroke-width': 3 }),
      el('path', { d: 'M15 -86 h22 q4 6 -2 10 h-20 z', fill: '#5d8c3d', stroke: INK, 'stroke-width': 3 }),
      el('path', { d: 'M18 -78 l3 4 l3 -4 l3 4 l3 -4 l3 4', stroke: '#fffaf0', 'stroke-width': 2, fill: 'none' }),
      el('circle', { cx: -7, cy: -98, r: 5, fill: '#ffe066', stroke: INK, 'stroke-width': 2 }),
      el('circle', { cx: 7, cy: -98, r: 5, fill: '#ffe066', stroke: INK, 'stroke-width': 2 }),
      el('rect', { x: -8, y: -101, width: 2, height: 6, fill: INK }), el('rect', { x: 6, y: -101, width: 2, height: 6, fill: INK })],
    crown: () => [
      el('path', { d: 'M-16 -82 l-3 -20 l10 8 l9 -14 l9 14 l10 -8 l-3 20 z', fill: '#ffd25e', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
      el('circle', { cx: 0, cy: -90, r: 3, fill: '#c8412f' })],
    hardhat: () => [
      el('path', { d: 'M-18 -80 q0 -20 18 -20 q18 0 18 20 z', fill: '#ffd25e', stroke: INK, 'stroke-width': 3 }),
      el('rect', { x: -24, y: -82, width: 48, height: 6, rx: 3, fill: '#ffd25e', stroke: INK, 'stroke-width': 3 }),
      el('rect', { x: -3, y: -100, width: 6, height: 18, fill: '#e8b830' })],
    firehelmet: () => [
      el('path', { d: 'M-18 -80 q0 -22 18 -22 q18 0 18 22 z', fill: '#c8412f', stroke: INK, 'stroke-width': 3 }),
      el('path', { d: 'M-26 -80 h52 q-2 6 -10 6 h-32 q-8 0 -10 -6 z', fill: '#c8412f', stroke: INK, 'stroke-width': 3 }),
      el('rect', { x: -6, y: -96, width: 12, height: 10, rx: 2, fill: '#ffd25e', stroke: INK, 'stroke-width': 2 })],
    legionnaire: () => [
      el('path', { d: 'M-18 -78 q0 -20 18 -20 q18 0 18 20 z', fill: '#f3efe2', stroke: INK, 'stroke-width': 3 }),
      el('path', { d: 'M-19 -80 v24 q-6 -4 -8 -10 z M19 -80 v24 q6 -4 8 -10 z', fill: '#f3efe2', stroke: INK, 'stroke-width': 2 }),
      el('path', { d: 'M8 -80 h20 q1 5 -4 6 h-16 z', fill: '#f3efe2', stroke: INK, 'stroke-width': 3 })],
    party: () => [
      el('path', { d: 'M-12 -84 L0 -116 L12 -84 z', fill: '#f28ab2', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
      el('path', { d: 'M-8 -94 l16 0 M-4 -104 l8 0', stroke: '#ffd25e', 'stroke-width': 3 }),
      el('circle', { cx: 0, cy: -118, r: 4, fill: '#ffd25e', stroke: INK, 'stroke-width': 2 })],
    grad: () => [
      el('path', { d: 'M-15 -80 q0 -12 15 -12 q15 0 15 12 z', fill: '#1d1a16' }),
      el('path', { d: 'M-30 -94 L0 -104 L30 -94 L0 -84 z', fill: '#1d1a16', stroke: INK, 'stroke-width': 2 }),
      el('path', { d: 'M0 -94 L24 -92 V-78', stroke: '#ffd25e', 'stroke-width': 2.5, fill: 'none' }),
      el('circle', { cx: 24, cy: -76, r: 3, fill: '#ffd25e' })],
    explorer: () => [
      el('ellipse', { cx: 0, cy: -82, rx: 30, ry: 7, fill: '#5a3d1e', stroke: INK, 'stroke-width': 3 }),
      el('path', { d: 'M-16 -82 q0 -20 16 -20 q16 0 16 20 z', fill: '#6b4a2b', stroke: INK, 'stroke-width': 3 }),
      el('path', { d: 'M-16 -86 h32', stroke: '#c8412f', 'stroke-width': 4 }),
      el('path', { d: 'M10 -88 l8 -14 l2 14 z', fill: '#c8412f', stroke: INK, 'stroke-width': 1.5 })]
  };
  return (H[kind] || H.bush)();
}

function specsParts(kind) {
  if (kind === 'sunnies') return [
    el('rect', { x: -14, y: -76, width: 12, height: 9, rx: 3, fill: INK }), el('rect', { x: 2, y: -76, width: 12, height: 9, rx: 3, fill: INK }),
    el('path', { d: 'M-2 -73 h4', stroke: INK, 'stroke-width': 2 })];
  if (kind === 'nerd') return [
    el('circle', { cx: -7, cy: -71, r: 6.5, fill: 'rgba(255,255,255,.35)', stroke: INK, 'stroke-width': 2.5 }),
    el('circle', { cx: 7, cy: -71, r: 6.5, fill: 'rgba(255,255,255,.35)', stroke: INK, 'stroke-width': 2.5 }),
    el('path', { d: 'M-1 -71 h2', stroke: INK, 'stroke-width': 2.5 })];
  if (kind === 'heart') return [
    el('path', { d: 'M-7 -66 l-7 -7 a3.6 3.6 0 0 1 7 -4 a3.6 3.6 0 0 1 7 4 z', fill: '#f28ab2', stroke: INK, 'stroke-width': 2 }),
    el('path', { d: 'M7 -66 l-7 -7 a3.6 3.6 0 0 1 7 -4 a3.6 3.6 0 0 1 7 4 z', fill: '#f28ab2', stroke: INK, 'stroke-width': 2 })];
  return [];
}

// A cheerful explorer wearing the player's outfit. Origin at feet centre.
// Pass outfit: {...} to draw a specific look (used by the wardrobe previews).
export function person({ x = 0, y = 0, s = 1, shirt, skin, mood = 'happy', hat = true, outfit } = {}) {
  const o = { ...OUTFIT, ...(outfit || {}) };
  const sk = skin || (typeof o.skin === 'string' ? o.skin : o.skin != null ? SKIN[o.skin] : SKIN[Math.floor(Math.random() * SKIN.length)]);
  const mouth = mood === 'happy'
    ? el('path', { d: 'M-7 -62 q7 7 14 0', stroke: INK, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' })
    : mood === 'scared'
      ? el('ellipse', { cx: 0, cy: -60, rx: 5, ry: 7, fill: INK })
      : el('path', { d: 'M-7 -58 q7 -7 14 0', stroke: INK, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' });
  const top = shirtParts(o.shirt, o.shirt === 'own' ? (o.ownShirt || shirt) : shirt);
  const legs = top.legs || '#3b4a6b';
  const showEyes = o.specs !== 'sunnies';
  const parts = [
    el('ellipse', { cx: 0, cy: 0, rx: 22, ry: 5, fill: 'rgba(0,0,0,.18)' }),
    el('rect', { x: -12, y: -22, width: 9, height: 22, rx: 4, fill: legs, stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: 3, y: -22, width: 9, height: 22, rx: 4, fill: legs, stroke: INK, 'stroke-width': 3 }),
    ...top.parts,
    el('circle', { cx: 0, cy: -68, r: 18, fill: sk, stroke: INK, 'stroke-width': 3 }),
    showEyes ? el('circle', { cx: -6, cy: -71, r: 2.8, fill: INK }) : null,
    showEyes ? el('circle', { cx: 6, cy: -71, r: 2.8, fill: INK }) : null,
    mouth,
    ...specsParts(o.specs),
    ...(hat ? hatParts(o.hat) : [])
  ].filter(Boolean);
  return g(parts, { transform: `translate(${x} ${y}) scale(${s})` });
}

// Crocodile peeking out of water: eyes + snout bumps. Origin at waterline centre.
export function crocEyes({ x = 0, y = 0, s = 1 } = {}) {
  return g([
    el('ellipse', { cx: 0, cy: 4, rx: 56, ry: 10, fill: '#3e5f2a', stroke: INK, 'stroke-width': 3 }),
    el('circle', { cx: -34, cy: -2, r: 10, fill: '#4f7a33', stroke: INK, 'stroke-width': 3 }),
    el('circle', { cx: -14, cy: -2, r: 10, fill: '#4f7a33', stroke: INK, 'stroke-width': 3 }),
    el('circle', { cx: -34, cy: -3, r: 4.5, fill: '#ffe066' }),
    el('circle', { cx: -14, cy: -3, r: 4.5, fill: '#ffe066' }),
    el('rect', { x: -35.5, y: -7, width: 3, height: 8, fill: INK }),
    el('rect', { x: -15.5, y: -7, width: 3, height: 8, fill: INK }),
    el('circle', { cx: 40, cy: 1, r: 3, fill: INK }),
    el('circle', { cx: 48, cy: 1, r: 3, fill: INK })
  ], { transform: `translate(${x} ${y}) scale(${s})` });
}

export function water(y, h, color = '#2f7f8f') {
  return g([
    el('rect', { x: 0, y, width: VIEW.w, height: h, fill: color }),
    el('path', {
      d: `M0 ${y + 14} q22 -10 45 0 t45 0 t45 0 t45 0 t45 0 t45 0 t45 0 t45 0`,
      stroke: 'rgba(255,255,255,.35)', 'stroke-width': 4, fill: 'none'
    })
  ]);
}

export function sun(x, y, r = 34) {
  const rays = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    rays.push(el('line', {
      x1: x + Math.cos(a) * (r + 6), y1: y + Math.sin(a) * (r + 6),
      x2: x + Math.cos(a) * (r + 18), y2: y + Math.sin(a) * (r + 18),
      stroke: '#f2a541', 'stroke-width': 5, 'stroke-linecap': 'round'
    }));
  }
  return g([...rays, el('circle', { cx: x, cy: y, r, fill: '#ffd25e', stroke: INK, 'stroke-width': 3 })]);
}

export function sign(x, y, lines, { bg = '#fffaf0', fg = INK, w = 120 } = {}) {
  const h = 18 + lines.length * 20;
  return g([
    el('rect', { x: -4, y: 0, width: 8, height: 70, fill: '#6b4a2b', stroke: INK, 'stroke-width': 2 }),
    el('rect', { x: -w / 2, y: -h, width: w, height: h, rx: 6, fill: bg, stroke: INK, 'stroke-width': 3 }),
    ...lines.map((t, i) => text(0, -h + 26 + i * 20, t, { size: 15, fill: fg }))
  ], { transform: `translate(${x} ${y})` });
}

// Item icons used by several games. Origin at centre, roughly 60x60.
export const items = {
  water: () => g([
    el('rect', { x: -12, y: -26, width: 24, height: 52, rx: 8, fill: '#9fd8ef', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -7, y: -34, width: 14, height: 9, rx: 2, fill: '#2f7fd0', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -12, y: -6, width: 24, height: 14, fill: '#2f7fd0' }),
    text(0, 6, 'H2O', { size: 11, fill: '#fff' })
  ]),
  torch: () => g([
    el('rect', { x: -26, y: -9, width: 36, height: 18, rx: 4, fill: '#d94f3d', stroke: INK, 'stroke-width': 3 }),
    el('path', { d: 'M10 -14 L24 -18 L24 18 L10 14 z', fill: '#bbb', stroke: INK, 'stroke-width': 3 }),
    el('path', { d: 'M26 -14 L44 -24 L44 24 L26 14 z', fill: '#ffe9a8', opacity: .8 })
  ]),
  radio: () => g([
    el('rect', { x: -26, y: -16, width: 52, height: 34, rx: 6, fill: '#5b6c8f', stroke: INK, 'stroke-width': 3 }),
    el('line', { x1: 14, y1: -16, x2: 26, y2: -38, stroke: INK, 'stroke-width': 3 }),
    el('circle', { cx: -10, cy: 1, r: 9, fill: '#ddd', stroke: INK, 'stroke-width': 2 }),
    el('rect', { x: 6, y: -8, width: 14, height: 6, fill: '#ffe9a8', stroke: INK, 'stroke-width': 2 })
  ]),
  firstaid: () => g([
    el('rect', { x: -26, y: -20, width: 52, height: 40, rx: 6, fill: '#fffaf0', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -5, y: -13, width: 10, height: 26, fill: '#c8412f' }),
    el('rect', { x: -13, y: -5, width: 26, height: 10, fill: '#c8412f' })
  ]),
  batteries: () => g([
    el('rect', { x: -22, y: -18, width: 16, height: 36, rx: 3, fill: '#e0892e', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: 6, y: -18, width: 16, height: 36, rx: 3, fill: '#e0892e', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -17, y: -23, width: 6, height: 5, fill: INK }),
    el('rect', { x: 11, y: -23, width: 6, height: 5, fill: INK })
  ]),
  tv: () => g([
    el('rect', { x: -28, y: -20, width: 56, height: 38, rx: 4, fill: '#333', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -22, y: -15, width: 44, height: 28, fill: '#7fb8d6' }),
    el('line', { x1: -10, y1: 18, x2: -16, y2: 28, stroke: INK, 'stroke-width': 3 }),
    el('line', { x1: 10, y1: 18, x2: 16, y2: 28, stroke: INK, 'stroke-width': 3 })
  ]),
  beachball: () => g([
    el('circle', { r: 24, fill: '#fff', stroke: INK, 'stroke-width': 3 }),
    el('path', { d: 'M0 -24 A24 24 0 0 1 21 12 L0 0 z', fill: '#c8412f' }),
    el('path', { d: 'M-21 12 A24 24 0 0 1 0 -24 L0 0 z', fill: '#2f7fd0' }),
    el('circle', { r: 24, fill: 'none', stroke: INK, 'stroke-width': 3 })
  ]),
  console: () => g([
    el('rect', { x: -30, y: -14, width: 60, height: 28, rx: 14, fill: '#6a4c93', stroke: INK, 'stroke-width': 3 }),
    el('circle', { cx: -15, cy: 0, r: 5, fill: INK }),
    el('circle', { cx: 15, cy: -4, r: 3.5, fill: '#ffe066' }),
    el('circle', { cx: 21, cy: 3, r: 3.5, fill: '#c8412f' })
  ]),
  duck: () => g([
    el('ellipse', { cx: 0, cy: 8, rx: 24, ry: 15, fill: '#ffd25e', stroke: INK, 'stroke-width': 3 }),
    el('circle', { cx: 10, cy: -12, r: 12, fill: '#ffd25e', stroke: INK, 'stroke-width': 3 }),
    el('path', { d: 'M20 -12 l12 3 l-12 4 z', fill: '#e0892e', stroke: INK, 'stroke-width': 2 }),
    el('circle', { cx: 13, cy: -15, r: 2.5, fill: INK })
  ]),
  vinegar: () => bottle('#f3f0d0', 'VINEGAR', '#7a5b1e'),
  freshwater: () => bottle('#cfeefc', 'WATER', '#2f7fd0'),
  fizzy: () => bottle('#7a3b1e', 'FIZZ', '#fff'),
  bandage: () => g([
    el('rect', { x: -28, y: -16, width: 56, height: 32, rx: 16, fill: '#f6efe0', stroke: INK, 'stroke-width': 3 }),
    el('path', { d: 'M-18 -16 v32 M-6 -16 v32 M6 -16 v32 M18 -16 v32', stroke: '#d8cdb5', 'stroke-width': 3 }),
    text(0, 6, 'WIDE', { size: 11 })
  ]),
  knife: () => g([
    el('path', { d: 'M-30 4 L10 -6 L30 0 L10 6 z', fill: '#cfd6dc', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -40, y: -2, width: 14, height: 10, rx: 3, fill: '#6b4a2b', stroke: INK, 'stroke-width': 3 })
  ]),
  rope: () => g([
    el('path', { d: 'M-26 -10 C -10 -30, 10 10, 26 -10 C 10 20, -10 -12, -26 14', stroke: '#b5895a', 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }),
    el('path', { d: 'M-26 -10 C -10 -30, 10 10, 26 -10 C 10 20, -10 -12, -26 14', stroke: INK, 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '4 6' })
  ]),
  suit: () => g([
    el('path', { d: 'M-14 -26 h28 l14 14 l-8 8 l-8 -6 v38 h-8 l-4 -20 l-4 20 h-8 v-38 l-8 6 l-8 -8 z', fill: '#2f7fd0', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    el('path', { d: 'M-6 -26 q6 8 12 0', stroke: INK, 'stroke-width': 2, fill: 'none' })
  ]),
  sunnies: () => g([
    el('circle', { cx: -14, cy: 0, r: 12, fill: INK }),
    el('circle', { cx: 14, cy: 0, r: 12, fill: INK }),
    el('line', { x1: -2, y1: -2, x2: 2, y2: -2, stroke: INK, 'stroke-width': 4 }),
    el('circle', { cx: -18, cy: -4, r: 3, fill: '#fff', opacity: .6 })
  ]),
  floaty: () => g([
    el('circle', { r: 24, fill: '#f28ab2', stroke: INK, 'stroke-width': 3 }),
    el('circle', { r: 11, fill: '#f6e7c8', stroke: INK, 'stroke-width': 3 })
  ]),
  sunscreen: () => g([
    el('rect', { x: -14, y: -26, width: 28, height: 50, rx: 8, fill: '#ffd25e', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -6, y: -36, width: 12, height: 12, rx: 3, fill: '#e0892e', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -14, y: -6, width: 28, height: 16, fill: '#fffaf0', stroke: INK, 'stroke-width': 2 }),
    text(0, 6, 'SPF50', { size: 8.5, fill: '#c8412f' })
  ]),
  hat: () => g([
    el('ellipse', { cx: 0, cy: 8, rx: 34, ry: 9, fill: '#d9b36a', stroke: INK, 'stroke-width': 3 }),
    el('path', { d: 'M-18 8 q2 -26 18 -26 q16 0 18 26 z', fill: '#e8c77e', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -17, y: -2, width: 34, height: 6, fill: '#7a3b1e' })
  ]),
  longshirt: () => g([
    el('path', { d: 'M-14 -26 h28 l26 22 l-10 10 l-16 -12 v36 h-28 v-36 l-16 12 l-10 -10 z', fill: '#fffaf0', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    el('path', { d: 'M-6 -26 l6 8 l6 -8', stroke: INK, 'stroke-width': 2, fill: 'none' }),
    el('line', { x1: 0, y1: -18, x2: 0, y2: 28, stroke: '#ccc', 'stroke-width': 2 })
  ]),
  umbrella: () => g([
    el('path', { d: 'M-34 0 Q-34 -32 0 -32 Q34 -32 34 0 Q26 -6 17 0 Q8 -6 0 0 Q-8 -6 -17 0 Q-26 -6 -34 0 Z', fill: '#2f7fd0', stroke: INK, 'stroke-width': 3 }),
    el('path', { d: 'M0 -32 Q-10 -16 -17 0 M0 -32 Q10 -16 17 0', stroke: '#fffaf0', 'stroke-width': 3, fill: 'none' }),
    el('path', { d: 'M0 0 V28 q0 6 -6 6', stroke: INK, 'stroke-width': 3, fill: 'none' })
  ]),
  repellent: () => g([
    el('rect', { x: -14, y: -22, width: 28, height: 48, rx: 6, fill: '#4f8a3c', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -8, y: -32, width: 16, height: 11, rx: 2, fill: '#ddd', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: 8, y: -30, width: 8, height: 4, fill: INK }),
    el('rect', { x: -14, y: -4, width: 28, height: 16, fill: '#fffaf0', stroke: INK, 'stroke-width': 2 }),
    text(0, 7, 'REPEL', { size: 9, fill: '#4f8a3c' })
  ]),
  perfume: () => g([
    el('rect', { x: -16, y: -14, width: 32, height: 38, rx: 10, fill: '#f28ab2', stroke: INK, 'stroke-width': 3, opacity: .95 }),
    el('rect', { x: -5, y: -26, width: 10, height: 12, fill: '#ffd25e', stroke: INK, 'stroke-width': 3 }),
    el('circle', { cx: 0, cy: -30, r: 6, fill: '#c55a8a', stroke: INK, 'stroke-width': 2 }),
    text(0, 10, '♥', { size: 14, fill: '#fffaf0' })
  ]),
  icecream: () => g([
    el('path', { d: 'M-14 -4 L0 32 L14 -4 Z', fill: '#d9a35a', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    el('circle', { cx: 0, cy: -12, r: 15, fill: '#f28ab2', stroke: INK, 'stroke-width': 3 }),
    el('circle', { cx: 4, cy: -28, r: 4, fill: '#c8412f', stroke: INK, 'stroke-width': 2 })
  ]),
  phone: () => g([
    el('rect', { x: -14, y: -26, width: 28, height: 52, rx: 6, fill: '#333', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -10, y: -20, width: 20, height: 36, rx: 2, fill: '#7fb8d6' }),
    el('circle', { cx: 0, cy: 21, r: 2.5, fill: '#999' })
  ]),
  swimmer: (sk = '#c68642', cap = '#c8412f') => g([
    el('ellipse', { cx: 0, cy: 10, rx: 28, ry: 7, fill: 'rgba(255,255,255,.45)' }),
    el('path', { d: 'M-22 2 q-8 -18 -2 -26', stroke: sk, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }),
    el('path', { d: 'M22 2 q8 -18 2 -26', stroke: sk, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }),
    el('circle', { cx: 0, cy: -6, r: 15, fill: sk, stroke: INK, 'stroke-width': 3 }),
    el('path', { d: 'M-15 -8 q15 -22 30 0 z', fill: cap, stroke: INK, 'stroke-width': 3 }),
    el('circle', { cx: -5, cy: -3, r: 2.5, fill: INK }), el('circle', { cx: 5, cy: -3, r: 2.5, fill: INK }),
    el('path', { d: 'M-5 4 q5 4 10 0', stroke: INK, 'stroke-width': 2, fill: 'none' })
  ]),
  mozzie: () => g([
    el('ellipse', { cx: -4, cy: -6, rx: 7, ry: 4, fill: 'rgba(255,255,255,.75)', stroke: INK, 'stroke-width': 1.5, transform: 'rotate(-30)' }),
    el('ellipse', { cx: 4, cy: -6, rx: 7, ry: 4, fill: 'rgba(255,255,255,.75)', stroke: INK, 'stroke-width': 1.5, transform: 'rotate(30)' }),
    el('ellipse', { cx: 0, cy: 0, rx: 7, ry: 3.5, fill: '#3a3a3a' }),
    el('line', { x1: -7, y1: 0, x2: -15, y2: 3, stroke: '#3a3a3a', 'stroke-width': 2 }),
    el('path', { d: 'M-3 2 l-4 7 M1 3 l0 7 M4 2 l4 7', stroke: '#3a3a3a', 'stroke-width': 1.2 })
  ]),
  stormcloud: () => g([
    el('circle', { cx: -40, cy: 0, r: 28, fill: '#4b5363' }), el('circle', { cx: 0, cy: -16, r: 36, fill: '#565f71' }),
    el('circle', { cx: 42, cy: -2, r: 30, fill: '#4b5363' }),
    el('rect', { x: -66, y: 0, width: 132, height: 26, rx: 13, fill: '#4b5363' })
  ]),
  bolt: () => el('path', { d: 'M8 -40 L-14 6 H2 L-8 42 L22 -6 H6 L18 -40 Z', fill: '#ffe066', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
  tent: () => g([
    el('path', { d: 'M-40 20 L0 -32 L40 20 z', fill: '#e0892e', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    el('path', { d: 'M0 -32 L-10 20 L10 20 z', fill: '#7a3b1e', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' })
  ])
};

function bottle(fill, label, labelFill) {
  return g([
    el('rect', { x: -21, y: -24, width: 42, height: 50, rx: 9, fill, stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -7, y: -34, width: 14, height: 12, rx: 3, fill: '#888', stroke: INK, 'stroke-width': 3 }),
    el('rect', { x: -21, y: -6, width: 42, height: 18, fill: '#fffaf0', stroke: INK, 'stroke-width': 2 }),
    text(0, 7, label, { size: label.length > 5 ? 8.5 : 10.5, fill: labelFill === '#fff' ? INK : labelFill })
  ]);
}

// Frill-neck lizard mascot ("Frilly"), used on the menu and result cards.
export function mascotSVG(mood = 'happy') {
  const eyes = mood === 'sad'
    ? '<path d="M78 70 l10 6 M88 70 l-10 6 M112 70 l10 6 M122 70 l-10 6" stroke="#1d1a16" stroke-width="4" stroke-linecap="round"/>'
    : '<circle cx="84" cy="72" r="7" fill="#1d1a16"/><circle cx="116" cy="72" r="7" fill="#1d1a16"/><circle cx="86" cy="69" r="2.5" fill="#fff"/><circle cx="118" cy="69" r="2.5" fill="#fff"/>';
  const mouth = mood === 'sad'
    ? '<path d="M86 102 q14 -10 28 0" stroke="#1d1a16" stroke-width="4" fill="none" stroke-linecap="round"/>'
    : '<path d="M84 96 q16 16 32 0" stroke="#1d1a16" stroke-width="4" fill="#c8412f" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 200 200" xmlns="${NS}" role="img" aria-label="Frilly the frill-neck lizard">
    <path d="M100 30 L60 20 L38 48 L18 60 L22 92 L10 118 L40 130 L54 160 L84 150 L100 172 L116 150 L146 160 L160 130 L190 118 L178 92 L182 60 L162 48 L140 20 Z" fill="#e0892e" stroke="#1d1a16" stroke-width="5" stroke-linejoin="round"/>
    <path d="M100 52 L70 46 M100 52 L48 70 M100 52 L42 104 M100 52 L64 138 M100 52 L136 138 M100 52 L158 104 M100 52 L152 70 M100 52 L130 46" stroke="#b5641a" stroke-width="4"/>
    <ellipse cx="100" cy="86" rx="38" ry="34" fill="#9bbf4a" stroke="#1d1a16" stroke-width="5"/>
    <ellipse cx="100" cy="100" rx="22" ry="14" fill="#c7dd85"/>
    ${eyes}${mouth}
    <ellipse cx="100" cy="46" rx="42" ry="9" fill="#8a6a3a" stroke="#1d1a16" stroke-width="4"/>
    <path d="M76 46 q4 -26 24 -26 q20 0 24 26 z" fill="#a7834b" stroke="#1d1a16" stroke-width="4"/>
  </svg>`;
}

export function heartSVG() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" fill="#c8412f" stroke="#1d1a16" stroke-width="2"/></svg>`;
}

// Speaker, for the sound on/off toggle.
export function soundSVG(on = true) {
  const body = '<path d="M4 9.5h3.6L12 6v12l-4.4-3.5H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>';
  const waves = on
    ? '<path d="M14.8 9.4a4.2 4.2 0 0 1 0 5.2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M17.6 6.8a8 8 0 0 1 0 10.4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'
    : '<path d="M15.4 9.6l5 4.8M20.4 9.6l-5 4.8" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${body}${waves}</svg>`;
}

// Gold coin, for the character store.
export function coinSVG() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#ffd25e" stroke="#1d1a16" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#e0b400" stroke-width="2"/><path d="M12 8.2v7.6M10.2 10.2h3.2M10.2 13.6h3.2" stroke="#b5641a" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

// Padlock, for locked characters in the store.
export function lockSVG() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="#fffaf0" stroke="#1d1a16" stroke-width="2"/><path d="M8 10V8a4 4 0 0 1 8 0v2" fill="none" stroke="#1d1a16" stroke-width="2"/><circle cx="12" cy="15" r="1.6" fill="#1d1a16"/></svg>`;
}

// Small icons for the learn screen.
export function iconFor(key) {
  const wrap = (inner, bg) => `<svg class="ic" viewBox="-36 -36 72 72" xmlns="${NS}"><circle r="34" fill="${bg}" stroke="#1d1a16" stroke-width="3"/>${inner}</svg>`;
  const tmp = document.createElementNS(NS, 'g');
  const pick = {
    crocwise: () => { const s = crocEyes({ s: .5 }); tmp.innerHTML = ''; tmp.appendChild(s); return wrap(tmp.innerHTML, '#8fd0e0'); },
    stingers: () => { tmp.innerHTML = ''; tmp.appendChild(items.vinegar()); return wrap(`<g transform="scale(.8)">${tmp.innerHTML}</g>`, '#cfeefc'); },
    cyclone: () => { tmp.innerHTML = ''; tmp.appendChild(items.radio()); return wrap(`<g transform="scale(.8)">${tmp.innerHTML}</g>`, '#d9d2f0'); },
    flood: () => wrap('<path d="M-22 6 q11 -8 22 0 t22 0 M-22 16 q11 -8 22 0 t22 0" stroke="#2f7fd0" stroke-width="5" fill="none"/><path d="M-14 -4 h28 l-4 -12 h-20 z" fill="#c8412f" stroke="#1d1a16" stroke-width="3"/>', '#f6e7c8'),
    heat: () => { tmp.innerHTML = ''; tmp.appendChild(items.water()); return wrap(`<g transform="scale(.75)">${tmp.innerHTML}</g>`, '#ffe9a8'); },
    snake: () => { tmp.innerHTML = ''; tmp.appendChild(items.bandage()); return wrap(`<g transform="scale(.8)">${tmp.innerHTML}</g>`, '#e7f3d6'); },
    roads: () => wrap('<path d="M0 -26 L16 26 L-16 26 z" fill="#6d6d6d" stroke="#1d1a16" stroke-width="3"/><path d="M0 -12 v8 M0 6 v8" stroke="#ffe9a8" stroke-width="4" stroke-linecap="round"/>', '#f0d9a8'),
    lightning: () => { tmp.innerHTML = ''; tmp.appendChild(items.bolt()); return wrap(`<g transform="scale(.6)">${tmp.innerHTML}</g>`, '#4b5363'); },
    mozzies: () => { tmp.innerHTML = ''; tmp.appendChild(items.mozzie()); return wrap(`<g transform="scale(1.6)">${tmp.innerHTML}</g>`, '#e3d4f0'); },
    sun: () => { tmp.innerHTML = ''; tmp.appendChild(items.hat()); return wrap(`<g transform="scale(.75)">${tmp.innerHTML}</g>`, '#ffe9a8'); },
    wildlife: () => wrap('<path d="M-30 18 h60" stroke="#4a4a52" stroke-width="10"/><path d="M-12 10 q-16 2 -20 8 l18 -3 z" fill="#9a5d2c" stroke="#1d1a16" stroke-width="2"/><ellipse cx="-2" cy="0" rx="9" ry="12" fill="#b5733a" stroke="#1d1a16" stroke-width="2.5"/><ellipse cx="6" cy="-14" rx="7" ry="5.5" fill="#b5733a" stroke="#1d1a16" stroke-width="2.5"/><ellipse cx="2" cy="-22" rx="2.4" ry="5" fill="#b5733a" stroke="#1d1a16" stroke-width="1.8"/><circle cx="8" cy="-15" r="1.6" fill="#1d1a16"/>', '#f4c28a'),
    bushfire: () => wrap('<path d="M0 -24 C 14 -8, 18 4, 12 16 C 8 24, -8 24, -12 16 C -18 4, -8 -4, -4 -14 C -2 -6, 4 -4, 0 -24 z" fill="#e0892e" stroke="#1d1a16" stroke-width="3"/>', '#fbe0d8')
  };
  return (pick[key] || pick.crocwise)();
}
