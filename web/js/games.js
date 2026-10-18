// The fourteen micro-games. Each one is a few seconds long and teaches one NT safety rule.
//
// A game is { id, prompt, bg, timeoutWins, setup(ctx) }.
//   prompt       - the shouted instruction ("STEP BACK!")
//   timeoutWins  - true if surviving until the timer ends counts as a win
//   setup(ctx)   - draws the scene and wires input. Call ctx.win() or ctx.lose() once.
//
// The engine draws the current location's landscape (see locationBackdrop in
// locations.js) behind the scene, so games should not paint their own opaque,
// full-stage background - draw only the ground, water and props the round needs.
//
// ctx gives you: svg (the scene), stage (div), location (the place being played),
// win(), lose(), onTick(fn(progress, dt)), toSvg(event) -> {x, y},
// draggable(node, x, y, opts), buttons([{label, ok}]), speed.

import { el, g, text, person, crocEyes, water, sign, items, VIEW } from './art.js';

const W = VIEW.w, H = VIEW.h;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const place = (node, x, y, s = 1) => { node.setAttribute('transform', `translate(${x} ${y}) scale(${s})`); return node; };

// Lets a game ask for a sound effect without importing the sound module.
function sfxHook(ctx, name) { ctx.sound && ctx.sound(name); }

function swirlAt(x, y) {
  return el('path', { d: `M${x} ${y} m-28 0 a28 28 0 1 1 28 28 a17 17 0 1 1 -14 -17`, stroke: '#9b8fd6', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' });
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
        el('rect', { x: 0, y: 0, width: W, height: 150, fill: 'rgba(140,180,90,.4)' }),
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
    id: 'bushfire-leave', prompt: 'SMOKE!', bg: '#f4c28a',
    setup(ctx) {
      ctx.svg.append(
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
  },

<<<<<<< Updated upstream
  // 11. Storm over the pool: tap every swimmer to get them out before lightning strikes.
  {
    id: 'lightning-pool', prompt: 'STORM! EVERYONE OUT!', bg: '#5b6478',
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
    id: 'mozzie-dusk', prompt: 'MOZZIES!', bg: '#6a4c93',
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
=======
  // 11. Kakadu: rangers trap a problem croc at the ramp. One tap, right moment.
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

  // 12. Arnhem Land: get everyone out of the rock hole before the croc surfaces.
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
>>>>>>> Stashed changes
            return 'reset';
          }
        });
      });
<<<<<<< Updated upstream
    }
  },

  // 13. Beach in the midday sun: tap the three sun-safe items.
  {
    id: 'sun-slip', prompt: 'SLIP SLOP SLAP!', bg: '#9fdcef',
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
      draw(svg) { svg.append(water(300, 180), person({ x: 180, y: 280, s: .9 })); },
      choices: [
        { label: 'Jump in to cool off', ok: false, tip: 'Never swim where crocs may live. Only swim in signed swimming areas.' },
        { label: 'Stay out of the water', ok: true }
      ]
    },
    {
      caption: ['Time to fish.', 'Where do you stand?'],
      draw(svg) {
        svg.append(water(300, 180));
        svg.append(el('rect', { x: 200, y: 285, width: 150, height: 18, rx: 9, fill: '#7a5b1e', stroke: '#1d1a16', 'stroke-width': 3 }));
        svg.append(text(275, 275, 'LOG', { size: 14, fill: '#fffaf0', stroke: '#1d1a16', strokeWidth: 4 }));
      },
      choices: [
        { label: 'On the log over the water', ok: false, tip: 'Never stand on logs over the water. Stand at least 5 m back from the edge.' },
        { label: '5 m back from the edge', ok: true }
      ]
    },
    {
      caption: ['Your lure is snagged', 'in the water!'],
      draw(svg) { svg.append(water(300, 180), crocEyes({ x: 220, y: 340, s: .8 })); },
      choices: [
        { label: 'Wade in to grab it', ok: false, tip: 'Never go into the water to get a lure back. Cut the line.' },
        { label: 'Cut the line, leave it', ok: true }
      ]
    }
  ])

=======
      ctx.onTick((p) => place(croc, W / 2 + 66, 286 - p * 30, .5 + p * .7));
    }
  },

  // 13. Barkly: pull the ute off the road before the dust wall hits.
  {
    id: 'dust-storm', prompt: 'DUST STORM!', bg: '#c9a25a',
    setup(ctx) {
      const { svg } = ctx, W = VIEW.w, H = VIEW.h;
      svg.append(
        el('rect', { x: 132, y: 0, width: 96, height: H, fill: '#6d6d6d' }),
        el('line', { x1: W / 2, y1: 0, x2: W / 2, y2: H, stroke: '#fffaf0', 'stroke-width': 4, 'stroke-dasharray': '18 16' }),
        text(W / 2, 62, 'DRAG THE UTE OFF THE ROAD', { size: 14, fill: 'rgba(29,26,22,.6)' })
      );
      const blobs = [];
      for (let i = 0; i < 9; i++) blobs.push(el('circle', { cx: i * 46 - 10, cy: (i % 2) * 26, r: 48, fill: 'rgba(158,128,88,.92)' }));
      const dust = g(blobs);
      svg.append(dust);
      const car = g([
        el('rect', { x: -26, y: -44, width: 52, height: 88, rx: 12, fill: '#c8412f', stroke: '#1d1a16', 'stroke-width': 3 }),
        el('rect', { x: -19, y: -32, width: 38, height: 22, rx: 4, fill: '#9fd8ef', stroke: '#1d1a16', 'stroke-width': 2 }),
        el('rect', { x: -19, y: 16, width: 38, height: 18, rx: 4, fill: '#9fd8ef', stroke: '#1d1a16', 'stroke-width': 2 })
      ]);
      car.setAttribute('data-ok', true);
      svg.append(car);
      ctx.draggable(car, 180, 380, {
        onDrop: (x) => { if (x < 106 || x > 254) ctx.win(); return 'reset'; }
      });
      ctx.onTick((p) => place(dust, 0, -150 + p * 420));
    }
  },

  // 14. Alice Springs: dry riverbeds flood in minutes. Climb the bank.
  {
    id: 'flash-flood', prompt: 'DRY RIVER!', bg: '#e6d3a3',
    setup(ctx) {
      const { svg } = ctx, W = VIEW.w, H = VIEW.h;
      svg.append(
        el('rect', { x: 0, y: 200, width: W, height: 150, fill: '#d8c391' }),
        el('rect', { x: 148, y: 350, width: 64, height: 130, fill: '#6d6d6d' }),
        text(W / 2, 40, 'TAP TO CLIMB THE BANK', { size: 15 })
      );
      const flood = el('rect', { x: 0, y: 380, width: W, height: 0, fill: 'rgba(47,127,143,.8)' });
      svg.append(flood);
      let py = 310, done = false;
      const guy = person({ x: 180, y: py, s: .9, mood: 'scared' });
      svg.append(guy);
      svg.addEventListener('pointerdown', () => {
        if (done) return;
        py -= 40;
        place(guy, 180, Math.max(110, py), .9);
        if (py <= 110) { done = true; ctx.win(); }
      });
      ctx.onTick((p) => {
        if (done) return;
        const top = 380 - p * 260;
        flood.setAttribute('y', top);
        flood.setAttribute('height', Math.max(0, 400 - top));
        if (top < py) { done = true; ctx.lose(); }
      });
    }
  }
>>>>>>> Stashed changes
];
