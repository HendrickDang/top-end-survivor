// Funny failure animations: one bespoke, looping cartoon for each mini-game (and both
// bosses), shown on the result card when the player loses that round. The victim wears the player's
// chosen character's colours, so it feels personal. All drawn in code, like the rest.
import { NS } from './art.js';

const IN = '#1d1a16';
const W = 240;

const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, c, w, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${extra}/>`;
const cap = (x, y, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="'Baloo 2','Trebuchet MS',sans-serif" font-weight="800" font-size="${o.size || 15}" fill="${o.fill || IN}" stroke="${o.stroke || '#fffaf0'}" stroke-width="${o.sw || 3.5}" paint-order="stroke">${t}</text>`;

// A chunky, panicked version of the player's character. Positioned by an outer <g>
// (the transform attribute) so an inner <g> can carry the CSS animation.
function victim({ x, y, s = 1, skin, shirt, cls = '', origin = '50% 100%' }) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="fv ${cls}" style="transform-origin:${origin}">
    <ellipse cx="0" cy="3" rx="19" ry="4" fill="rgba(0,0,0,.18)"/>
    <rect x="-11" y="-22" width="9" height="22" rx="4" fill="#3b4a6b" stroke="${IN}" stroke-width="3"/>
    <rect x="2" y="-22" width="9" height="22" rx="4" fill="#3b4a6b" stroke="${IN}" stroke-width="3"/>
    <rect x="-17" y="-52" width="34" height="32" rx="12" fill="${shirt}" stroke="${IN}" stroke-width="3"/>
    <rect x="-32" y="-50" width="13" height="32" rx="6" fill="${skin}" stroke="${IN}" stroke-width="3" transform="rotate(28 -25 -48)"/>
    <rect x="19" y="-50" width="13" height="32" rx="6" fill="${skin}" stroke="${IN}" stroke-width="3" transform="rotate(-28 25 -48)"/>
    <circle cx="0" cy="-66" r="17" fill="${skin}" stroke="${IN}" stroke-width="3"/>
    <g stroke="${IN}" stroke-width="3" stroke-linecap="round" fill="none">
      <path d="M-10 -72 l9 9 M-1 -72 l-9 9"/><path d="M1 -72 l9 9 M10 -72 l-9 9"/>
    </g>
    <ellipse cx="0" cy="-54" rx="6" ry="8" fill="#c8412f" stroke="${IN}" stroke-width="2.5"/>
  </g></g>`;
}

// Croc head used by a few scenes. Drawn around (cx, cy). Wrapped so the animation
// doesn't clobber the positioning transform attribute.
const croc = (cx, cy, s, cls = '') => `<g transform="translate(${cx} ${cy}) scale(${s})"><g class="fv ${cls}" style="transform-origin:50% 50%">
  <path d="M-44 0 q22 -24 60 -14 q30 8 34 14 q-6 20 -40 22 q-40 2 -54 -22 z" fill="#4f7a33" stroke="${IN}" stroke-width="3"/>
  <path d="M-40 0 l12 9 M-26 0 l12 9 M-12 0 l12 9 M2 0 l12 9" stroke="#fffaf0" stroke-width="4" stroke-linecap="round"/>
  <circle cx="-26" cy="-12" r="7" fill="#ffe066" stroke="${IN}" stroke-width="2.5"/>
  <circle cx="-26" cy="-12" r="2.6" fill="${IN}"/>
</g></g>`;

const SCENES = {
  // 1. Fishing 5 m too close: the croc takes the fisher too.
  'croc-edge': (p) => rect(0, 0, W, 150, '#d9c08e') + rect(0, 100, W, 50, '#2f7f8f') +
    `<path d="M0 110 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0" stroke="#fffaf0" stroke-width="3" fill="none" opacity=".4"/>` +
    croc(150, 108, 1, 'f-chomp') +
    `<g class="fv f-spin" style="transform-origin:50% 50%">${line(30, 84, 62, 26, '#6b4a2b', 5, 'stroke-linecap="round"')}<path d="M62 26 q18 12 6 40" stroke="${IN}" stroke-width="2" fill="none"/></g>` +
    victim({ x: 84, y: 78, s: .82, skin: p.skin, shirt: p.shirt, cls: 'f-tumble', origin: '50% 50%' }) +
    `<g class="fv f-splash">${circle(70, 104, 9, '#fffaf0')}${circle(92, 112, 6, '#fffaf0')}${circle(52, 112, 5, '#fffaf0')}</g>` +
    cap(180, 40, 'SPLASH!', { size: 16, fill: '#c8412f' }),

  // 2. Swimming where the sign said no: launched out of the water.
  'swim-sign': (p) => rect(0, 0, W, 150, '#9bbf4a') + rect(0, 104, W, 46, '#2f7f8f') +
    croc(142, 100, .9, 'f-chomp') +
    victim({ x: 88, y: 74, s: .8, skin: p.skin, shirt: p.shirt, cls: 'f-launch', origin: '50% 100%' }) +
    `<g class="fv f-splash">${circle(112, 104, 10, '#fffaf0')}${circle(140, 114, 7, '#fffaf0')}</g>` +
    cap(60, 34, 'WOAH!', { size: 17, fill: '#c8412f' }) +
    cap(180, 130, 'no sign = no swim', { size: 10, fill: '#fffaf0', stroke: IN, sw: 2 }),

  // 3. Camped too close: a croc drags the whole tent into the water.
  'croc-camp': (p) => rect(0, 0, W, 150, '#c9b27a') + rect(0, 0, W, 62, '#2f7f8f') + rect(0, 62, W, 88, '#c9b27a') +
    line(0, 62, W, 62, 'rgba(29,26,22,.25)', 2, 'stroke-dasharray="8 6"') +
    croc(52, 54, .8, 'f-chomp') +
    `<g class="fv f-slide" style="transform-origin:50% 60%">
       <path d="M108 128 L150 70 L192 128 z" fill="#e0892e" stroke="${IN}" stroke-width="4" stroke-linejoin="round"/>
       <path d="M150 70 L136 128 L164 128 z" fill="#7a3b1e" stroke="${IN}" stroke-width="3" stroke-linejoin="round"/>
       <path d="M150 70 L60 56" stroke="${IN}" stroke-width="2.5" stroke-dasharray="5 4"/>
     </g>` +
    cap(196, 34, "CAMP'S GONE!", { size: 13, fill: '#c8412f' }),

  // 4. Fresh water on a sting: makes it worse.
  'stinger-vinegar': (p) => rect(0, 0, W, 150, '#cfeefc') +
    `<path d="M-10 52 C 90 36, 180 46, 250 60 L250 118 C 180 106, 90 96, -10 110 z" fill="#c68642" stroke="${IN}" stroke-width="3"/>` +
    `<path d="M40 62 q34 22 68 0 t68 6" stroke="#c8412f" stroke-width="7" fill="none" stroke-linecap="round" class="fv f-pulse" style="transform-origin:50% 50%"/>` +
    `<path d="M56 96 q30 -16 60 0 t60 0" stroke="#c8412f" stroke-width="7" fill="none" stroke-linecap="round" class="fv f-pulse" style="transform-origin:50% 50%"/>` +
    `<g class="fv f-squirt" style="transform-origin:50% 100%"><rect x="16" y="86" width="24" height="42" rx="8" fill="#cfeefc" stroke="${IN}" stroke-width="3"/><rect x="26" y="90" width="22" height="10" rx="4" fill="#2f7fd0" stroke="${IN}" stroke-width="2"/></g>` +
    cap(196, 40, 'OUCH!', { size: 18, fill: '#c8412f' }) +
    cap(150, 140, 'never fresh water', { size: 10 }),

  // 5. Swimming in stinger season: the classic stinger dance.
  'stinger-suit': (p) => rect(0, 0, W, 150, '#8fd0e0') + rect(0, 108, W, 42, '#f2d89b') +
    `<g class="fv f-wag" style="transform-origin:50% 0%">
       <path d="M24 108 q-8 -34 8 -54 M40 108 q6 -38 22 -50 M56 108 q-6 -30 6 -44" stroke="#b06ac0" stroke-width="5" fill="none" stroke-linecap="round"/>
     </g>` +
    victim({ x: 92, y: 112, s: .82, skin: p.skin, shirt: p.shirt, cls: 'f-shake', origin: '50% 100%' }) +
    cap(150, 40, 'OUCH OUCH OUCH', { size: 13, fill: '#7a3b9a' }) +
    cap(60, 140, 'no suit, no swim', { size: 10 }),

  // 6. Unprepared for the cyclone: the kit is gone.
  'cyclone-kit': (p) => rect(0, 0, W, 150, '#d9d2f0') +
    `<path d="M30 30 m-20 0 a20 20 0 1 1 20 20 a12 12 0 1 1 -10 -12" stroke="#6a5aa8" stroke-width="6" fill="none" stroke-linecap="round" class="fv f-spin" style="transform-origin:50% 50%"/>` +
    `<g class="fv f-spin" style="transform-origin:50% 50%"><rect x="120" y="26" width="22" height="14" rx="4" fill="#d94f3d" stroke="${IN}" stroke-width="3"/><circle cx="146" cy="33" r="5" fill="#ffe9a8" stroke="${IN}" stroke-width="2"/></g>` +
    `<g class="fv f-spin" style="transform-origin:50% 50%"><rect x="186" y="40" width="18" height="24" rx="4" fill="#5b6c8f" stroke="${IN}" stroke-width="3"/></g>` +
    victim({ x: 92, y: 130, s: .8, skin: p.skin, shirt: p.shirt, cls: 'f-shake', origin: '50% 100%' }) +
    line(92, 96, 92, 60, '#6b4a2b', 5, 'stroke-linecap="round"') +
    cap(160, 92, "WHERE'S THE KIT?", { size: 12, fill: '#6a5aa8' }),

  // 7. Driving into floodwater: the ute floats off.
  'flood-road': (p) => rect(0, 0, W, 150, '#7a6a3a') + rect(0, 40, W, 110, '#2f7f8f') +
    `<path d="M0 60 q30 -8 60 0 t60 0 t60 0 t60 0" stroke="#fffaf0" stroke-width="3" fill="none" opacity=".4"/>` +
    `<g class="fv f-bob">
       <rect x="70" y="86" width="60" height="46" rx="10" fill="#c8412f" stroke="${IN}" stroke-width="3"/>
       <rect x="80" y="96" width="40" height="16" rx="4" fill="#9fd8ef" stroke="${IN}" stroke-width="2"/>
       <rect x="80" y="118" width="40" height="12" rx="4" fill="#9fd8ef" stroke="${IN}" stroke-width="2"/>
     </g>` +
    `<g class="fv f-rise">${circle(112, 84, 7, '#fffaf0')}${circle(132, 90, 5, '#fffaf0')}${circle(96, 90, 4, '#fffaf0')}</g>` +
    `<g class="fv f-bob"><rect x="176" y="70" width="6" height="54" fill="#8a6a3a" stroke="${IN}" stroke-width="2"/><rect x="160" y="56" width="38" height="16" rx="3" fill="#ffd25e" stroke="${IN}" stroke-width="3"/></g>` +
    cap(150, 30, 'GURGLE...', { size: 16, fill: '#c8412f' }),

  // 8. Dehydrated and drinking fizz: wilted.
  'heat-drink': (p) => rect(0, 0, W, 150, '#ffd9a0') +
    `<circle cx="206" cy="34" r="24" fill="#ffd25e" stroke="${IN}" stroke-width="3"/>` +
    `<g class="fv f-heat" style="transform-origin:50% 100%"><path d="M92 60 q8 -12 0 -24 M112 56 q8 -12 0 -24 M132 60 q8 -12 0 -24" stroke="#e0892e" stroke-width="4" fill="none" stroke-linecap="round"/></g>` +
    victim({ x: 96, y: 132, s: .85, skin: p.skin, shirt: p.shirt, cls: 'f-wilt', origin: '50% 100%' }) +
    `<g class="fv f-squirt" style="transform-origin:50% 100%"><rect x="164" y="96" width="26" height="38" rx="7" fill="#7a3b1e" stroke="${IN}" stroke-width="3"/><rect x="164" y="96" width="26" height="9" rx="4" fill="#cfd6dc" stroke="${IN}" stroke-width="2"/><path d="M190 100 q14 -8 20 -18" stroke="#7a3b1e" stroke-width="4" fill="none" stroke-linecap="round"/></g>` +
    cap(150, 34, 'TOO HOT!', { size: 16, fill: '#c8412f' }) +
    cap(200, 140, 'water, not fizz', { size: 10 }),

  // 9. Wrong snake-bite first aid: knife and tourniquet.
  'snake-bite': (p) => rect(0, 0, W, 150, '#e7f3d6') +
    `<path d="M-10 76 L 130 84 L 130 116 L -10 124 z" fill="#e0ac69" stroke="${IN}" stroke-width="3"/>` +
    `<g class="fv f-pulse" style="transform-origin:50% 50%"><circle cx="96" cy="100" r="16" fill="#8a3b8a" opacity=".45"/></g>` +
    `<g class="fv f-wag" style="transform-origin:50% 100%"><path d="M170 118 q14 -22 34 -6 q-16 6 -34 12 z" fill="#cfd6dc" stroke="${IN}" stroke-width="3"/><rect x="150" y="106" width="22" height="12" rx="4" fill="#6b4a2b" stroke="${IN}" stroke-width="3"/></g>` +
    `<g class="fv f-fly"><rect x="52" y="60" width="46" height="24" rx="12" fill="#f6efe0" stroke="${IN}" stroke-width="3"/><path d="M62 60 v24 M76 60 v24" stroke="#d8cdb5" stroke-width="3"/></g>` +
    `<g class="fv f-wag" style="transform-origin:50% 100%"><path d="M20 150 q18 -26 40 -6 q-20 8 -40 12 z" fill="#7a5b1e" stroke="${IN}" stroke-width="3"/><circle cx="60" cy="140" r="7" fill="#7a5b1e" stroke="${IN}" stroke-width="2"/></g>` +
    cap(180, 40, 'NO, NOT LIKE THAT!', { size: 12, fill: '#c8412f' }),

  // 10. Waited too long: the fire arrives, hat on fire, running.
  'bushfire-leave': (p) => rect(0, 0, W, 150, '#f4c28a') + rect(0, 96, W, 54, '#c9a25a') +
    `<g class="fv f-flame" style="transform-origin:50% 100%">
       <path d="M170 100 q14 -34 25 -8 q9 -40 24 -4 q10 -30 21 12 z" fill="#e0892e" stroke="#c8412f" stroke-width="3"/>
       <path d="M182 100 q10 -20 16 -6 q6 -22 15 0 z" fill="#ffd25e"/>
     </g>` +
    `<g class="fv f-run">
       <rect x="36" y="66" width="54" height="40" rx="4" fill="#fffaf0" stroke="${IN}" stroke-width="3"/>
       <path d="M30 66 L63 40 L96 66 z" fill="#c8412f" stroke="${IN}" stroke-width="3"/>
       <rect x="52" y="84" width="20" height="22" fill="#7a3b1e" stroke="${IN}" stroke-width="2"/>
     </g>` +
    victim({ x: 168, y: 138, s: .62, skin: p.skin, shirt: p.shirt, cls: 'f-run', origin: '50% 100%' }) +
    `<g class="fv f-flame" style="transform-origin:50% 100%"><path d="M158 88 q6 -18 12 -2 q6 -14 12 4 z" fill="#ffd25e" stroke="#e0892e" stroke-width="2"/></g>` +
    cap(60, 28, 'RUN!', { size: 18, fill: '#c8412f' }),

  // 11. Mistimed the croc trap: it snaps on nothing and the croc swims off laughing.
  'croc-trap': (p) => rect(0, 0, W, 150, '#7fb8a8') + rect(0, 40, W, 110, '#2f7f8f') +
    `<g class="fv f-snap" style="transform-origin:40% 100%"><rect x="86" y="86" width="60" height="46" rx="8" fill="none" stroke="#cfd6dc" stroke-width="6"/><path d="M86 132 L146 86" stroke="#cfd6dc" stroke-width="5"/><path d="M86 86 L146 132" stroke="#cfd6dc" stroke-width="5" opacity=".5"/></g>` +
    croc(190, 96, .75, 'f-wag') +
    cap(150, 40, 'HA HA!', { size: 16, fill: '#fffaf0', stroke: IN }) +
    cap(118, 146, 'rangers trap crocs, not you', { size: 10, fill: '#fffaf0', stroke: IN, sw: 2 }),

  // 12. Left someone in the rock hole: the croc surfaces.
  'rock-hole': (p) => rect(0, 0, W, 150, '#d9c08e') +
    `<path d="M-10 46 q60 -34 130 -18 q70 16 130 -6 l0 -30 l-260 0 z" fill="#b9a074" stroke="${IN}" stroke-width="4"/>` +
    `<ellipse cx="120" cy="106" rx="112" ry="46" fill="#2f7f8f" stroke="${IN}" stroke-width="4"/>` +
    croc(120, 108, .95, 'f-chomp') +
    victim({ x: 74, y: 92, s: .8, skin: p.skin, shirt: p.shirt, cls: 'f-bounce', origin: '50% 100%' }) +
    `<g class="fv f-splash">${circle(60, 112, 9, '#fffaf0')}${circle(180, 112, 8, '#fffaf0')}</g>` +
    cap(190, 34, 'GET OUT!', { size: 15, fill: '#c8412f' }),

  // 13. Drove into the dust: swallowed by the brown cloud.
  'dust-storm': (p) => rect(0, 0, W, 150, '#c9a15f') +
    rect(76, 0, 20, 150, '#b58f5c') + rect(156, 0, 20, 150, '#b58f5c') +
    rect(96, 0, 60, 150, '#5e5e5e') +
    `<path d="M100 0 v150 M152 0 v150" stroke="#f6e7c8" stroke-width="2.5" opacity=".9"/>` +
    `<path d="M126 0 v14 M126 26 v14 M126 52 v14 M126 78 v14 M126 104 v14 M126 130 v14" stroke="#f6e7c8" stroke-width="3"/>` +
    `<g class="fv f-spin" style="transform-origin:50% 50%" opacity=".95">
       ${circle(150, 34, 52, 'rgba(160,120,64,.95)')}${circle(200, 60, 46, 'rgba(143,101,49,.95)')}${circle(120, 66, 40, 'rgba(177,135,75,.95)')}
       ${circle(214, 20, 40, 'rgba(143,101,49,.95)')}${circle(160, 90, 36, 'rgba(160,120,64,.95)')}${circle(226, 108, 34, 'rgba(122,86,42,.95)')}
     </g>` +
    `<g class="fv f-drift">
       <rect x="104" y="104" width="46" height="30" rx="8" fill="#c8412f" stroke="${IN}" stroke-width="3"/>
       <rect x="110" y="110" width="30" height="12" rx="3" fill="#9fd8ef" stroke="${IN}" stroke-width="2"/>
       <rect x="98" y="108" width="7" height="22" rx="2" fill="#cfd6dc" stroke="${IN}" stroke-width="2"/>
       <circle cx="147" cy="108" r="3" fill="#ffb400" stroke="${IN}" stroke-width="1.5"/>
     </g>` +
    `<g class="fv f-spin" style="transform-origin:50% 50%"><circle cx="152" cy="140" r="11" fill="#2b2b2b" stroke="${IN}" stroke-width="3"/></g>` +
    cap(56, 40, "CAN'T SEE!", { size: 14, fill: '#fffaf0', stroke: IN }),

  // 14. Caught in a flash flood: tumbling down the creek.
  'flash-flood': (p) => rect(0, 0, W, 150, '#e6d3a3') + rect(0, 58, W, 92, '#9c6b3a') +
    `<path d="M0 66 q34 -10 68 0 t68 0 t68 0 t68 0" stroke="#f6e7c8" stroke-width="4" fill="none" opacity=".65"/>` +
    `<g class="fv f-drift"><rect x="150" y="30" width="6" height="46" fill="#8a6a3a" stroke="${IN}" stroke-width="2"/><rect x="134" y="16" width="38" height="15" rx="3" fill="#ffd25e" stroke="${IN}" stroke-width="3"/></g>` +
    victim({ x: 92, y: 96, s: .85, skin: p.skin, shirt: p.shirt, cls: 'f-tumble', origin: '50% 50%' }) +
    `<g class="fv f-splash">${circle(66, 74, 9, '#fffaf0')}${circle(122, 66, 7, '#fffaf0')}</g>` +
    cap(58, 34, 'SWEPT AWAY!', { size: 14, fill: '#c8412f' }),

  // 15. Stayed in the pool in a storm: zapped, hair standing on end.
  'lightning-pool': (p) => rect(0, 0, W, 150, '#5b6c8f') + rect(0, 104, W, 46, '#8fd0e0') +
    `<g class="fv f-bob">${circle(70, 26, 22, '#3b4660')}${circle(100, 20, 26, '#3b4660')}${circle(134, 28, 20, '#3b4660')}</g>` +
    `<path class="fv f-flash" d="M108 36 l-14 30 h14 l-10 30 l28 -40 h-14 l10 -20 z" fill="#ffe066" stroke="${IN}" stroke-width="3" stroke-linejoin="round"/>` +
    victim({ x: 96, y: 128, s: .8, skin: p.skin, shirt: p.shirt, cls: 'f-shake', origin: '50% 100%' }) +
    `<g class="fv f-rise">${circle(84, 58, 6, '#cfd6dc')}${circle(100, 52, 8, '#cfd6dc')}${circle(114, 60, 5, '#cfd6dc')}</g>` +
    cap(190, 46, 'ZAP!', { size: 20, fill: '#ffe066', stroke: IN }) +
    cap(176, 142, 'out of the pool, inside!', { size: 10, fill: '#fffaf0', stroke: IN, sw: 2 }),

  // 16. No repellent at dusk: the mozzies have a feast.
  'mozzie-dusk': (p) => rect(0, 0, W, 150, '#f4a67a') + rect(0, 112, W, 38, '#6b7a3a') +
    `<circle cx="198" cy="96" r="22" fill="#ffd25e" opacity=".9"/>` +
    victim({ x: 96, y: 134, s: .85, skin: p.skin, shirt: p.shirt, cls: 'f-shake', origin: '50% 100%' }) +
    `<g class="fv f-spin" style="transform-origin:50% 50%">${[[60, 40], [130, 46], [96, 24], [72, 84], [126, 86]].map(([x, y]) =>
      `<g transform="translate(${x} ${y})"><ellipse rx="5" ry="3" fill="${IN}"/><path d="M-2 -2 l-5 -6 M2 -2 l5 -6" stroke="${IN}" stroke-width="1.5"/></g>`).join('')}</g>` +
    `<g class="fv f-pulse" style="transform-origin:50% 50%">${circle(86, 70, 4, '#c8412f')}${circle(106, 62, 3.5, '#c8412f')}${circle(110, 84, 3.5, '#c8412f')}</g>` +
    cap(186, 34, 'BZZZ!', { size: 18, fill: '#c8412f' }) +
    cap(70, 146, 'cover up at dusk', { size: 10, fill: '#fffaf0', stroke: IN, sw: 2 }),

  // 17. No slip, slop, slap: one lobster-red Territorian.
  'sun-slip': (p) => rect(0, 0, W, 150, '#ffe9a8') + rect(0, 112, W, 38, '#f2d89b') +
    `<g class="fv f-spin" style="transform-origin:50% 50%"><circle cx="196" cy="38" r="24" fill="#ffd25e" stroke="${IN}" stroke-width="3"/>
       <path d="M196 8 v-6 M228 38 h6 M164 38 h-6 M196 70 v6 M219 15 l4 -4 M173 15 l-4 -4 M219 61 l4 4 M173 61 l-4 4" stroke="#e0892e" stroke-width="4" stroke-linecap="round"/></g>` +
    victim({ x: 92, y: 136, s: .85, skin: '#e2725b', shirt: p.shirt, cls: 'f-wilt', origin: '50% 100%' }) +
    `<g class="fv f-heat" style="transform-origin:50% 100%"><path d="M76 54 q6 -10 0 -20 M96 50 q6 -10 0 -20 M116 54 q6 -10 0 -20" stroke="#c8412f" stroke-width="4" fill="none" stroke-linecap="round"/></g>` +
    cap(180, 100, 'LOBSTER MODE!', { size: 13, fill: '#c8412f' }) +
    cap(70, 146, 'slip slop slap seek slide', { size: 10 }),

  // 18. Roos at dusk: the roo wins, the bullbar loses.
  'roo-dusk': (p) => rect(0, 0, W, 150, '#c4683a') + rect(70, 0, 100, 150, '#4a4a52') +
    `<path d="M120 0 v14 M120 30 v14 M120 60 v14 M120 90 v14 M120 120 v14" stroke="#ffe9a8" stroke-width="3"/>` +
    rect(0, 0, W, 150, '#3b2a6b', 'opacity=".22"') +
    `<g class="fv f-shake" style="transform-origin:50% 50%">
       <rect x="96" y="82" width="48" height="58" rx="8" fill="#2f7fd0" stroke="${IN}" stroke-width="3"/>
       <rect x="101" y="88" width="38" height="14" rx="3" fill="#9fd8ef" stroke="${IN}" stroke-width="2"/>
       <rect x="92" y="78" width="56" height="7" rx="3" fill="#cfd6dc" stroke="${IN}" stroke-width="2.5"/>
     </g>` +
    `<g class="fv f-bounce" style="transform-origin:50% 100%"><g transform="translate(124 76)">
       <path d="M-8 -12 q-22 4 -30 12 q10 -2 32 -6 z" fill="#9a5d2c" stroke="${IN}" stroke-width="2.5"/>
       <ellipse cx="-1" cy="-20" rx="12" ry="16" fill="#b5733a" stroke="${IN}" stroke-width="2.5"/>
       <ellipse cx="9" cy="-38" rx="9" ry="7" fill="#b5733a" stroke="${IN}" stroke-width="2.5"/>
       <ellipse cx="4" cy="-48" rx="3" ry="6" fill="#b5733a" stroke="${IN}" stroke-width="2"/>
       <path d="M8 -42 l4 4 M12 -42 l-4 4" stroke="${IN}" stroke-width="2"/>
     </g></g>` +
    `<g class="fv f-spin" style="transform-origin:50% 50%">${cap(100, 40, '★', { size: 16, fill: '#ffd25e', stroke: IN })}${cap(146, 34, '★', { size: 14, fill: '#ffd25e', stroke: IN })}</g>` +
    cap(196, 30, 'BONK!', { size: 20, fill: '#ffd25e', stroke: IN }) +
    cap(176, 142, 'brake, never swerve', { size: 10, fill: '#fffaf0', stroke: IN, sw: 2 }),

  // Boss: Cyclone Night. Should have sheltered: round and round we go.
  'boss-cyclone': (p) => rect(0, 0, W, 150, '#2b3a5b') +
    `<path d="M120 75 m-50 0 a50 50 0 1 1 50 50 a32 32 0 1 1 -24 -30" stroke="#8fd0e0" stroke-width="7" fill="none" stroke-linecap="round" class="fv f-spin" style="transform-origin:50% 50%"/>` +
    `<g class="fv f-tumble" style="transform-origin:50% 50%">${victim({ x: 120, y: 104, s: .7, skin: p.skin, shirt: p.shirt })}</g>` +
    `<g class="fv f-fly"><rect x="30" y="100" width="26" height="18" rx="3" fill="#c8412f" stroke="${IN}" stroke-width="3"/></g>` +
    cap(120, 24, 'SHOULD HAVE SHELTERED!', { size: 12, fill: '#ffe066', stroke: IN }),

  // Boss: Croc Creek. The big one wins this time.
  'boss-croc': (p) => rect(0, 0, W, 150, '#7fb8a8') + rect(0, 86, W, 64, '#2f7f8f') +
    croc(168, 100, 1.2, 'f-chomp') +
    victim({ x: 116, y: 88, s: .8, skin: p.skin, shirt: p.shirt, cls: 'f-launch', origin: '50% 100%' }) +
    `<g class="fv f-splash">${circle(120, 102, 10, '#fffaf0')}${circle(146, 114, 8, '#fffaf0')}</g>` +
    cap(172, 30, 'BIG CROC WINS!', { size: 15, fill: '#c8412f' })
};

// Render the fail cartoon for a mini-game, tinted with the player's character colours.
export function failScene(gameId, character) {
  const scene = SCENES[gameId] || SCENES['croc-edge'];
  const pal = { skin: character?.skin || '#e0ac69', shirt: character?.shirt || '#f28ab2' };
  return `<svg viewBox="0 0 ${W} 150" xmlns="${NS}" class="fail-scene" role="img" aria-label="Ouch">${scene(pal)}</svg>`;
}
