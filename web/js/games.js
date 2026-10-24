// The mini-games (17 hazards + 2 boss rounds). Each one is a few seconds long and teaches one NT safety rule.
//
// A game is { id, prompt, bg, timeoutWins, setup(ctx) }.
//   prompt       - the shouted instruction ("STEP BACK!")
//   timeoutWins  - true if surviving until the timer ends counts as a win
//   setup(ctx)   - draws the scene and wires input. Call ctx.win() or ctx.lose() once.
//
// The engine draws a location's landscape (see locationBackdrop in locations.js)
// behind the scene: the stop you are at in Journey mode, or the hazard's home
// location in Classic and Daily. So games should not paint their own opaque,
// full-stage background; draw only the ground, water and props the round needs.
// A game whose sky IS the hazard (a storm, dusk) sets ownBackdrop: true instead.
//
// ctx gives you: svg (the scene), stage (div), location (the place being played),
// win(), lose(), onTick(fn(progress, dt)), toSvg(event) -> {x, y},
// draggable(node, x, y, opts), buttons([{label, ok, onPick}]), clearButtons(), sound(name),
// failTip (set it to override the lesson shown after a fail), speed.

import { el, g, text, person, crocEyes, water, sun, sign, items, VIEW } from './art.js';

const W = VIEW.w, H = VIEW.h;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const place = (node, x, y, s = 1) => { node.setAttribute('transform', `translate(${x} ${y}) scale(${s})`); return node; };

// Lets a game ask for a sound effect without importing the sound module.
function sfxHook(ctx, name) { ctx.sound && ctx.sound(name); }

function swirlAt(x, y) {
  return el('path', { d: `M${x} ${y} m-28 0 a28 28 0 1 1 28 28 a17 17 0 1 1 -14 -17`, stroke: '#9b8fd6', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' });
}

// Rock and bush dressing for shorelines (croc edge and Berry Springs).
function rock(x, y, s = 1, fill = '#a9a090') {
  return g([
    el('path', { d: 'M-28 0 q-2 -12 6 -20 q10 -10 24 -7 q13 2 20 12 q6 8 2 15 z', fill, stroke: '#1d1a16', 'stroke-width': 3 }),
    el('path', { d: 'M-15 -2 q9 -8 21 -5', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' })
  ], { transform: `translate(${x} ${y}) scale(${s})` });
}

function bush(x, y, s = 1) {
  return g([
    el('path', {
      d: 'M-44 8 q-8 -12 2 -21 q-5 -14 9 -17 q3 -14 17 -13 q9 -10 20 -2 q14 -6 20 6 q14 2 15 14 q11 7 6 18 q4 11 -9 17 q-3 8 -16 6 z',
      fill: '#3f6b2e', stroke: '#1d1a16', 'stroke-width': 3, 'stroke-linejoin': 'round'
    }),
    el('ellipse', { cx: -20, cy: -13, rx: 15, ry: 10, fill: '#4f8a3c' }),
    el('ellipse', { cx: 12, cy: -17, rx: 17, ry: 12, fill: '#5c9b45' }),
    el('ellipse', { cx: 20, cy: -1, rx: 13, ry: 8, fill: '#4f8a3c' }),
    el('circle', { cx: -8, cy: -16, r: 3.5, fill: '#c8412f' }),
    el('circle', { cx: 9, cy: -22, r: 3, fill: '#e0892e' })
  ], { transform: `translate(${x} ${y}) scale(${s})` });
}

// Tropical planting for Berry Springs.
function pandanus(x, y, s = 1) {
  return g([
    el('path', { d: 'M0 0 q-4 -34 2 -64', stroke: '#6b4a2b', 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }),
    el('path', {
      d: 'M2 -64 q-36 4 -50 28 M2 -64 q36 4 50 28 M2 -64 q-24 -22 -42 -20 M2 -64 q24 -22 42 -20 M2 -64 q-8 -28 -2 -42 M2 -64 q14 8 20 26',
      stroke: '#3f7a2e', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round'
    }),
    el('circle', { cx: 2, cy: -64, r: 5, fill: '#5c9b45' })
  ], { transform: `translate(${x} ${y}) scale(${s})` });
}

function fern(x, y, s = 1) {
  return g([
    el('path', {
      d: 'M0 0 q-6 -20 2 -34 M0 -4 q-20 -4 -28 -18 M0 -10 q20 -4 28 -18 M0 -18 q-14 -6 -20 -20 M0 -22 q14 -6 20 -20',
      stroke: '#3f7a2e', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round'
    })
  ], { transform: `translate(${x} ${y}) scale(${s})` });
}

// Berry Springs: clear turquoise spring, sandstone ledges, waterfall and monsoon forest.
function berrySprings() {
  const canopy = (cx, cy, rx, ry, fill) => el('ellipse', { cx, cy, rx, ry, fill });
  return g([
    // Sky and soft sunlight behind the rainforest (extends into the stage letterbox).
    el('rect', { x: -200, y: -200, width: 760, height: 500, fill: '#cfeef0' }),
    el('circle', { cx: 302, cy: 46, r: 34, fill: '#ffe9a8', opacity: .75 }),

    // Far rainforest canopy.
    el('path', {
      d: 'M-20 210 L-20 154 Q12 96 66 112 Q96 62 152 84 Q206 42 256 80 Q306 54 364 104 L390 122 L390 220 Z',
      fill: '#2f5a2a'
    }),
    canopy(32, 146, 68, 44, '#3f6b2e'),
    canopy(100, 116, 78, 54, '#4f7a33'),
    canopy(188, 120, 86, 58, '#3f6b2e'),
    canopy(276, 110, 80, 54, '#4f7a33'),
    canopy(348, 146, 64, 42, '#2f5a2a'),
    canopy(70, 96, 34, 20, 'rgba(140,200,100,.28)'),
    canopy(212, 90, 42, 23, 'rgba(140,200,100,.24)'),
    canopy(318, 110, 30, 18, 'rgba(140,200,100,.22)'),
    el('rect', { x: 62, y: 152, width: 10, height: 70, fill: '#6b4a2b' }),
    el('rect', { x: 182, y: 158, width: 12, height: 62, fill: '#5a3c22' }),
    el('rect', { x: 302, y: 150, width: 9, height: 74, fill: '#6b4a2b' }),

    // Sandstone wall and ledges behind the pool.
    el('path', {
      d: 'M-20 266 L-20 220 Q20 198 64 210 Q104 184 150 202 Q190 176 240 198 Q286 178 332 204 Q356 210 380 230 L380 276 Z',
      fill: '#b98b5a', stroke: '#1d1a16', 'stroke-width': 3, 'stroke-linejoin': 'round'
    }),
    el('path', {
      d: 'M-20 228 Q20 208 64 220 Q104 194 150 212 Q190 186 240 208 Q286 188 332 214 Q356 220 380 238',
      stroke: '#8a6a3a', 'stroke-width': 6, fill: 'none', opacity: .55
    }),

    // Upper pool and cascade feeding the main spring.
    el('ellipse', { cx: 184, cy: 214, rx: 64, ry: 18, fill: '#5ec8c6', stroke: '#1d1a16', 'stroke-width': 3 }),
    el('path', {
      d: 'M158 226 q8 30 3 54 l44 0 q-5 -24 3 -54 z',
      fill: '#9fd8ef', stroke: '#1d1a16', 'stroke-width': 3
    }),
    el('path', {
      d: 'M164 230 q3 22 1 44 M172 230 q2 24 1 46 M180 230 q-1 24 1 46 M188 230 q2 22 0 44 M196 230 q3 20 1 42',
      stroke: '#fffaf0', 'stroke-width': 3, fill: 'none', opacity: .8
    }),
    el('ellipse', { cx: 184, cy: 282, rx: 42, ry: 12, fill: '#fffaf0', opacity: .7 }),

    // Main spring-fed pool.
    el('path', {
      d: 'M8 284 Q64 250 124 262 Q170 242 216 256 Q268 240 318 266 Q358 288 352 338 Q346 390 308 420 Q246 444 182 430 Q108 420 58 388 Q18 360 12 320 Z',
      fill: '#2f9fae', stroke: '#1d1a16', 'stroke-width': 3
    }),
    el('path', {
      d: 'M28 306 Q78 278 128 288 Q170 270 214 282 Q262 268 304 290 Q334 306 330 340 Q326 380 296 402 Q244 422 184 412 Q120 404 78 378 Q44 356 38 326 Z',
      fill: '#5ec8c6', opacity: .55
    }),
    el('path', { d: 'M62 326 q30 -10 60 0 t60 0 t60 0 t60 0', stroke: 'rgba(255,255,255,.45)', 'stroke-width': 4, fill: 'none' }),
    el('path', { d: 'M84 362 q34 -10 68 0 t68 0 t68 0', stroke: 'rgba(255,255,255,.3)', 'stroke-width': 4, fill: 'none' }),
    el('ellipse', { cx: 90, cy: 386, rx: 30, ry: 10, fill: '#3b7d81', opacity: .75 }),
    el('ellipse', { cx: 288, cy: 374, rx: 26, ry: 9, fill: '#3b7d81', opacity: .7 }),
    rock(142, 284, .55, '#b0a696'),
    rock(226, 284, .55, '#a9a090'),

    // Banks framing the pool.
    el('path', {
      d: 'M-20 218 L112 218 Q94 252 88 292 Q80 344 94 396 Q58 438 -20 468 Z',
      fill: '#d9b97a', stroke: '#1d1a16', 'stroke-width': 3
    }),
    el('path', {
      d: 'M380 222 L272 222 Q284 254 290 292 Q298 346 288 402 Q328 442 380 466 Z',
      fill: '#d9b97a', stroke: '#1d1a16', 'stroke-width': 3
    }),
    el('path', {
      d: 'M-20 410 Q70 396 160 408 Q250 396 380 418 L380 700 L-20 700 Z',
      fill: '#c9a76d', stroke: '#1d1a16', 'stroke-width': 3
    }),
    rock(70, 430, .9, '#b0a696'),
    rock(300, 438, .8, '#a9a090'),

    // Tropical planting around the pool.
    pandanus(322, 274, .95),
    fern(44, 286, 1.1),
    fern(94, 250, .8),
    bush(28, 432, .8),
    bush(336, 424, .75)
  ]);
}

// The sandy bank between the land and the water, with rocks and a bush on top.
function waterBank() {
  return g([
    // Dry ground from just above the 5 m mark down to the bank, so the player
    // has a continuous shore to step back across instead of seeing the backdrop.
    el('path', {
      d: 'M0 158 Q36 152 72 158 T144 156 T216 162 T288 154 T360 160 L360 334 L0 334 Z',
      fill: '#d9c08e'
    }),
    // A faint walking trail from the bank up past the 5 m mark.
    el('path', {
      d: 'M150 332 Q138 288 148 252 T144 164',
      stroke: '#c9a76d', 'stroke-width': 24, fill: 'none', opacity: .4, 'stroke-linecap': 'round'
    }),
    // Soft dry-grass patches to stop the ground looking flat.
    el('ellipse', { cx: 78, cy: 252, rx: 58, ry: 20, fill: '#d0b17c', opacity: .45 }),
    el('ellipse', { cx: 268, cy: 232, rx: 52, ry: 18, fill: '#e7d3a4', opacity: .5 }),
    el('ellipse', { cx: 232, cy: 306, rx: 66, ry: 18, fill: '#d0b17c', opacity: .35 }),
    // Grass tufts between the bank and the mark.
    el('path', {
      d: 'M62 292 q-5 -16 0 -26 M62 292 q-13 3 -18 13 M62 292 q13 3 17 12 ' +
        'M98 234 q-5 -14 0 -23 M98 234 q-12 3 -17 12 M98 234 q12 3 16 11 ' +
        'M238 268 q-5 -15 0 -25 M238 268 q-13 3 -18 12 M238 268 q13 3 17 12 ' +
        'M286 310 q-5 -14 0 -23 M286 310 q-12 3 -16 12 M286 310 q12 3 16 11',
      stroke: '#3f7a2e', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round'
    }),
    el('path', {
      d: 'M0 330 Q36 320 72 330 T144 332 T216 326 T288 332 T360 328 L360 374 L0 374 Z',
      fill: '#e0c28a', stroke: '#1d1a16', 'stroke-width': 3
    }),
    el('path', {
      d: 'M0 359 q24 -6 48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 L360 374 L0 374 Z',
      fill: '#c9a76d'
    }),
    el('path', {
      d: 'M0 346 q24 -6 48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0',
      stroke: 'rgba(29,26,22,.18)', 'stroke-width': 3, fill: 'none'
    }),
    rock(38, 360, 1, '#a9a090'),
    rock(94, 368, .62, '#bdb5a6'),
    rock(300, 358, .85, '#a39a8b'),
    bush(312, 330, .9),
    // grass tufts along the bank
    el('path', {
      d: 'M126 354 q-5 -18 1 -28 M126 354 q-14 2 -19 14 M126 354 q14 2 18 13 M252 356 q-5 -16 0 -25 M252 356 q-13 2 -18 12 M252 356 q13 2 17 12',
      stroke: '#3f7a2e', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round'
    })
  ]);
}

// A Top End campsite: safe grass above the 50 m line, dry scrubby land below it,
// then a rocky riverbank.
function crocCampScene() {
  return g([
    // Safe camping grass (extends up into the stage letterbox).
    el('rect', { x: -200, y: -200, width: 760, height: 360, fill: '#8fb85a' }),
    el('ellipse', { cx: 70, cy: 40, rx: 120, ry: 46, fill: '#9cc367', opacity: .5 }),
    el('ellipse', { cx: 290, cy: 96, rx: 110, ry: 36, fill: '#7fae4a', opacity: .45 }),
    pandanus(30, 148, .75),
    pandanus(336, 140, .75),

    // Dry land below the line, where the tent starts.
    el('path', {
      d: 'M-20 150 Q70 142 160 150 Q250 142 380 150 L380 402 L-20 402 Z',
      fill: '#c9b27a'
    }),
    el('ellipse', { cx: 85, cy: 235, rx: 80, ry: 26, fill: '#d9c08e', opacity: .55 }),
    el('ellipse', { cx: 292, cy: 300, rx: 72, ry: 24, fill: '#b99c62', opacity: .45 }),
    el('ellipse', { cx: 170, cy: 350, rx: 90, ry: 22, fill: '#d9c08e', opacity: .4 }),
    // Spinifex and rocks on the dry land.
    el('path', {
      d: 'M54 228 q-5 -16 0 -26 M54 228 q-12 3 -17 12 M54 228 q12 3 16 11 ' +
        'M118 302 q-5 -14 0 -23 M118 302 q-11 3 -16 11 M118 302 q11 3 15 10 ' +
        'M282 218 q-5 -15 0 -24 M282 218 q-12 3 -17 12 M282 218 q12 3 16 11 ' +
        'M320 344 q-5 -14 0 -23 M320 344 q-11 3 -16 11 M320 344 q11 3 15 10',
      stroke: '#7f8f3a', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round'
    }),
    rock(44, 332, .55, '#b0a696'),
    rock(318, 252, .5, '#a9a090'),

    // River water behind the bank (extends down into the stage letterbox).
    water(400, 300),
    // Sandy bank and rocks at the water's edge.
    el('path', {
      d: 'M-20 390 Q50 378 110 388 T220 384 T380 392 L380 420 L-20 420 Z',
      fill: '#e0c28a', stroke: '#1d1a16', 'stroke-width': 3
    }),
    rock(30, 404, .85, '#a9a090'),
    rock(326, 398, .7, '#a39a8b'),
    bush(300, 380, .8),
    el('path', {
      d: 'M-40 430 q30 -10 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0',
      stroke: 'rgba(255,255,255,.28)', 'stroke-width': 4, fill: 'none'
    })
  ]);
}

// A small house with a corrugated roof, used in the remote community scene.
function communityHouse(x, y, s = 1, roof = '#8a5a3a') {
  return g([
    el('rect', { x: -42, y: -46, width: 84, height: 46, fill: '#f2d89b', stroke: '#1d1a16', 'stroke-width': 3 }),
    el('path', { d: 'M-52 -46 L0 -80 L52 -46 z', fill: roof, stroke: '#1d1a16', 'stroke-width': 3 }),
    el('rect', { x: -9, y: -25, width: 18, height: 25, fill: '#7a3b1e', stroke: '#1d1a16', 'stroke-width': 2 }),
    el('rect', { x: 14, y: -35, width: 16, height: 13, fill: '#9fd8ef', stroke: '#1d1a16', 'stroke-width': 2 }),
    el('rect', { x: -32, y: -35, width: 14, height: 12, fill: '#9fd8ef', stroke: '#1d1a16', 'stroke-width': 2 })
  ], { transform: `translate(${x} ${y}) scale(${s})` });
}

// A remote NT community on red dirt: houses, a water tower, power lines and a bushfire horizon.
function remoteCommunity() {
  return g([
    // Hot, dusty sky (extends into the stage letterbox).
    el('rect', { x: -200, y: -200, width: 760, height: 440, fill: '#f4c28a' }),
    el('circle', { cx: 292, cy: 82, r: 38, fill: '#e0892e', opacity: .25 }),

    // Distant scrub and red dirt.
    el('path', {
      d: 'M-20 238 Q30 214 82 230 Q124 202 172 224 Q220 204 270 226 Q320 202 380 224 L380 270 L-20 270 Z',
      fill: '#7f8a4a'
    }),
    el('path', {
      d: 'M-20 236 Q80 226 180 236 Q280 226 380 238 L380 700 L-20 700 Z',
      fill: '#c9a25a'
    }),

    // Dirt road running into the community.
    el('path', {
      d: 'M112 700 Q150 550 184 440 Q204 358 214 242 L258 244 Q244 358 230 444 Q208 560 196 700 Z',
      fill: '#b07a44', opacity: .7
    }),
    el('path', { d: 'M150 690 Q176 552 198 444 Q212 360 222 246', stroke: 'rgba(90,60,30,.35)', 'stroke-width': 4, fill: 'none' }),

    // Ground texture.
    el('ellipse', { cx: 66, cy: 380, rx: 88, ry: 28, fill: '#d9b97a', opacity: .5 }),
    el('ellipse', { cx: 312, cy: 430, rx: 78, ry: 25, fill: '#b99c62', opacity: .4 }),
    el('ellipse', { cx: 180, cy: 300, rx: 60, ry: 18, fill: '#d9b97a', opacity: .35 }),

    // A smaller house further into the community.
    communityHouse(228, 306, .58, '#8a5a3a'),

    // Water tower.
    g([
      el('path', { d: 'M14 0 L8 -74 M42 0 L48 -74 M28 0 L28 -74 M10 -44 L46 -44', stroke: '#6b4a2b', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }),
      el('rect', { x: 2, y: -112, width: 52, height: 40, rx: 6, fill: '#cfd8d0', stroke: '#1d1a16', 'stroke-width': 3 }),
      el('path', { d: 'M2 -108 h52', stroke: '#9aa79a', 'stroke-width': 4 }),
      text(28, -86, 'WATER', { size: 10 })
    ], { transform: 'translate(10 340) scale(.9)' }),

    // Power poles with sagging lines.
    el('path', { d: 'M166 300 v-80 M284 292 v-76', stroke: '#6b4a2b', 'stroke-width': 5, fill: 'none' }),
    el('path', { d: 'M156 224 h20 M274 220 h20', stroke: '#6b4a2b', 'stroke-width': 5, fill: 'none' }),
    el('path', { d: 'M166 220 Q225 246 284 216', stroke: 'rgba(40,35,30,.55)', 'stroke-width': 2, fill: 'none' }),

    // Roadside scrub.
    bush(332, 330, .6),
    fern(72, 420, .9),
    rock(328, 456, .55, '#b0a696')
  ]);
}

// Barkly: the highway east of Tennant Creek, seen from above. A long sealed road with
// gravel shoulders, spinifex, termite mounds and a wall of red dust rolling down from
// the north. Top-down so the ute can be dragged clear of the bitumen.
function dustStormScene() {
  const ink = (w = 3) => ({ stroke: '#1d1a16', 'stroke-width': w });
  let seed = 17;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  // Spinifex, seen from above: a dense burst of stiff, dry olive blades.
  const tuft = (x, y, s = 1, c = '#94954e') => {
    const blades = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + ((i * 7) % 5) * 0.08;
      const r1 = 3 + (i % 3);
      const r2 = 9 + ((i * 5) % 4) * 2.4 + (i % 2) * 2.5;
      blades.push(el('path', {
        d: `M${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)}`
          + ` q${(Math.cos(a + 0.5) * 4).toFixed(1)} ${(Math.sin(a + 0.5) * 4).toFixed(1)}`
          + ` ${(Math.cos(a) * r2).toFixed(1)} ${(Math.sin(a) * r2).toFixed(1)}`,
        stroke: i % 3 === 0 ? '#b5ad6a' : i % 3 === 1 ? c : '#6f7a3a',
        'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round'
      }));
    }
    return g([
      el('ellipse', { cx: 2, cy: 3, rx: 11, ry: 9, fill: 'rgba(70,50,20,.16)' }),
      el('ellipse', { rx: 8, ry: 6.5, fill: '#6f7a3a', opacity: .5 }),
      ...blades,
      el('circle', { r: 3.6, fill: '#5f6a2e' })
    ], { transform: `translate(${x} ${y}) scale(${s})` });
  };

  const bushTop = (x, y, s = 1) => g([
    el('ellipse', { cx: 3, cy: 4, rx: 23, ry: 19, fill: 'rgba(40,60,20,.2)' }),
    el('circle', { cx: -9, cy: 1, r: 12, fill: '#3f6b2e', ...ink(2) }),
    el('circle', { cx: 9, cy: -3, r: 13, fill: '#4f8a3c', ...ink(2) }),
    el('circle', { cx: 2, cy: 10, r: 11, fill: '#3f6b2e', ...ink(2) }),
    el('circle', { cx: 0, cy: -2, r: 5, fill: '#5c9b45' })
  ], { transform: `translate(${x} ${y}) scale(${s})` });

  // Cathedral mound from above: a rough, buttressed blob catching the light.
  const mound = (x, y, s = 1) => g([
    el('ellipse', { cx: 4, cy: 6, rx: 19, ry: 15, fill: 'rgba(80,50,20,.2)' }),
    el('path', {
      d: 'M-16 4 Q-18 -8 -6 -10 Q-4 -18 8 -15 Q19 -14 18 -4 Q24 3 15 8 Q12 16 0 15 Q-12 17 -15 7 Q-19 8 -16 4 Z',
      fill: '#b5641a', ...ink(2.4)
    }),
    el('path', {
      d: 'M-12 2 Q-12 -6 -4 -8 Q0 -13 8 -10 Q14 -8 12 -2',
      stroke: '#d9a06a', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round'
    }),
    el('circle', { cx: 9, cy: 6, r: 1.5, fill: '#8a4a34' }),
    el('circle', { cx: -7, cy: 8, r: 1.2, fill: '#8a4a34' }),
    el('circle', { cx: -2, cy: -3, r: 1.6, fill: '#8a4a34' }),
    el('circle', { cx: 4, cy: 12, r: 1.1, fill: '#8a4a34' }),
    el('circle', { cx: 13, cy: -1, r: 1.1, fill: '#8a4a34' })
  ], { transform: `translate(${x} ${y}) scale(${s})` });

  const stone = (x, y, r = 4, c = '#b0a58f') => el('ellipse', {
    cx: x, cy: y, rx: r, ry: r * 0.7, fill: c, opacity: .85
  });

  const guidePost = (x, y) => g([
    el('rect', { x: -2.5, y: -7, width: 5, height: 14, rx: 1.5, fill: '#fffaf0', ...ink(1.4) }),
    el('circle', { cx: 0, cy: -3, r: 1.8, fill: '#c8412f' })
  ], { transform: `translate(${x} ${y})` });

  const roadL = 132, roadR = 228, mid = 180;

  // Loose gravel and dry litter along both shoulders.
  const litter = [];
  for (let i = 0; i < 52; i++) {
    const left = i % 2 === 0;
    const x = left ? roadL - 28 + rnd() * 28 : roadR + rnd() * 28;
    litter.push(stone(x, -40 + rnd() * 580, 1 + rnd() * 1.8, i % 5 ? '#b08f5e' : '#d3c5a6'));
  }

  // Worn wheel tracks in each lane.
  const wear = [138, 160, 186, 208].map(x =>
    el('rect', { x, y: -400, width: 15, height: 1300, fill: '#4f4f4f', opacity: .45 }));

  return g([
    // Red Barkly dirt with patches of paler grass country (overflows the viewBox so
    // tall phones stay filled).
    el('rect', { x: -260, y: -400, width: 880, height: 1300, fill: '#c9a15f' }),
    el('ellipse', { cx: -30, cy: 120, rx: 200, ry: 100, fill: '#bd8f50', opacity: .5 }),
    el('ellipse', { cx: 420, cy: 330, rx: 210, ry: 120, fill: '#bd8f50', opacity: .45 }),
    el('ellipse', { cx: 60, cy: 540, rx: 180, ry: 90, fill: '#d9b877', opacity: .5 }),

    // Old station track ruts running beside the highway.
    el('path', { d: 'M58 -80 q-10 200 6 340 q8 80 -4 260', stroke: 'rgba(140,104,54,.35)', 'stroke-width': 7, fill: 'none' }),
    el('path', { d: 'M82 -80 q-8 200 8 340 q8 80 -6 260', stroke: 'rgba(140,104,54,.28)', 'stroke-width': 5, fill: 'none' }),
    el('path', { d: 'M296 -80 q12 200 -4 340 q-8 80 6 260', stroke: 'rgba(140,104,54,.3)', 'stroke-width': 6, fill: 'none' }),

    // Gravel shoulders either side of the bitumen.
    el('rect', { x: roadL - 28, y: -400, width: 28, height: 1300, fill: '#b58f5c' }),
    el('rect', { x: roadR, y: -400, width: 28, height: 1300, fill: '#b58f5c' }),
    el('path', { d: `M${roadL - 28} -400 v1300 M${roadR + 28} -400 v1300`, stroke: 'rgba(110,82,40,.5)', 'stroke-width': 2 }),

    // Sealed road, edge lines and the dashed centre line.
    el('rect', { x: roadL, y: -400, width: roadR - roadL, height: 1300, fill: '#5e5e5e' }),
    el('rect', { x: roadL + 4, y: -400, width: 5, height: 1300, fill: '#f6e7c8', opacity: .9 }),
    el('rect', { x: roadR - 9, y: -400, width: 5, height: 1300, fill: '#f6e7c8', opacity: .9 }),
    el('line', { x1: mid, y1: -400, x2: mid, y2: 900, stroke: '#f6e7c8', 'stroke-width': 5, 'stroke-dasharray': '22 20', opacity: .95 }),
    ...wear,

    // Surface patches, cracks and a tar seam.
    el('path', { d: 'M148 92 q16 -9 28 2 q10 12 -3 20 q-18 8 -28 -5 z', fill: '#545454', opacity: .9 }),
    el('path', { d: 'M196 262 l16 28 l-5 24', stroke: '#4c4c4c', 'stroke-width': 2.5, fill: 'none' }),
    el('path', { d: 'M140 352 q10 15 3 32', stroke: '#4c4c4c', 'stroke-width': 2.5, fill: 'none' }),
    el('path', { d: 'M212 -120 q-6 90 4 150 q6 50 -2 120', stroke: 'rgba(74,74,74,.85)', 'stroke-width': 3, fill: 'none' }),

    ...litter,

    // White guide posts with red reflectors along the verge.
    guidePost(roadL - 12, 150), guidePost(roadL - 12, 330), guidePost(roadL - 12, 470),
    guidePost(roadR + 12, 90), guidePost(roadR + 12, 250), guidePost(roadR + 12, 410),

    // Roadside scrub, kept clear of the shoulder the ute pulls onto.
    tuft(54, 90, 1.1), tuft(94, 176, .85), mound(42, 258, 1.15), tuft(24, 332, .9),
    tuft(70, 448, 1.2), bushTop(96, 512, .9), tuft(30, 540, 1),
    tuft(300, 92, 1.05), bushTop(326, 196, .9), tuft(268, 286, .85), mound(306, 372, 1),
    tuft(342, 448, 1.1), tuft(286, 522, .9)
  ]);
}

// Alice Springs / Red Centre: dry creek bed under red ranges. The foreground is a
// broad, cracked riverbed and the safe high bank sits above it, so climbing out reads
// as soon as the flood arrives.
function flashFloodScene() {
  const tuft = (x, y, s = 1, c = '#8a9a4a') => g([
    el('path', {
      d: 'M0 0 q-7 -24 -3 -38 M0 0 q-20 -6 -28 -22 M0 0 q20 -6 28 -22 M0 0 q7 -22 1 -34',
      stroke: c, 'stroke-width': 4.5, fill: 'none', 'stroke-linecap': 'round'
    })
  ], { transform: `translate(${x} ${y}) scale(${s})` });

  const ghostGum = (x, y, s = 1) => g([
    el('path', {
      d: 'M0 0 q-7 -50 4 -74 M4 -74 q-24 -2 -38 -26 M4 -74 q26 -2 36 -28',
      stroke: '#f2ede0', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round'
    }),
    el('path', {
      d: 'M0 0 q-12 22 0 34 M0 2 q12 20 2 32',
      stroke: '#a05a3a', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round'
    }),
    el('circle', { cx: -28, cy: -102, r: 16, fill: '#5f8a45', stroke: '#1d1a16', 'stroke-width': 2 }),
    el('circle', { cx: 2, cy: -112, r: 19, fill: '#6f9a52', stroke: '#1d1a16', 'stroke-width': 2 }),
    el('circle', { cx: 28, cy: -96, r: 14, fill: '#5f8a45', stroke: '#1d1a16', 'stroke-width': 2 })
  ], { transform: `translate(${x} ${y}) scale(${s})` });

  const crack = (x, y, s = 1) => g([
    el('path', {
      d: 'M-64 6 l18 -16 l22 8 l12 -12 l24 12 l-8 18 l-26 6 l-16 -10 z',
      stroke: 'rgba(120,86,40,.5)', 'stroke-width': 2.5, fill: 'none', 'stroke-linejoin': 'round'
    }),
    el('path', {
      d: 'M-34 -2 l6 10 M-2 4 l10 -6 M22 6 l6 8',
      stroke: 'rgba(120,86,40,.42)', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round'
    })
  ], { transform: `translate(${x} ${y}) scale(${s})` });

  return g([
    // Sky and low sun (both overflow the viewBox so tall phones stay filled).
    el('rect', { x: -240, y: -320, width: 840, height: 560, fill: '#ffd9a0' }),
    el('circle', { cx: 300, cy: 84, r: 50, fill: '#ffe9a8', opacity: .45 }),
    sun(300, 84, 24),
    el('path', {
      d: 'M-240 150 q60 -8 120 0 t120 0 t120 0 t120 0 t120 0 t120 0',
      stroke: 'rgba(255,250,240,.4)', 'stroke-width': 3, fill: 'none'
    }),
    el('path', {
      d: 'M82 96 q7 -7 14 0 q7 -7 14 0 M112 78 q5 -5 10 0 q5 -5 10 0',
      stroke: '#1d1a16', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round'
    }),

    // Two layers of red ranges behind the high bank.
    el('path', {
      d: 'M-240 220 l78 -86 l66 52 l76 -70 l78 78 l70 -56 l86 62 l74 -48 l82 56 L600 340 L-240 340 Z',
      fill: '#a05a3a', stroke: '#1d1a16', 'stroke-width': 3, 'stroke-linejoin': 'round'
    }),
    el('path', {
      d: 'M-240 250 l70 -54 l62 40 l78 -50 l76 56 l72 -38 l88 46 l72 -34 l84 40 L600 340 L-240 340 Z',
      fill: '#8a4a34', opacity: .9, stroke: '#1d1a16', 'stroke-width': 3, 'stroke-linejoin': 'round'
    }),
    el('rect', { x: -240, y: 196, width: 840, height: 54, fill: '#f6e7c8', opacity: .24 }),

    // The safe high bank: red earth, dry grass and the sandy lip above the creek.
    el('path', {
      d: 'M-240 226 Q-120 200 20 206 Q120 214 200 196 Q280 180 380 196 Q480 212 600 190 L600 700 L-240 700 Z',
      fill: '#c98a4a'
    }),
    el('path', {
      d: 'M-240 260 Q-100 238 30 248 Q160 258 290 240 Q420 224 600 244 L600 330 L-240 330 Z',
      fill: '#cfae72', opacity: .9
    }),
    el('path', {
      d: 'M-240 316 Q-100 296 20 306 Q140 318 260 300 Q400 282 600 306 L600 420 L-240 420 Z',
      fill: '#e0c28a', stroke: '#1d1a16', 'stroke-width': 3, 'stroke-linejoin': 'round'
    }),
    el('path', {
      d: 'M186 348 Q170 306 178 264 Q186 232 180 210',
      stroke: '#d9b877', 'stroke-width': 22, fill: 'none', opacity: .5, 'stroke-linecap': 'round'
    }),
    el('path', {
      d: 'M-240 352 Q-80 338 60 348 Q200 358 340 340 Q480 324 600 344',
      stroke: 'rgba(160,90,58,.35)', 'stroke-width': 5, fill: 'none'
    }),

    // Dry creek bed with a darker channel and sun-cracked mud.
    el('path', {
      d: 'M-240 404 Q-80 388 60 400 Q200 412 340 394 Q480 376 600 398 L600 700 L-240 700 Z',
      fill: '#d8c391', stroke: '#1d1a16', 'stroke-width': 3
    }),
    el('path', {
      d: 'M-240 448 Q-60 424 90 440 Q240 456 380 432 Q500 414 600 438 L600 700 L-240 700 Z',
      fill: '#cbb07a', opacity: .7
    }),
    el('path', {
      d: 'M-240 472 q60 -8 120 0 t120 0 t120 0 t120 0 t120 0 t120 0',
      stroke: 'rgba(140,100,55,.3)', 'stroke-width': 4, fill: 'none'
    }),
    el('path', {
      d: 'M-240 540 q60 -8 120 0 t120 0 t120 0 t120 0 t120 0 t120 0',
      stroke: 'rgba(140,100,55,.24)', 'stroke-width': 4, fill: 'none'
    }),
    crack(70, 486, .9),
    crack(292, 520, .8),
    crack(160, 586, 1),
    crack(36, 558, .7),
    rock(304, 470, .7, '#b0a696'),
    rock(56, 508, .55, '#a9a090'),
    rock(206, 548, .45, '#bdb5a6'),

    // Fallen timber washed up in the bed.
    g([
      el('path', {
        d: 'M-52 0 q30 -8 66 -2 M-18 -2 l-10 -14 M10 0 l10 -16 M32 -2 l8 -12',
        stroke: '#6b4a2b', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round'
      })
    ], { transform: 'translate(258 470) rotate(-8)' }),
    g([
      el('path', {
        d: 'M-30 0 q20 -5 42 -1 M-8 -1 l-6 -9 M10 0 l7 -10',
        stroke: '#7a5334', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round'
      })
    ], { transform: 'translate(92 612) rotate(6)' }),

    // Ghost gums and spinifex on the high bank. The middle stays clear for the climb.
    ghostGum(54, 302, .9),
    ghostGum(336, 292, .8),
    tuft(104, 300, 1.1),
    tuft(146, 280, .8, '#6f8f3a'),
    tuft(238, 288, 1),
    tuft(280, 310, .9, '#6f8f3a'),
    tuft(382, 326, 1.1),
    tuft(26, 334, .8),
    tuft(210, 330, .7, '#6f8f3a')
  ]);
}

function houseInside(calm = false) {
  return g([
    el('rect', { x: 30, y: 150, width: 300, height: 240, fill: '#e9dcc0', stroke: '#1d1a16', 'stroke-width': 4 }),
    el('rect', { x: 200, y: 180, width: 100, height: 90, fill: calm ? '#9fd8ef' : '#3a3d66', stroke: '#1d1a16', 'stroke-width': 4 }),
    el('line', { x1: 250, y1: 180, x2: 250, y2: 270, stroke: '#1d1a16', 'stroke-width': 3 }),
    calm ? sun(250, 225, 12) : el('path', { d: 'M210 200 q20 10 40 0 t40 0 M210 230 q20 10 40 0 t40 0', stroke: '#fffaf0', 'stroke-width': 3, fill: 'none' }),
    el('rect', { x: 60, y: 230, width: 70, height: 160, fill: '#b98b5a', stroke: '#1d1a16', 'stroke-width': 4 }),
    text(95, 220, 'BATHROOM', { size: 12 }),
    person({ x: 160, y: 380, s: .8, mood: calm ? 'happy' : 'scared' })
  ]);
}

// Croc Creek: a bright Top End billabong on a hot day. Paperbark forest crowds a sandy
// bank, pandanus and reeds line the water, and lily pads, dragonflies and a fish splash
// keep the scene alive. All three boss steps share this one place.
function crocCreekScene() {
  const uid = Math.random().toString(36).slice(2, 8);
  const skyId = `ccsky${uid}`, waterId = `ccwater${uid}`;
  let seed = 29;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const sway = (kids, delay = 0) => g(kids, { class: 'cc-sway', style: `animation-delay:${delay}s` });
  const bob = (kids, delay = 0) => g(kids, { class: 'cc-bob', style: `animation-delay:${delay}s` });

  // Paperbark trunk: pale, soft and slightly leaning.
  const trunk = (x, baseY, h, w = 8, lean = 0) => g([
    el('path', {
      d: `M${x - w / 2} ${baseY} q${lean} ${-h * .55} ${lean * .4} ${-h} l${w} 0 q${-lean * .4} ${h * .45} 0 ${h} z`,
      fill: '#e8dcc0', stroke: '#1d1a16', 'stroke-width': 2.4, 'stroke-linejoin': 'round'
    }),
    el('path', {
      d: `M${x - w / 4} ${baseY - 4} q${lean * .5} ${-h * .4} ${lean * .2} ${-h * .78}`,
      stroke: 'rgba(150,126,88,.5)', 'stroke-width': 2, fill: 'none'
    })
  ]);

  // A clump of stiff reeds with brown seed heads, rooted at (x, y).
  const reeds = (x, y, s = 1, delay = 0, color = '#3f6b2e') => {
    const blades = [];
    for (let i = 0; i < 7; i++) {
      const bx = (i - 3) * 6 + (i % 2 ? 2 : -2);
      const h = 26 + ((i * 13) % 5) * 6;
      const bend = bx * 1.6 + (i % 2 ? 9 : -9);
      blades.push(el('path', {
        d: `M0 0 q${(bend * .4).toFixed(1)} ${(-h * .55).toFixed(1)} ${bend} ${-h}`,
        stroke: i % 3 === 0 ? '#6f9a48' : color, 'stroke-width': 3.4, fill: 'none', 'stroke-linecap': 'round'
      }));
      blades.push(el('ellipse', {
        cx: bend, cy: -h, rx: 2.6, ry: 5, fill: '#8a6534',
        transform: `rotate(${(bend * .5).toFixed(1)} ${bend} ${-h})`
      }));
    }
    return g([sway(blades, delay)], { transform: `translate(${x} ${y}) scale(${s})` });
  };

  // Water lily: a notched pad with an optional pink flower, bobbing on the current.
  const lily = (x, y, s = 1, delay = 0, flower = false) => g([
    bob([
      el('ellipse', { rx: 20, ry: 10, fill: '#3f7a2e', stroke: '#1d1a16', 'stroke-width': 2.4, transform: 'rotate(-7)' }),
      el('path', { d: 'M1 1 L17 -5', stroke: 'rgba(180,226,140,.7)', 'stroke-width': 2.2, fill: 'none' }),
      ...(flower ? [
        ...[[-7, -9], [0, -12], [7, -9], [-4, -4], [4, -4]].map(([fx, fy], i) =>
          el('ellipse', {
            cx: fx, cy: fy, rx: 3.6, ry: 5.4, fill: i % 2 ? '#ffd7e2' : '#ffb3c9',
            stroke: '#1d1a16', 'stroke-width': 1.4, transform: `rotate(${(i - 2) * 24} ${fx} ${fy})`
          })),
        el('circle', { cx: 0, cy: -7, r: 2.6, fill: '#ffd25e', stroke: '#1d1a16', 'stroke-width': 1.2 })
      ] : [])
    ], delay)
  ], { transform: `translate(${x} ${y}) scale(${s})` });

  // Dragonfly: a red-brown body with pale wings, darting above the water.
  const dragonfly = (x, y, delay) => g([
    g([
      el('ellipse', { rx: 5.5, ry: 1.7, fill: '#2f7f8f', stroke: '#1d1a16', 'stroke-width': 1 }),
      el('ellipse', { cx: -1, cy: -4, rx: 8, ry: 2.6, fill: '#d6f4f4', opacity: .85, transform: 'rotate(-26 -1 -4)' }),
      el('ellipse', { cx: 3, cy: -4, rx: 8, ry: 2.6, fill: '#d6f4f4', opacity: .85, transform: 'rotate(26 3 -4)' }),
      el('circle', { cx: -6, cy: 0, r: 2.2, fill: '#c8412f' })
    ], { class: 'cc-fly', style: `animation-delay:${delay}s` })
  ], { transform: `translate(${x} ${y}) scale(1.18)` });

  const canopies = [];
  const canopy = (cx, cy, rx, ry, fill) => canopies.push(el('ellipse', { cx, cy, rx, ry, fill }));

  // Pebbles and a few tracks in the sand.
  const pebbles = [];
  for (let i = 0; i < 14; i++) {
    pebbles.push(el('ellipse', {
      cx: -20 + rnd() * 400, cy: 252 + rnd() * 42,
      rx: 1.6 + rnd() * 2.4, ry: 1 + rnd() * 1.6,
      fill: i % 4 === 0 ? '#cdb98f' : '#b08f5e', opacity: .85
    }));
  }
  const prints = [[204, 276, -18], [192, 284, -14], [182, 292, -8]].map(([x, y, r]) =>
    el('ellipse', { cx: x, cy: y, rx: 4.4, ry: 2.6, fill: 'rgba(133,98,50,.55)', transform: `rotate(${r} ${x} ${y})` }));

  // Slow ripples and a column of sun glitter.
  const ripples = [];
  [338, 362, 390, 420, 450].forEach((y, i) => {
    ripples.push(el('path', {
      d: `M${-20 + (i % 2) * 30} ${y} q30 -7 60 0 t60 0 t60 0 t60 0 t60 0 t60 0`,
      stroke: 'rgba(255,255,255,.42)', 'stroke-width': 2.4, fill: 'none',
      class: 'cc-glimmer', style: `animation-delay:${-i * .7}s`
    }));
  });
  const glitter = [];
  for (let i = 0; i < 9; i++) {
    glitter.push(el('rect', {
      x: 278 + ((i * 17) % 42), y: 320 + i * 13, width: 22 + (i % 3) * 12, height: 2.6, rx: 1.3,
      fill: '#fff6d8', opacity: .55
    }));
  }

  // Left and right monsoon forest canopy, leaving a clear gap over the creek.
  canopy(-4, 202, 40, 26, '#3f6b2e');
  canopy(34, 184, 44, 28, '#4a7a35');
  canopy(80, 198, 38, 24, '#5c9042');
  canopy(118, 186, 30, 20, '#4a7a35');
  canopy(146, 210, 24, 15, '#3f6b2e');
  canopy(220, 204, 26, 17, '#3f6b2e');
  canopy(252, 184, 32, 21, '#4a7a35');
  canopy(292, 172, 40, 26, '#5c9042');
  canopy(334, 188, 36, 23, '#4a7a35');
  canopy(378, 176, 34, 23, '#3f6b2e');

  return g([
    el('defs', {}, [
      el('linearGradient', {
        id: skyId, gradientUnits: 'userSpaceOnUse', x1: '0', y1: '-140', x2: '0', y2: '300'
      }, [
        el('stop', { offset: '0', 'stop-color': '#8fd0e6' }),
        el('stop', { offset: '.5', 'stop-color': '#cfeef0' }),
        el('stop', { offset: '1', 'stop-color': '#ffe9b8' })
      ]),
      el('linearGradient', {
        id: waterId, gradientUnits: 'userSpaceOnUse', x1: '0', y1: '298', x2: '0', y2: '480'
      }, [
        el('stop', { offset: '0', 'stop-color': '#74c7bb' }),
        el('stop', { offset: '.3', 'stop-color': '#3f9ba1' }),
        el('stop', { offset: '.72', 'stop-color': '#2f7f8f' }),
        el('stop', { offset: '1', 'stop-color': '#215f6d' })
      ])
    ]),

    // Sky, sun and drifting clouds. The sky and water overflow the viewBox so tall
    // phones never show a letterbox band.
    el('rect', { x: -300, y: -400, width: 960, height: 700, fill: `url(#${skyId})` }),
    el('ellipse', { cx: 306, cy: 54, rx: 66, ry: 46, fill: '#ffe9a8', opacity: .45 }),
    sun(306, 54, 23),
    g([
      el('ellipse', { cx: 62, cy: 62, rx: 34, ry: 13, fill: '#fffaf0', opacity: .9 }),
      el('ellipse', { cx: 90, cy: 54, rx: 25, ry: 11, fill: '#fffaf0', opacity: .9 }),
      el('ellipse', { cx: 36, cy: 55, rx: 19, ry: 9, fill: '#fffaf0', opacity: .85 })
    ], { class: 'cc-drift' }),
    g([
      el('ellipse', { cx: 208, cy: 36, rx: 27, ry: 10, fill: '#fffaf0', opacity: .7 }),
      el('ellipse', { cx: 232, cy: 30, rx: 18, ry: 8, fill: '#fffaf0', opacity: .7 })
    ], { class: 'cc-drift', style: 'animation-delay:-7s' }),
    g([
      el('ellipse', { cx: 150, cy: -44, rx: 30, ry: 9, fill: '#fffaf0', opacity: .55 }),
      el('ellipse', { cx: 174, cy: -48, rx: 20, ry: 7, fill: '#fffaf0', opacity: .55 })
    ], { class: 'cc-drift', style: 'animation-delay:-11s' }),

    // Magpie geese crossing the hot sky.
    ...[
      [86, 96, .9], [110, 84, .7], [130, 100, .55], [236, 4, .5], [254, -3, .4]
    ].map(([x, y, s]) => el('path', {
      d: 'M-9 0 q4.5 -5.5 9 0 q4.5 -5.5 9 0',
      stroke: '#3d4a3d', 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round',
      opacity: .7, transform: `translate(${x} ${y}) scale(${s})`
    })),

    // Distant escarpment behind the forest.
    el('path', {
      d: 'M-300 218 L-300 190 L-40 190 Q4 174 46 186 Q88 168 130 182 Q172 166 214 180 Q256 164 298 178 Q340 164 400 184 L660 190 L660 218 Z',
      fill: '#8aa877'
    }),
    el('path', {
      d: 'M-300 212 L-40 208 Q0 198 46 208 Q92 192 134 206 Q178 190 220 204 Q262 192 304 206 Q348 192 400 206 L660 202',
      stroke: 'rgba(240,246,224,.45)', 'stroke-width': 4, fill: 'none'
    }),

    // Forest masses on either side of the open water.
    el('path', {
      d: 'M-300 268 L-300 200 L-40 200 Q-14 174 14 188 Q38 168 66 186 Q94 170 120 192 Q140 184 152 204 L152 268 Z',
      fill: '#2f5228'
    }),
    el('path', {
      d: 'M208 268 L208 206 Q228 186 252 198 Q276 174 302 192 Q326 176 350 194 Q376 182 400 200 L660 200 L660 268 Z',
      fill: '#2f5228'
    }),
    ...canopies,
    trunk(24, 268, 58, 8, -2),
    trunk(70, 268, 50, 7, 3),
    trunk(116, 268, 42, 6, -2),
    trunk(252, 268, 44, 7, 2),
    trunk(300, 268, 62, 8, -3),
    trunk(344, 268, 50, 7, 2),

    // A sulphur-crested cockatoo keeping an eye on the creek.
    g([
      el('path', { d: 'M-7 4 q-2 10 4 12 l6 0 q-3 -5 -1 -12 z', fill: '#e8e4d8', stroke: '#1d1a16', 'stroke-width': 1.8 }),
      el('ellipse', { cx: 0, cy: -2, rx: 8, ry: 7, fill: '#fffaf0', stroke: '#1d1a16', 'stroke-width': 2 }),
      el('path', { d: 'M2 -8 q-1 -8 3 -9 q2 6 0 9', fill: '#ffd25e', stroke: '#1d1a16', 'stroke-width': 1.5 }),
      el('circle', { cx: 4, cy: -3, r: 1.3, fill: '#1d1a16' }),
      el('path', { d: 'M7 0 l5 2 l-5 2 z', fill: '#8a8a7a', stroke: '#1d1a16', 'stroke-width': 1.2 })
    ], { transform: 'translate(322 218) scale(.95)' }),

    // Tea-coloured water, then the sandy bank overhanging its far lip.
    el('path', {
      d: 'M-300 720 L-300 300 Q-220 296 -160 300 Q-100 304 -40 298 Q0 292 44 298 Q88 304 132 297 Q176 290 220 298 Q264 305 308 297 Q352 290 400 298 Q460 304 520 298 Q600 292 660 300 L660 720 Z',
      fill: `url(#${waterId})`
    }),
    el('path', {
      d: 'M-300 300 L-300 248 L-40 248 Q0 240 44 246 Q88 252 132 246 Q176 240 220 247 Q264 253 308 246 Q350 240 400 247 L660 247 L660 300 Q520 306 400 300 Q352 306 308 301 Q264 296 220 302 Q176 308 132 301 Q88 294 44 302 Q0 307 -40 300 L-300 300 Z',
      fill: '#dcb97a', stroke: '#1d1a16', 'stroke-width': 3, 'stroke-linejoin': 'round'
    }),
    el('path', {
      d: 'M-40 300 Q0 307 44 302 Q88 294 132 301 Q176 308 220 302 Q264 296 308 301 Q352 306 400 300',
      stroke: 'rgba(120,86,40,.5)', 'stroke-width': 4, fill: 'none'
    }),
    ...pebbles,
    ...prints,

    // Pandanus, ferns and a flowering bush on the bank.
    g([sway([pandanus(0, 0, 1)], -1.2)], { transform: 'translate(28 256) scale(1.05)' }),
    g([sway([fern(0, 0, 1)], -2.6)], { transform: 'translate(92 258) scale(1.25)' }),
    g([sway([bush(0, 0, 1)], -.8)], { transform: 'translate(296 258) scale(.62)' }),
    g([sway([pandanus(0, 0, 1)], -3.4)], { transform: 'translate(338 256) scale(.9) rotate(4)' }),

    // Soft shade where the bank meets the water, then glitter and ripples.
    el('path', {
      d: 'M-300 306 L660 306 L660 334 Q520 320 400 332 Q300 344 200 332 Q100 320 -40 330 Q-160 336 -300 326 Z',
      fill: '#1f5f3f', opacity: .14
    }),
    el('ellipse', { cx: 306, cy: 372, rx: 52, ry: 74, fill: '#ffe9a8', opacity: .1 }),
    ...glitter,
    ...ripples,

    // Life on the water: a fish splash, lily pads and a lotus.
    g([
      el('ellipse', { rx: 16, ry: 5.5, stroke: 'rgba(255,250,240,.75)', 'stroke-width': 2.2, fill: 'none' }),
      el('path', { d: 'M-11 1 q4 -13 8 -3 M0 2 q2 -17 6 -6 M9 1 q5 -12 8 -4', stroke: '#fffaf0', 'stroke-width': 2, fill: 'none', opacity: .85 })
    ], { transform: 'translate(132 376)' }),
    lily(78, 398, 1, -.6, true),
    lily(300, 420, .82, -1.8),
    lily(160, 436, .66, -2.4),

    // Reeds at the water's edge and dark reeds framing the foreground corners.
    reeds(52, 306, 1.15, -.5, '#3f6b2e'),
    reeds(118, 305, .8, -1.8, '#4a7a35'),
    reeds(352, 304, 1.1, -1.1, '#3f6b2e'),
    reeds(10, 486, 2.05, -2.2, '#2f5228'),
    reeds(352, 486, 1.9, -1.4, '#2f5228'),

    dragonfly(94, 356, 0),
    dragonfly(266, 384, -3)
  ]);
}

// A boss is a 3-step mini story. Each step shows a caption and two choices.
function boss(id, title, bg, failKind, steps) {
  return {
    id, boss: true, seconds: 15, failKind, prompt: '👑 BOSS: ' + title, bg,
    setup(ctx) {
      let i = 0;
      const progress = text(W / 2, 30, '', { size: 16, fill: '#ffe9a8', stroke: '#1d1a16', strokeWidth: 4 });
      const draw = () => {
        const step = steps[i];
        while (ctx.svg.firstChild) ctx.svg.firstChild.remove();
        ctx.svg.append(el('rect', { x: 0, y: 0, width: W, height: H, fill: bg }));
        step.draw(ctx.svg);
        progress.textContent = `BOSS: ${title}  ·  ${i + 1} / ${steps.length}`;
        ctx.svg.append(progress);
        step.caption.forEach((line, k) => ctx.svg.append(text(W / 2, 120 + k * 30, line, { size: 24, fill: '#fffaf0', stroke: '#1d1a16', strokeWidth: 6 })));
        ctx.clearButtons();
        ctx.buttons(shuffle(step.choices).map(c => ({
          label: c.label, ok: c.ok,
          onPick: () => {
            if (!c.ok) { ctx.failTip = c.tip; ctx.lose(); return; }
            i++;
            if (i >= steps.length) { ctx.win(); return; }
            ctx.sound && ctx.sound('coin');
            draw();
          }
        })));
      };
      draw();
    }
  };
}

export const GAMES = [

  // 1. Fishing too close to the edge: tap to back away past the 5 m line.
  {
    id: 'croc-edge', prompt: 'STEP BACK!', bg: '#d9c08e',
    setup(ctx) {
      const { svg } = ctx;
      svg.append(
        water(360, 120),
        waterBank(),
        el('line', { x1: 0, y1: 190, x2: W, y2: 190, stroke: '#1d1a16', 'stroke-width': 3, 'stroke-dasharray': '10 8' }),
        text(310, 182, '5 m', { size: 20 }),
        text(W / 2, 236, 'TAP TAP TAP', { size: 16, fill: 'rgba(29,26,22,.45)' })
      );
      const croc = crocEyes({ x: 230, y: 420, s: 1 });
      svg.append(croc);
      let py = 350;
      const guy = person({ x: 150, y: py, s: 1, mood: 'scared' });
      // fishing rod
      guy.appendChild(el('line', { x1: 14, y1: -40, x2: 60, y2: -100, stroke: '#6b4a2b', 'stroke-width': 4 }));
      guy.appendChild(el('path', { d: 'M60 -100 Q 80 -40 70 40', stroke: '#1d1a16', 'stroke-width': 1.5, fill: 'none' }));
      svg.append(guy);
      let crocY = 420, done = false;
      ctx.svg.addEventListener('pointerdown', () => {
        if (done) return;
        py -= 24;
        place(guy, 150, py);
        if (py < 190) { done = true; ctx.win(); }
      });
      ctx.onTick((p) => {
        crocY = 420 - p * 40;
        place(croc, 230 - p * 60, crocY);
      });
    }
  },

  // 2. To swim or not: only jump in where the sign says swimming area.
  {
    id: 'swim-sign', prompt: 'SWIM?', bg: '#cfeef0', ownBackdrop: true,
    setup(ctx) {
      const safe = Math.random() < 0.4;
      const variant = safe ? 'safe' : pick(['croc', 'none']);
      ctx.correct = safe ? 'swim' : 'stay';
      ctx.svg.append(berrySprings());
      if (variant === 'safe') ctx.svg.append(sign(72, 300, ['SWIMMING', 'AREA'], { bg: '#4f8a3c', fg: '#fffaf0' }));
      if (variant === 'croc') ctx.svg.append(sign(72, 300, ['DANGER', 'CROCODILES'], { bg: '#ffd25e', fg: '#c8412f', w: 130 }));
      if (variant === 'none') {
        // A bare post and no sign is the clue.
        ctx.svg.append(el('rect', { x: 68, y: 300, width: 8, height: 70, fill: '#6b4a2b', stroke: '#1d1a16', 'stroke-width': 2 }));
        ctx.svg.append(text(W / 2, 172, '(no sign...)', { size: 18, fill: '#fffaf0', stroke: '#1d1a16', strokeWidth: 4 }));
      }
      ctx.svg.append(person({ x: 300, y: 304, s: .9 }));
      if (variant !== 'safe' && Math.random() < 0.5) ctx.svg.append(crocEyes({ x: 200, y: 352, s: .6 }));
      ctx.buttons([
        { label: 'Jump in', ok: ctx.correct === 'swim' },
        { label: 'Stay out', ok: ctx.correct === 'stay' }
      ]);
    },
    // If the player freezes, staying out is the safe outcome.
    timeoutResult: (ctx) => ctx.correct === 'stay'
  },

  // 3. Camping: drag the tent beyond the 50 m line.
  {
    id: 'croc-camp', prompt: 'PITCH IT FAR!', bg: '#8fb85a', ownBackdrop: true,
    setup(ctx) {
      ctx.svg.append(
        crocCampScene(),
        el('line', { x1: 0, y1: 150, x2: W, y2: 150, stroke: '#1d1a16', 'stroke-width': 3, 'stroke-dasharray': '10 8' }),
        text(312, 142, '50 m', { size: 20 }),
        text(W / 2, 80, 'DRAG THE TENT UP HERE', { size: 15, fill: 'rgba(29,26,22,.5)' }),
        crocEyes({ x: 90, y: 440, s: .7 })
      );
      const tent = items.tent();
    tent.setAttribute('data-ok', true);
      ctx.svg.append(tent);
      ctx.draggable(tent, 200, 370, {
        scale: 1.2,
        onDrop: (x, y) => { if (y < 150) ctx.win(); }
      });
    }
  },

  // 4. Box jellyfish sting: drag the vinegar onto the sting.
  {
    id: 'stinger-vinegar', prompt: 'TREAT THE STING!', bg: '#cfeefc',
    setup(ctx) {
      ctx.svg.append(
        // an arm
        el('path', { d: 'M-10 150 C 120 130, 220 150, 300 170 L 300 230 C 220 215, 120 200, -10 220 z', fill: '#c68642', stroke: '#1d1a16', 'stroke-width': 3 }),
        el('circle', { cx: 318, cy: 200, r: 34, fill: '#c68642', stroke: '#1d1a16', 'stroke-width': 3 })
      );
      // sting welts
      const welts = g([
        el('path', { d: 'M80 165 q30 20 60 0 t60 5', stroke: '#c8412f', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }),
        el('path', { d: 'M90 195 q30 -15 60 0 t60 0', stroke: '#c8412f', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' })
      ]);
      ctx.svg.append(welts, text(150, 120, 'OUCH!', { size: 26, fill: '#c8412f' }));
      const opts = shuffle([['vinegar', true], ['freshwater', false], ['fizzy', false]]);
      opts.forEach(([key, ok], i) => {
        const node = items[key]();
        node.setAttribute('data-ok', ok);
        ctx.svg.append(node);
        const x = 70 + i * 110;
        ctx.draggable(node, x, 380, {
          scale: 1.3,
          onDrop: (dx, dy) => {
            if (dy > 120 && dy < 260) { ok ? ctx.win() : ctx.lose(); return; }
            return 'reset';
          }
        });
      });
    }
  },

  // 5. Stinger season beach: pick the stinger suit.
  {
    id: 'stinger-suit', prompt: 'SUIT UP!', bg: '#8fd0e0',
    setup(ctx) {
      const months = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY'];
      ctx.svg.append(
        water(130, 90, '#2f8fa8'),
        el('rect', { x: 0, y: 220, width: W, height: 260, fill: '#f2d89b' }),
        g([
          el('rect', { x: -38, y: -30, width: 76, height: 64, rx: 6, fill: '#fffaf0', stroke: '#1d1a16', 'stroke-width': 3 }),
          el('rect', { x: -38, y: -30, width: 76, height: 20, fill: '#c8412f', stroke: '#1d1a16', 'stroke-width': 3 }),
          text(0, 22, pick(months), { size: 24 })
        ], { transform: 'translate(300 60)' }),
        text(130, 60, 'STINGER SEASON', { size: 18, fill: '#fffaf0', stroke: '#1d1a16', strokeWidth: 4 }),
        person({ x: W / 2, y: 330, s: 1, shirt: '#f28ab2' })
      );
      const opts = shuffle([['suit', true], ['sunnies', false], ['floaty', false]]);
      opts.forEach(([key, ok], i) => {
        const node = items[key]();
        node.setAttribute('data-ok', ok);
        node.classList.add('tap-target');
        place(node, 70 + i * 110, 420, 1.1);
        // bigger invisible hit area for small fingers
        node.insertBefore(el('circle', { r: 40, fill: 'transparent' }), node.firstChild);
        node.addEventListener('pointerdown', (e) => { e.stopPropagation(); ok ? ctx.win() : ctx.lose(); });
        ctx.svg.append(node);
      });
    }
  },

  // 6. Cyclone kit: tap only the essentials.
  {
    id: 'cyclone-kit', prompt: 'PACK THE KIT!', bg: '#d9d2f0',
    setup(ctx) {
      ctx.svg.append(
        // swirl
        el('path', { d: 'M310 60 m-28 0 a28 28 0 1 1 28 28 a17 17 0 1 1 -14 -17', stroke: '#6a5aa8', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }),
        text(120, 60, 'CYCLONE COMING', { size: 20, fill: '#fffaf0', stroke: '#1d1a16', strokeWidth: 4 })
      );
      // the kit box
      const kit = g([
        el('rect', { x: -70, y: -30, width: 140, height: 60, rx: 8, fill: '#e0892e', stroke: '#1d1a16', 'stroke-width': 3 }),
        text(0, 8, 'KIT', { size: 22, fill: '#fffaf0' })
      ], { transform: `translate(${W / 2} 430)` });
      const counter = text(W / 2, 395, '0 / 3', { size: 18 });
      ctx.svg.append(kit, counter);
      const good = shuffle(['water', 'torch', 'radio', 'firstaid', 'batteries']).slice(0, 3);
      const bad = shuffle(['tv', 'beachball', 'console', 'duck']).slice(0, 3);
      const all = shuffle([...good.map(k => [k, true]), ...bad.map(k => [k, false])]);
      let packed = 0;
      all.forEach(([key, ok], i) => {
        const node = items[key]();
        node.setAttribute('data-ok', ok);
        node.insertBefore(el('circle', { r: 42, fill: 'transparent' }), node.firstChild);
        node.classList.add('tap-target');
        const x = 70 + (i % 3) * 110, y = 185 + Math.floor(i / 3) * 115;
        place(node, x, y, 1.1);
        node.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (!ok) { ctx.lose(); return; }
          node.style.pointerEvents = 'none';
          node.style.transition = 'transform .25s ease-in';
          place(node, W / 2, 430, .4);
          packed++;
          counter.textContent = `${packed} / 3`;
          if (packed === 3) ctx.win();
        });
        ctx.svg.append(node);
      });
    }
  },

  // 7. Flooded causeway: turn around before the car reaches the water.
  {
    id: 'flood-road', prompt: 'FLOODED ROAD!', bg: '#a9c46a',
    setup(ctx) {
      ctx.svg.append(
        el('rect', { x: 120, y: 0, width: 120, height: H, fill: '#6d6d6d' }),
        el('line', { x1: W / 2, y1: 0, x2: W / 2, y2: H, stroke: '#fffaf0', 'stroke-width': 4, 'stroke-dasharray': '18 16' }),
        el('rect', { x: 0, y: 60, width: W, height: 110, fill: '#7a6a3a', opacity: .9 }),
        el('path', { d: 'M0 90 q30 -12 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 M0 130 q30 -12 60 0 t60 0 t60 0 t60 0 t60 0 t60 0', stroke: 'rgba(255,255,255,.4)', 'stroke-width': 4, fill: 'none' }),
        sign(60, 230, ['FLOODWAY'], { bg: '#ffd25e', w: 100 })
      );
      if (Math.random() < 0.5) ctx.svg.append(crocEyes({ x: 290, y: 120, s: .6 }));
      const car = g([
        el('rect', { x: -24, y: -40, width: 48, height: 80, rx: 12, fill: '#c8412f', stroke: '#1d1a16', 'stroke-width': 3 }),
        el('rect', { x: -18, y: -30, width: 36, height: 20, rx: 4, fill: '#9fd8ef', stroke: '#1d1a16', 'stroke-width': 2 }),
        el('rect', { x: -18, y: 14, width: 36, height: 16, rx: 4, fill: '#9fd8ef', stroke: '#1d1a16', 'stroke-width': 2 })
      ]);
      ctx.svg.append(car);
      place(car, W / 2 + 30, 380);
      ctx.onTick((p) => place(car, W / 2 + 30, 380 - p * 220));
      ctx.buttons(shuffle([
        { label: 'Drive through', ok: false },
        { label: 'Turn around', ok: true }
      ]));
    }
  },

  // 8. Heatwave: keep tapping water, avoid the sugary drink.
  {
    id: 'heat-drink', prompt: 'HYDRATE!', bg: '#ffd9a0', timeoutWins: true,
    setup(ctx) {
      ctx.svg.append(
        text(250, 70, '41°C', { size: 40, fill: '#c8412f', stroke: '#fffaf0', strokeWidth: 5 }),
        person({ x: W / 2, y: 300, s: 1.1, mood: 'meh' })
      );
      // hydration meter
      const meterBg = el('rect', { x: 40, y: 120, width: 280, height: 26, rx: 13, fill: '#fffaf0', stroke: '#1d1a16', 'stroke-width': 3 });
      const meter = el('rect', { x: 43, y: 123, width: 137, height: 20, rx: 10, fill: '#2f7fd0' });
      ctx.svg.append(meterBg, meter, text(W / 2, 112, 'HYDRATION', { size: 14 }));
      let level = 0.5, over = false;
      const set = () => meter.setAttribute('width', Math.max(0, Math.min(1, level)) * 274);
      const bottle = items.water(), can = items.fizzy();
      [[bottle, 100, +0.13], [can, 260, -0.3]].forEach(([node, x, delta]) => {
        node.insertBefore(el('circle', { r: 44, fill: 'transparent' }), node.firstChild);
        node.classList.add('tap-target');
        place(node, x, 400, 1.3);
        let pulse = 0;   // tap feedback: pulse the scale on the transform attribute
        // A CSS transform animation would override that attribute and fling the item
        // to the SVG origin, so the bump is done here in the attribute instead.
        const bump = () => {
          cancelAnimationFrame(pulse);
          const t0 = performance.now();
          const step = (now) => {
            const k = Math.min(1, (now - t0) / 200);
            place(node, x, 400, 1.3 * (1 + 0.25 * Math.sin(Math.PI * k)));
            pulse = k < 1 ? requestAnimationFrame(step) : 0;
          };
          pulse = requestAnimationFrame(step);
        };
        node.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (over) return;
          level = Math.min(1, level + delta);
          bump();
          set();
          if (level <= 0) { over = true; ctx.lose(); }
        });
        ctx.svg.append(node);
      });
      ctx.onTick((p, dt) => {
        if (over) return;
        level -= dt * 0.32 * ctx.speed;
        set();
        if (level <= 0) { over = true; ctx.lose(); }
      });
    }
  },

  // 9. Snake bite: drag the wide bandage onto the bitten leg.
  {
    id: 'snake-bite', prompt: 'FIRST AID!', bg: '#e7f3d6',
    setup(ctx) {
      ctx.svg.append(
        // a leg, foot to the right
        el('path', { d: 'M-10 140 L 250 150 L 250 210 L -10 220 z', fill: '#e0ac69', stroke: '#1d1a16', 'stroke-width': 3 }),
        el('path', { d: 'M250 150 q60 -10 80 40 q-10 25 -80 20 z', fill: '#e0ac69', stroke: '#1d1a16', 'stroke-width': 3 }),
        el('circle', { cx: 190, cy: 175, r: 4, fill: '#c8412f' }),
        el('circle', { cx: 204, cy: 178, r: 4, fill: '#c8412f' }),
        text(190, 130, 'BITE!', { size: 22, fill: '#c8412f' }),
        // the culprit slithering off
        el('path', { d: 'M40 290 q20 -20 40 0 t40 0 t40 0', stroke: '#7a5b1e', 'stroke-width': 12, fill: 'none', 'stroke-linecap': 'round' }),
        el('circle', { cx: 162, cy: 290, r: 9, fill: '#7a5b1e' })
      );
      const opts = shuffle([['bandage', true], ['knife', false], ['rope', false]]);
      opts.forEach(([key, ok], i) => {
        const node = items[key]();
        node.setAttribute('data-ok', ok);
        ctx.svg.append(node);
        ctx.draggable(node, 70 + i * 110, 400, {
          scale: 1.2,
          onDrop: (x, y) => {
            if (y > 110 && y < 250) { ok ? ctx.win() : ctx.lose(); return; }
            return 'reset';
          }
        });
      });
    }
  },

  // 10. Smoke on the horizon: leave early.
  {
    id: 'bushfire-leave', prompt: 'SMOKE!', bg: '#f4c28a', ownBackdrop: true,
    setup(ctx) {
      ctx.svg.append(remoteCommunity());
      const smoke = g([
        el('circle', { cx: 0, cy: 0, r: 30, fill: '#7d7268' }),
        el('circle', { cx: 25, cy: -30, r: 36, fill: '#8a7f75' }),
        el('circle', { cx: -20, cy: -60, r: 40, fill: '#968b80' }),
        el('circle', { cx: 15, cy: -100, r: 46, fill: '#a39a90' })
      ]);
      const flames = el('path', { d: 'M-60 0 q10 -40 20 -10 q8 -50 22 -8 q10 -45 20 -4 q12 -36 20 -2 q8 -30 18 24 z', fill: '#e0892e', stroke: '#c8412f', 'stroke-width': 3 });
      ctx.svg.append(smoke, flames);
      // The closest house, with the player outside.
      ctx.svg.append(communityHouse(122, 330, 1.05, '#c8412f'));
      ctx.svg.append(person({ x: 240, y: 340, s: .9, mood: 'scared' }));
      ctx.onTick((p) => {
        place(smoke, 300 - p * 50, 200, 0.6 + p * 0.8);
        place(flames, 300 - p * 90, 230, 0.4 + p * 1.2);
      });
      ctx.buttons(shuffle([
        { label: 'Leave now', ok: true },
        { label: 'Film it', ok: false },
        { label: 'Wait & see', ok: false }
      ]));
    }
  },

  // 11. Storm over the pool: tap every swimmer to get them out before lightning strikes.
  {
    id: 'lightning-pool', prompt: 'STORM! EVERYONE OUT!', bg: '#5b6478', ownBackdrop: true,
    setup(ctx) {
      const { svg } = ctx;
      svg.append(
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#5b6478' }),
        el('rect', { x: 0, y: 360, width: W, height: 120, fill: '#cbb894' }),
        el('rect', { x: 20, y: 180, width: 320, height: 190, rx: 14, fill: '#3fa7c9', stroke: '#fffaf0', 'stroke-width': 8 }),
        el('path', { d: 'M40 230 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0', stroke: 'rgba(255,255,255,.4)', 'stroke-width': 4, fill: 'none' }),
        el('path', { d: 'M40 300 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0', stroke: 'rgba(255,255,255,.4)', 'stroke-width': 4, fill: 'none' }),
        text(W / 2, 410, 'TAP THE SWIMMERS', { size: 15, fill: 'rgba(29,26,22,.5)' })
      );
      const cloud = items.stormcloud();
      svg.append(place(cloud, 260, 70, 1.1));
      const boltNode = items.bolt();
      boltNode.setAttribute('opacity', 0);
      svg.append(place(boltNode, 240, 130, 1));
      sfxHook(ctx, 'thunder');
      const counter = text(60, 165, '0 / 3', { size: 18, fill: '#fffaf0' });
      svg.append(counter);
      const spots = shuffle([[70, 230], [180, 300], [290, 240], [120, 320], [250, 330]]).slice(0, 3);
      const skins = shuffle(['#8d5524', '#c68642', '#f1c27d']);
      const caps = shuffle(['#c8412f', '#ffd25e', '#4f8a3c']);
      let out = 0;
      spots.forEach(([x, y], i) => {
        const node = items.swimmer(skins[i], caps[i]);
        node.setAttribute('data-ok', 'true');
        node.classList.add('tap-target');
        node.insertBefore(el('circle', { r: 40, fill: 'transparent' }), node.firstChild);
        place(node, x, y, 1.1);
        node.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          node.removeAttribute('data-ok');
          node.style.pointerEvents = 'none';
          node.style.transition = 'transform .3s ease-out';
          place(node, 40 + out * 50, 420, .8);
          out++;
          counter.textContent = `${out} / 3`;
          if (out === 3) ctx.win();
        });
        svg.append(node);
      });
      ctx.onTick((p) => {
        // flicker the bolt more often as time runs out
        boltNode.setAttribute('opacity', Math.random() < p * 0.12 ? 1 : 0);
      });
    }
  },

  // 12. Dusk at the campsite: drag the repellent onto the camper before the mozzies swarm.
  {
    id: 'mozzie-dusk', prompt: 'MOZZIES!', bg: '#6a4c93', ownBackdrop: true,
    setup(ctx) {
      const { svg } = ctx;
      svg.append(
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#6a4c93' }),
        el('circle', { cx: 290, cy: 250, r: 44, fill: '#f4845f' }),
        el('rect', { x: 0, y: 250, width: W, height: 230, fill: '#3d5a3a' }),
        el('path', { d: 'M0 250 q60 -30 120 0 t120 0 t120 0', fill: '#2f4a2c' }),
        text(90, 60, 'DUSK', { size: 26, fill: '#ffd25e', stroke: '#1d1a16', strokeWidth: 5 })
      );
      const camper = person({ x: 180, y: 330, s: 1.1, shirt: '#e0892e', mood: 'meh' });
      svg.append(camper);
      sfxHook(ctx, 'buzz');
      const bugs = [];
      for (let i = 0; i < 6; i++) {
        const m = items.mozzie();
        const b = { node: m, a: Math.random() * 6.28, r: 70 + Math.random() * 40, sp: 2 + Math.random() * 2 };
        svg.append(m); bugs.push(b);
      }
      ctx.onTick((p, dt) => {
        for (const b of bugs) {
          b.a += b.sp * dt * ctx.speed;
          const r = b.r * (1 - p * 0.6);
          place(b.node, 180 + Math.cos(b.a) * r, 250 + Math.sin(b.a * 1.3) * r * .6, 1.2);
        }
      });
      const opts = shuffle([['repellent', true], ['perfume', false], ['icecream', false]]);
      opts.forEach(([key, ok], i) => {
        const node = items[key]();
        node.setAttribute('data-ok', ok);
        svg.append(node);
        ctx.draggable(node, 70 + i * 110, 420, {
          scale: 1.2,
          onDrop: (x, y) => {
            if (x > 110 && x < 250 && y > 180 && y < 350) { ok ? ctx.win() : ctx.lose(); return; }
            return 'reset';
          }
        });
      });
    }
  },

  // 13. Beach in the midday sun: tap the three sun-safe items.
  {
    id: 'sun-slip', prompt: 'SLIP SLOP SLAP!', bg: '#9fdcef', ownBackdrop: true,
    setup(ctx) {
      const { svg } = ctx;
      svg.append(
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#9fdcef' }),
        sun(300, 60, 30),
        el('rect', { x: 0, y: 170, width: W, height: 310, fill: '#f2d89b' }),
        text(110, 60, 'UV: EXTREME', { size: 20, fill: '#c8412f', stroke: '#fffaf0', strokeWidth: 5 })
      );
      const counter = text(W / 2, 395, '0 / 3', { size: 18 });
      svg.append(counter);
      const good = shuffle(['longshirt', 'sunscreen', 'hat', 'sunnies', 'umbrella']).slice(0, 3);
      const bad = shuffle(['icecream', 'phone', 'beachball', 'fizzy']).slice(0, 3);
      const all = shuffle([...good.map(k => [k, true]), ...bad.map(k => [k, false])]);
      let got = 0;
      all.forEach(([key, ok], i) => {
        const node = items[key]();
        node.setAttribute('data-ok', ok);
        node.insertBefore(el('circle', { r: 42, fill: 'transparent' }), node.firstChild);
        node.classList.add('tap-target');
        place(node, 70 + (i % 3) * 110, 225 + Math.floor(i / 3) * 105, 1.05);
        node.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (!ok) { ctx.lose(); return; }
          node.removeAttribute('data-ok');
          node.style.pointerEvents = 'none';
          node.style.transition = 'transform .25s ease-in';
          place(node, 120 + got * 60, 440, .55);
          got++;
          counter.textContent = `${got} / 3`;
          if (got === 3) ctx.win();
        });
        svg.append(node);
      });
    }
  },

  // BOSS 1: Cyclone Night. Three decisions in a row; one wrong move loses a life.
  boss('boss-cyclone', 'CYCLONE NIGHT', '#2d2f52', 'blowaway', [
    {
      caption: ['A cyclone warning is out', 'for tonight!'],
      draw(svg) { svg.append(place(items.radio(), 180, 260, 2)); svg.append(swirlAt(70, 330)); },
      choices: [
        { label: 'Check the kit & listen to the radio', ok: true },
        { label: 'Drive to the beach to watch', ok: false, tip: 'When a cyclone is coming, stay home, check your kit and listen to the radio for updates.' }
      ]
    },
    {
      caption: ['The wind is howling!', 'Where do you shelter?'],
      draw(svg) { svg.append(houseInside()); },
      choices: [
        { label: 'Strongest room, away from windows', ok: true },
        { label: 'By the big window to watch', ok: false, tip: 'Shelter in the strongest part of the house and stay well clear of windows.' }
      ]
    },
    {
      caption: ['Suddenly... it is calm', 'and quiet outside.'],
      draw(svg) { svg.append(houseInside(true)); },
      choices: [
        { label: 'Stay inside, it is the eye', ok: true },
        { label: 'Go out, it is over', ok: false, tip: 'Beware the calm eye: violent winds can return from the other direction. Stay inside.' }
      ]
    }
  ]),

  // BOSS 2: Croc Creek.
  boss('boss-croc', 'CROC CREEK', '#3f6b45', 'chomp', [
    {
      caption: ['Hot day at the creek.', 'No signs anywhere.'],
      draw(svg) { svg.append(crocCreekScene(), person({ x: 180, y: 280, s: .9 })); },
      choices: [
        { label: 'Jump in to cool off', ok: false, tip: 'Never swim where crocs may live. Only swim in signed swimming areas.' },
        { label: 'Stay out of the water', ok: true }
      ]
    },
    {
      caption: ['Time to fish.', 'Where do you stand?'],
      draw(svg) {
        svg.append(crocCreekScene());
        // The log juts out over the water, tempting you to step on it.
        svg.append(el('ellipse', { cx: 275, cy: 314, rx: 78, ry: 9, fill: 'rgba(20,50,40,.2)' }));
        svg.append(el('rect', { x: 198, y: 300, width: 154, height: 16, rx: 8, fill: '#7a5b1e', stroke: '#1d1a16', 'stroke-width': 3 }));
        svg.append(el('path', { d: 'M222 300 q6 -8 14 -7 M318 316 q7 7 15 5', stroke: '#8a6534', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }));
        svg.append(text(275, 292, 'LOG', { size: 14, fill: '#fffaf0', stroke: '#1d1a16', strokeWidth: 4 }));
      },
      choices: [
        { label: 'On the log over the water', ok: false, tip: 'Never stand on logs over the water. Stand at least 5 m back from the edge.' },
        { label: '5 m back from the edge', ok: true }
      ]
    },
    {
      caption: ['Your lure is snagged', 'in the water!'],
      draw(svg) { svg.append(crocCreekScene(), crocEyes({ x: 220, y: 340, s: .8 })); },
      choices: [
        { label: 'Wade in to grab it', ok: false, tip: 'Never go into the water to get a lure back. Cut the line.' },
        { label: 'Cut the line, leave it', ok: true }
      ]
    }
  ]),

  // 14. Kakadu: rangers trap a problem croc at the ramp. One tap, right moment.
  {
    id: 'croc-trap', prompt: 'TRAP IT!', bg: '#7fb8a8',
    setup(ctx) {
      const { svg } = ctx, W = VIEW.w, H = VIEW.h;
      svg.append(
        water(240, 240, '#2f7f8f'),
        text(W / 2, 44, 'ONE TAP - WHEN THE CROC IS IN THE TRAP', { size: 14, fill: '#fffaf0', stroke: '#1d1a16', strokeWidth: 4 })
      );
      const zx = 190, zy = 300, zr = 54;
      svg.append(el('circle', { cx: zx, cy: zy, r: zr, fill: 'rgba(255,233,168,.3)', stroke: '#ffe9a8', 'stroke-width': 4, 'stroke-dasharray': '9 9' }));
      svg.append(g([
        el('rect', { x: -42, y: -28, width: 84, height: 56, rx: 10, fill: 'none', stroke: '#cfd6dc', 'stroke-width': 6 }),
        el('line', { x1: -42, y1: -28, x2: 42, y2: 28, stroke: '#cfd6dc', 'stroke-width': 5 }),
        el('line', { x1: -42, y1: 28, x2: 42, y2: -28, stroke: '#cfd6dc', 'stroke-width': 5 })
      ], { transform: `translate(${zx} ${zy})` }));
      const croc = crocEyes({ x: -70, y: 300, s: 1 });
      croc.setAttribute('data-croc', '');
      svg.append(croc);
      let done = false, cx = -70;
      svg.addEventListener('pointerdown', () => {
        if (done) return;
        done = true;
        if (Math.abs(cx - zx) <= zr) ctx.win(); else ctx.lose();
      });
      ctx.onTick((p) => { if (done) return; cx = -70 + p * (W + 160); place(croc, cx, 300, 1); });
    }
  },

  // 15. Arnhem Land: get everyone out of the rock hole before the croc surfaces.
  {
    id: 'rock-hole', prompt: 'GET OUT!', bg: '#d9c08e',
    setup(ctx) {
      const { svg } = ctx, W = VIEW.w, H = VIEW.h;
      svg.append(
        el('path', { d: 'M-10 84 q70 -44 150 -22 q80 -22 150 10 l0 120 q-80 22 -150 4 q-80 -18 -150 0 z', fill: '#b9a074', stroke: '#1d1a16', 'stroke-width': 4 }),
        el('ellipse', { cx: W / 2, cy: 286, rx: 150, ry: 78, fill: '#2f7f8f', stroke: '#1d1a16', 'stroke-width': 4 }),
        text(W / 2, 40, 'DRAG EVERYONE TO THE BANK', { size: 15 })
      );
      const croc = crocEyes({ x: W / 2 + 66, y: 286, s: .5 });
      svg.append(croc);
      let saved = 0;
      [[118, 296], [246, 262]].forEach(([x, y]) => {
        const who = person({ x, y, s: .8, mood: 'scared' });
        who.setAttribute('data-ok', true);
        svg.append(who);
        ctx.draggable(who, x, y, {
          scale: .8,
          hitBox: { y: -46, rx: 34, ry: 62 },
          onDrop: (dx, dy) => {
            if (dy > 396) {
              who.style.pointerEvents = 'none'; who.style.opacity = '.45';
              saved++;
              if (saved >= 2) ctx.win();
              return;
            }
            return 'reset';
          }
        });
      });
      ctx.onTick((p) => place(croc, W / 2 + 66, 286 - p * 30, .5 + p * .7));
    }
  },

  // 16. Barkly: pull the ute off the road before the dust wall hits.
  {
    id: 'dust-storm', prompt: 'DUST STORM!', bg: '#cfae72', ownBackdrop: true,
    setup(ctx) {
      const { svg } = ctx;
      svg.append(dustStormScene());

      // The wall of dust: one rolling mass, pale at the top and dark at the leading
      // edge, with a scalloped front and grit swirling through it.
      const wallId = `dustwall${Math.random().toString(36).slice(2, 8)}`;
      const edge = (y, phase) => {
        let d = '', x = -300, i = 0;
        while (x < 700) {
          const r = 26 + ((i * 37 + phase) % 6) * 4;
          const bulge = 22 + ((i * 53 + phase) % 5) * 8;
          d += ` q${r} ${bulge} ${r * 2} 0`;
          x += r * 2;
          i++;
        }
        return { d, endX: x };
      };
      const lip = edge(30, 0);
      const wallPath = `M-300 -900 L-300 30${lip.d} L${lip.endX} -900 Z`;
      const puffs = [];
      for (let i = 0; i < 16; i++) {
        puffs.push(el('circle', {
          cx: -270 + i * 66, cy: -74 + (i % 3) * 24, r: 18 + (i % 3) * 8,
          fill: i % 2 ? '#9f7439' : '#b1874b', opacity: .26
        }));
      }
      // Soft lobes give the wall some volume instead of a flat wash.
      const lobes = [
        [-180, -18, 96, 54, '#9c7038', .16], [70, -52, 120, 62, '#9c7038', .14],
        [300, -8, 104, 56, '#9c7038', .16], [430, -70, 110, 58, '#9c7038', .13],
        [-60, -170, 130, 70, '#f3e6c6', .22], [260, -210, 140, 76, '#f3e6c6', .2],
        [520, -160, 120, 64, '#f3e6c6', .18]
      ].map(([cx, cy, rx, ry, fill, opacity]) => el('ellipse', { cx, cy, rx, ry, fill, opacity }));
      const grit = [], streaks = [];
      for (let i = 0; i < 34; i++) grit.push([-260 + ((i * 149) % 640), -220 + ((i * 83) % 280), 1.4 + (i % 3) * 1.3]);
      for (let i = 0; i < 6; i++) {
        streaks.push(el('path', {
          d: `M-250 ${-220 + i * 42} q90 -12 180 0 t180 0`,
          stroke: 'rgba(255,250,240,.3)', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round'
        }));
      }
      const swirl = g([
        ...streaks,
        ...grit.map(([cx, cy, r]) => el('circle', { cx, cy, r, fill: '#8a6534', opacity: .5 }))
      ]);
      const dust = g([
        el('defs', {}, [el('linearGradient', { id: wallId, x1: '0', y1: '0', x2: '0', y2: '1' }, [
          el('stop', { offset: '0', 'stop-color': '#e3cfa4' }),
          el('stop', { offset: .42, 'stop-color': '#d0b07a' }),
          el('stop', { offset: .68, 'stop-color': '#b98c52' }),
          el('stop', { offset: .86, 'stop-color': '#9c7038' }),
          el('stop', { offset: '1', 'stop-color': '#7f5a2a' })
        ])]),
        el('path', { d: wallPath, fill: `url(#${wallId})`, 'fill-opacity': .96 }),
        ...lobes,
        ...puffs,
        swirl,
        // Dark rim where the wall meets the road, so the front reads as solid dust.
        el('path', { d: `M-300 30${lip.d}`, stroke: '#8a5f2e', 'stroke-width': 3, fill: 'none', opacity: .5 })
      ]);
      place(dust, 0, 40);
      svg.append(dust);

      // A top-down ute: tray, cab, bullbar and blinking hazard lights.
      const blinkers = [];
      const blinker = (x, y) => {
        const c = el('rect', { x: x - 3.5, y: y - 3.5, width: 7, height: 7, rx: 2, fill: '#ffb400', stroke: '#1d1a16', 'stroke-width': 1.6 });
        blinkers.push(c);
        return c;
      };
      const car = g([
        el('ellipse', { cx: 2, cy: 8, rx: 30, ry: 48, fill: 'rgba(80,52,20,.26)' }),
        // Dust kicked up behind the tray.
        el('circle', { cx: -12, cy: 62, r: 12, fill: '#e0c48d', opacity: .55 }),
        el('circle', { cx: 10, cy: 72, r: 15, fill: '#d9b877', opacity: .45 }),
        el('circle', { cx: -2, cy: 88, r: 11, fill: '#d9b877', opacity: .32 }),
        el('rect', { x: -29, y: -34, width: 8, height: 24, rx: 3, fill: '#2b2b2b', stroke: '#1d1a16', 'stroke-width': 2 }),
        el('rect', { x: 21, y: -34, width: 8, height: 24, rx: 3, fill: '#2b2b2b', stroke: '#1d1a16', 'stroke-width': 2 }),
        el('rect', { x: -29, y: 12, width: 8, height: 24, rx: 3, fill: '#2b2b2b', stroke: '#1d1a16', 'stroke-width': 2 }),
        el('rect', { x: 21, y: 12, width: 8, height: 24, rx: 3, fill: '#2b2b2b', stroke: '#1d1a16', 'stroke-width': 2 }),
        // Body, tray and cab.
        el('rect', { x: -23, y: -46, width: 46, height: 92, rx: 9, fill: '#c8412f', stroke: '#1d1a16', 'stroke-width': 3 }),
        el('rect', { x: -19, y: 6, width: 38, height: 36, rx: 4, fill: '#a8301f', stroke: '#1d1a16', 'stroke-width': 2.5 }),
        el('path', { d: 'M-19 16 h38 M-19 26 h38 M-19 36 h38', stroke: 'rgba(255,250,240,.26)', 'stroke-width': 2.5 }),
        el('rect', { x: -19, y: -42, width: 38, height: 44, rx: 6, fill: '#d94f3d', stroke: '#1d1a16', 'stroke-width': 2.5 }),
        el('rect', { x: -15, y: -38, width: 30, height: 15, rx: 4, fill: '#9fd8ef', stroke: '#1d1a16', 'stroke-width': 2 }),
        el('path', { d: 'M-12 -35 l9 -1', stroke: '#fffaf0', 'stroke-width': 2.5, opacity: .75 }),
        el('rect', { x: -14, y: -8, width: 28, height: 10, rx: 3, fill: '#9fd8ef', stroke: '#1d1a16', 'stroke-width': 2 }),
        // Bullbar, lights and mirrors.
        el('rect', { x: -25, y: -50, width: 50, height: 7, rx: 3, fill: '#cfd6dc', stroke: '#1d1a16', 'stroke-width': 2.5 }),
        el('rect', { x: -19, y: -46, width: 10, height: 5, rx: 2, fill: '#ffe9a8', stroke: '#1d1a16', 'stroke-width': 1.4 }),
        el('rect', { x: 9, y: -46, width: 10, height: 5, rx: 2, fill: '#ffe9a8', stroke: '#1d1a16', 'stroke-width': 1.4 }),
        el('rect', { x: -19, y: 40, width: 10, height: 4, rx: 2, fill: '#8a1f1f' }),
        el('rect', { x: 9, y: 40, width: 10, height: 4, rx: 2, fill: '#8a1f1f' }),
        el('rect', { x: -31, y: -36, width: 6, height: 9, rx: 2, fill: '#c8412f', stroke: '#1d1a16', 'stroke-width': 1.6 }),
        el('rect', { x: 25, y: -36, width: 6, height: 9, rx: 2, fill: '#c8412f', stroke: '#1d1a16', 'stroke-width': 1.6 }),
        blinker(-21, -47), blinker(21, -47), blinker(-21, 44), blinker(21, 44),
        el('path', { d: 'M-18 4 q10 6 22 2', stroke: 'rgba(214,186,128,.55)', 'stroke-width': 3, fill: 'none' })
      ]);
      car.setAttribute('data-ok', 'true');
      svg.append(car);

      const haze = el('rect', { x: -260, y: -400, width: 880, height: 1300, fill: '#c9a25a', opacity: 0, 'pointer-events': 'none' });
      svg.append(haze);
      const say = text(W / 2, 460, 'DRAG THE UTE OFF THE ROAD', { size: 14, fill: '#fffaf0', stroke: '#1d1a16', strokeWidth: 4 });
      svg.append(say);

      // Dry grass tumbling across the highway on the wind.
      const straws = [[0, 60, .8], [210, 150, 1], [430, 240, .7]].map(([off, y, s]) => {
        const node = g([
          el('path', {
            d: 'M0 0 q8 -8 14 -10 M0 0 q9 2 16 1 M0 0 q5 8 8 12',
            stroke: '#8a6534', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round'
          })
        ], { opacity: .7, 'pointer-events': 'none' });
        svg.append(node);
        place(node, 400 - off, y, s);
        return { node, off, y, s };
      });

      let nudgeTimer = 0;
      const nudge = () => {
        say.textContent = 'FURTHER LEFT!';
        say.setAttribute('fill', '#ffd25e');
        clearTimeout(nudgeTimer);
        nudgeTimer = setTimeout(() => {
          say.textContent = 'DRAG THE UTE OFF THE ROAD';
          say.setAttribute('fill', '#fffaf0');
        }, 900);
      };

      ctx.draggable(car, 180, 380, {
        hitBox: { rx: 42, ry: 62 },
        onDrop: (x) => {
          // Off on the left shoulder: safe. Across on the right: oncoming traffic.
          if (x <= 100) { ctx.win(); return; }
          if (x >= 234) {
            ctx.failTip = 'Never stop in the oncoming lane. Slow down, lights and hazards on, and pull well off the road on the left.';
            ctx.lose();
            return;
          }
          nudge();
          return 'reset';
        }
      });

      let roared = false;
      ctx.onTick((p) => {
        // The wall rolls down the road, drifting and boiling as it comes.
        place(dust, Math.sin(p * 9) * 5, 40 + p * 430);
        swirl.setAttribute('transform', `translate(${-p * 110} 0)`);
        haze.setAttribute('opacity', (p * .16).toFixed(3));
        const on = Math.floor(p * 26) % 2 === 0;
        for (const b of blinkers) b.setAttribute('opacity', on ? 1 : .25);
        for (const s of straws) {
          const x = 400 - ((p * 560 + s.off) % 560);
          const y = s.y + Math.sin(p * 12 + s.off) * 7;
          s.node.setAttribute('transform', `translate(${x} ${y}) rotate(${(p * 900 + s.off) % 360}) scale(${s.s})`);
        }
        if (!roared && p > .04) { roared = true; sfxHook(ctx, 'whoosh'); }
      });
    }
  },

  // 17. Alice Springs: dry riverbeds flood in minutes. Climb the bank.
  {
    id: 'flash-flood', prompt: 'DRY RIVER!', bg: '#ffd9a0', ownBackdrop: true,
    setup(ctx) {
      const { svg } = ctx;
      svg.append(
        flashFloodScene(),
        text(W / 2, 40, 'TAP TO CLIMB THE BANK', { size: 15 })
      );

      // A wall of muddy water: wavy foam crest, churn lines and floating timber.
      const wave = (y, amp = 12) => {
        let d = `M-240 ${y} q30 ${-amp} 60 0`;
        for (let i = 0; i < 14; i++) d += ' t60 0';
        return d;
      };
      const streak = (y, n = 12) => {
        let d = `M-260 ${y} q40 -10 80 0`;
        for (let i = 1; i < n; i++) d += ' t80 0';
        return d;
      };
      const crest = wave(6);
      const churn = g([
        el('path', { d: streak(58), stroke: 'rgba(255,250,240,.34)', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }),
        el('path', { d: streak(126, 11), stroke: 'rgba(255,250,240,.24)', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }),
        el('path', { d: streak(204, 13), stroke: 'rgba(255,250,240,.2)', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' })
      ]);
      const branch = g([
        el('path', {
          d: 'M-36 0 q22 -8 46 -2 M-12 -2 l-8 -12 M8 1 l9 -13 M26 0 l7 -10',
          stroke: '#5a3c22', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round'
        })
      ], { transform: 'translate(330 22) rotate(-8)' });
      const can = g([
        el('rect', { x: -10, y: -16, width: 20, height: 28, rx: 3, fill: '#c8412f', stroke: '#1d1a16', 'stroke-width': 2.5 }),
        el('rect', { x: -4, y: -22, width: 8, height: 7, rx: 2, fill: '#cfd6dc', stroke: '#1d1a16', 'stroke-width': 2 })
      ], { transform: 'translate(470 30) rotate(6)' });
      const flood = g([
        el('path', { d: `${crest} L660 700 L-240 700 Z`, fill: '#9c6b3a' }),
        el('path', { d: `${wave(70, 9)} L660 700 L-240 700 Z`, fill: '#7d5229', opacity: .55 }),
        el('path', { d: crest, stroke: '#f6e7c8', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }),
        el('path', { d: wave(18, 8), stroke: 'rgba(255,250,240,.55)', 'stroke-width': 3, fill: 'none' }),
        g([
          el('ellipse', { cx: -208, cy: 1, rx: 14, ry: 5, fill: '#f6e7c8', opacity: .9 }),
          el('ellipse', { cx: -172, cy: -4, rx: 8, ry: 4, fill: '#fffaf0', opacity: .8 }),
          el('ellipse', { cx: -104, cy: 7, rx: 18, ry: 5, fill: '#f6e7c8', opacity: .8 }),
          el('ellipse', { cx: -20, cy: 0, rx: 11, ry: 4, fill: '#fffaf0', opacity: .85 }),
          el('ellipse', { cx: 74, cy: 8, rx: 20, ry: 6, fill: '#f6e7c8', opacity: .85 }),
          el('ellipse', { cx: 150, cy: 1, rx: 9, ry: 4, fill: '#fffaf0', opacity: .7 }),
          el('ellipse', { cx: 244, cy: 7, rx: 16, ry: 5, fill: '#f6e7c8', opacity: .8 }),
          el('ellipse', { cx: 346, cy: 0, rx: 12, ry: 4, fill: '#fffaf0', opacity: .82 }),
          el('ellipse', { cx: 448, cy: 8, rx: 18, ry: 5, fill: '#f6e7c8', opacity: .85 })
        ]),
        churn,
        branch,
        can
      ], { transform: 'translate(0 620)' });
      svg.append(flood);

      let py = 320, done = false, roared = false;
      const guy = person({ x: 180, y: py, s: .9, mood: 'scared' });
      svg.append(guy);
      svg.addEventListener('pointerdown', () => {
        if (done) return;
        py = Math.max(220, py - 25);
        place(guy, 180, py, .9);
        if (py <= 220) { done = true; ctx.win(); }
      });
      ctx.onTick((p) => {
        if (done) return;
        // The creek starts dry, then a surge sweeps up the bed and over the bank.
        const top = 620 - 500 * p;
        flood.setAttribute('transform', `translate(0 ${top})`);
        churn.setAttribute('transform', `translate(${-p * 80} 0)`);
        branch.setAttribute('transform', `translate(${330 - p * 520} ${18 + Math.sin(p * 18) * 4}) rotate(-8)`);
        can.setAttribute('transform', `translate(${470 - p * 540} ${26 + Math.sin(p * 15 + 1) * 3}) rotate(8)`);
        if (!roared && p > .02) { roared = true; sfxHook(ctx, 'whoosh'); }
        if (top < py) { done = true; ctx.lose(); }
      });
    }
  }
];
