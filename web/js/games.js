// The ten micro-games. Each one is a few seconds long and teaches one NT safety rule.
//
// A game is { id, prompt, bg, timeoutWins, setup(ctx) }.
//   prompt       - the shouted instruction ("STEP BACK!")
//   timeoutWins  - true if surviving until the timer ends counts as a win
//   setup(ctx)   - draws the scene and wires input. Call ctx.win() or ctx.lose() once.
//
// ctx gives you: svg (the scene), stage (div), win(), lose(), onTick(fn(progress, dt)),
// toSvg(event) -> {x, y}, draggable(node, x, y, opts), buttons([{label, ok}]), speed.

import { el, g, text, person, crocEyes, water, sun, sign, items, VIEW } from './art.js';

const W = VIEW.w, H = VIEW.h;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const place = (node, x, y, s = 1) => { node.setAttribute('transform', `translate(${x} ${y}) scale(${s})`); return node; };

export const GAMES = [

  // 1. Fishing too close to the edge: tap to back away past the 5 m line.
  {
    id: 'croc-edge', prompt: 'STEP BACK!', bg: '#d9c08e',
    setup(ctx) {
      const { svg } = ctx;
      svg.append(
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#d9c08e' }),
        water(360, 120),
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
    id: 'swim-sign', prompt: 'SWIM?', bg: '#9bbf4a',
    setup(ctx) {
      const safe = Math.random() < 0.4;
      const variant = safe ? 'safe' : pick(['croc', 'none']);
      ctx.correct = safe ? 'swim' : 'stay';
      ctx.svg.append(
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#9bbf4a' }),
        el('ellipse', { cx: W / 2, cy: 300, rx: 170, ry: 80, fill: '#2f7f8f', stroke: '#1d1a16', 'stroke-width': 3 }),
        el('path', { d: 'M60 300 q30 -10 60 0 t60 0 t60 0 t60 0', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 4, fill: 'none' })
      );
      if (variant === 'safe') ctx.svg.append(sign(90, 210, ['SWIMMING', 'AREA'], { bg: '#4f8a3c', fg: '#fffaf0' }));
      if (variant === 'croc') ctx.svg.append(sign(90, 210, ['DANGER', 'CROCODILES'], { bg: '#ffd25e', fg: '#c8412f', w: 130 }));
      if (variant === 'none') ctx.svg.append(text(W / 2, 120, '(no sign...)', { size: 18, fill: 'rgba(29,26,22,.6)' }));
      ctx.svg.append(person({ x: 270, y: 230, s: .9 }));
      if (variant !== 'safe' && Math.random() < 0.5) ctx.svg.append(crocEyes({ x: 230, y: 330, s: .6 }));
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
    id: 'croc-camp', prompt: 'PITCH IT FAR!', bg: '#c9b27a',
    setup(ctx) {
      ctx.svg.append(
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#c9b27a' }),
        el('rect', { x: 0, y: 0, width: W, height: 150, fill: '#a9c46a' }),
        water(400, 80),
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
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#cfeefc' }),
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
        el('rect', { x: 0, y: 0, width: W, height: 200, fill: '#8fd0e0' }),
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
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#d9d2f0' }),
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
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#a9c46a' }),
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
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffd9a0' }),
        sun(70, 70),
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
        node.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (over) return;
          level = Math.min(1, level + delta);
          node.classList.remove('pop'); void node.getBBox(); node.classList.add('pop');
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
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#e7f3d6' }),
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
    id: 'bushfire-leave', prompt: 'SMOKE!', bg: '#f4c28a',
    setup(ctx) {
      ctx.svg.append(
        el('rect', { x: 0, y: 0, width: W, height: H, fill: '#f4c28a' }),
        el('rect', { x: 0, y: 220, width: W, height: 260, fill: '#c9a25a' })
      );
      const smoke = g([
        el('circle', { cx: 0, cy: 0, r: 30, fill: '#7d7268' }),
        el('circle', { cx: 25, cy: -30, r: 36, fill: '#8a7f75' }),
        el('circle', { cx: -20, cy: -60, r: 40, fill: '#968b80' }),
        el('circle', { cx: 15, cy: -100, r: 46, fill: '#a39a90' })
      ]);
      const flames = el('path', { d: 'M-60 0 q10 -40 20 -10 q8 -50 22 -8 q10 -45 20 -4 q12 -36 20 -2 q8 -30 18 24 z', fill: '#e0892e', stroke: '#c8412f', 'stroke-width': 3 });
      ctx.svg.append(smoke, flames);
      // house + car
      ctx.svg.append(g([
        el('rect', { x: -50, y: -50, width: 100, height: 60, fill: '#fffaf0', stroke: '#1d1a16', 'stroke-width': 3 }),
        el('path', { d: 'M-62 -50 L0 -96 L62 -50 z', fill: '#c8412f', stroke: '#1d1a16', 'stroke-width': 3 }),
        el('rect', { x: -12, y: -26, width: 24, height: 36, fill: '#7a3b1e', stroke: '#1d1a16', 'stroke-width': 2 })
      ], { transform: 'translate(110 330)' }));
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
  }
];
