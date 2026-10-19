// The journey: eight Northern Territory locations, in travel order. Each one is a
// stage of the run that introduces its own hazards (mini-games) and has its own art.
// Shared with the server (server/src/scoring.js), so keep this file free of DOM calls.
// Everything is drawn in code, like the rest of the game.
import { NS } from './art.js';

const INK = '#1d1a16';

export const LOCATIONS = [
  {
    id: 'darwin', name: 'Darwin', accent: '#8fd0e0', rounds: 5,
    blurb: 'The big smoke by the harbour. Stingers in the sea, crocs at the boat ramp.',
    games: ['stinger-suit', 'swim-sign', 'croc-edge', 'stinger-vinegar', 'cyclone-kit', 'lightning-pool', 'sun-slip']
  },
  {
    id: 'kakadu', name: 'Kakadu', accent: '#4f8a3c', rounds: 5,
    blurb: 'World-heritage wetlands. Crocs in every billabong and roads that disappear under water.',
    games: ['croc-edge', 'croc-camp', 'croc-trap', 'flood-road', 'bushfire-leave', 'mozzie-dusk']
  },
  {
    id: 'litchfield', name: 'Litchfield', accent: '#2f8fa8', rounds: 5,
    blurb: 'Waterfalls and plunge pools. That inviting pool may already have a croc in it.',
    games: ['swim-sign', 'croc-camp', 'croc-edge', 'flood-road', 'lightning-pool']
  },
  {
    id: 'katherine', name: 'Katherine', accent: '#c9a25a', rounds: 5,
    blurb: 'Big river country. It floods fast, and the heat does not let up.',
    games: ['flood-road', 'heat-drink', 'croc-edge', 'swim-sign']
  },
  {
    id: 'arnhem', name: 'Arnhem Land', accent: '#b5641a', rounds: 5,
    blurb: 'Escarpment and rock holes. Beautiful, remote, and home to plenty of saltwater crocs.',
    games: ['rock-hole', 'croc-camp', 'bushfire-leave', 'croc-edge', 'mozzie-dusk']
  },
  {
    id: 'barkly', name: 'Barkly', accent: '#e0892e', rounds: 5,
    blurb: 'The long, flat drive east. Dust storms, road trains and flooded crossings.',
    games: ['dust-storm', 'flood-road', 'heat-drink', 'bushfire-leave']
  },
  {
    id: 'alice', name: 'Alice Springs', accent: '#c8412f', rounds: 5,
    blurb: 'Desert country. Dry rivers that flood in minutes, snakes and relentless heat.',
    games: ['flash-flood', 'heat-drink', 'snake-bite', 'bushfire-leave']
  },
  {
    id: 'uluru', name: 'Uluru Region', accent: '#f4845f', rounds: 5,
    blurb: 'Red centre and big skies. Carry water, watch for snakes, know your fire plan.',
    games: ['heat-drink', 'snake-bite', 'bushfire-leave', 'flash-flood', 'sun-slip']
  }
];

export const LOCATION_COUNT = LOCATIONS.length;
export const locationAt = (i) => LOCATIONS[((i % LOCATION_COUNT) + LOCATION_COUNT) % LOCATION_COUNT];

// Journey: which stop a round (1-based) is played at, counting on past Uluru (stop 8 = Darwin again).
// The server uses this too, to check that every Journey round was a hazard from that stop.
export function journeyStop(round) {
  let r = round, i = 0;
  while (r > locationAt(i).rounds) { r -= locationAt(i).rounds; i++; }
  return i;
}

// Themed landscape for a location, used on the "now arriving" card.
export function locationArt(id) {
  const sky = (fill) => `<rect width="360" height="160" fill="${fill}"/>`;
  const ground = (fill, y) => `<rect y="${y}" width="360" height="${160 - y}" fill="${fill}"/>`;
  const sun = `<circle cx="298" cy="42" r="24" fill="#ffe066" stroke="${INK}" stroke-width="3"/>`;
  const crocEyes = `<ellipse cx="70" cy="126" rx="30" ry="6" fill="#3e5f2a" stroke="${INK}" stroke-width="2"/><circle cx="60" cy="123" r="4" fill="#ffe066" stroke="${INK}" stroke-width="1.5"/><circle cx="80" cy="123" r="4" fill="#ffe066" stroke="${INK}" stroke-width="1.5"/>`;

  const art = {
    darwin: sky('#8fd0e0') + sun + ground('#2f8fa8', 100) +
      `<g fill="#f2d89b" stroke="${INK}" stroke-width="3">
         <rect x="30" y="50" width="36" height="52"/><rect x="76" y="30" width="30" height="72"/>
         <rect x="116" y="58" width="32" height="44"/><rect x="156" y="42" width="26" height="60"/>
       </g>
       <g fill="#c8412f"><rect x="76" y="30" width="30" height="10"/><rect x="30" y="50" width="36" height="8"/></g>
       <path d="M0 112 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#fffaf0" stroke-width="3" fill="none" opacity=".45"/>
       <path d="M236 120 h56 l-10 -16 h-36 z" fill="#fffaf0" stroke="${INK}" stroke-width="3"/>
       <line x1="264" y1="104" x2="264" y2="76" stroke="${INK}" stroke-width="3"/>
       <path d="M264 78 l24 10 l-24 10 z" fill="#e0892e" stroke="${INK}" stroke-width="3"/>` + crocEyes,

    kakadu: sky('#cfe8a0') + sun + ground('#4f8a3c', 96) +
      `<path d="M-10 96 q40 -46 90 -30 q50 -26 100 -6 q50 -20 110 10 l0 26 l-320 0 z" fill="#8a6a3a" stroke="${INK}" stroke-width="3"/>
       <rect y="118" width="360" height="42" fill="#2f8fa8"/>
       <path d="M0 126 q30 -6 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#fffaf0" stroke-width="3" fill="none" opacity=".4"/>
       <g fill="#7fb35a" stroke="${INK}" stroke-width="2"><ellipse cx="120" cy="138" rx="16" ry="7"/><ellipse cx="196" cy="146" rx="14" ry="6"/></g>
       <path d="M250 40 q10 -12 22 -4 q-8 8 -22 4z" fill="#fffaf0" stroke="${INK}" stroke-width="2"/>` + crocEyes,

    litchfield: sky('#bfe3ea') + sun + ground('#4f8a3c', 92) +
      `<path d="M0 92 q60 -34 130 -22 q70 12 130 -4 q60 -16 100 8 l0 24 l-360 0 z" fill="#8a6a3a" stroke="${INK}" stroke-width="3"/>
       <path d="M150 20 h20 v54 q-10 12 -20 0 z" fill="#9fd8ef" stroke="${INK}" stroke-width="3"/>
       <ellipse cx="160" cy="118" rx="70" ry="26" fill="#2f8fa8" stroke="${INK}" stroke-width="3"/>
       <path d="M120 112 q20 -8 40 0" stroke="#fffaf0" stroke-width="3" fill="none" opacity=".5"/>
       <path d="M262 70 q-4 34 2 46 M262 70 q-18 8 -22 24 M262 70 q18 6 22 22" stroke="#3f7a2e" stroke-width="5" fill="none" stroke-linecap="round"/>`,

    katherine: sky('#f2c98a') + sun + ground('#c9a25a', 92) +
      `<path d="M0 92 l60 -40 l50 22 l60 -30 l70 34 l60 -20 l60 30 l0 24 l-360 0 z" fill="#a07a4a" stroke="${INK}" stroke-width="3"/>
       <rect y="118" width="360" height="42" fill="#2f8fa8"/>
       <ellipse cx="120" cy="134" rx="34" ry="7" fill="#e0892e" stroke="${INK}" stroke-width="2"/>
       <line x1="120" y1="134" x2="150" y2="120" stroke="${INK}" stroke-width="3"/>
       <path d="M0 126 q30 -6 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#fffaf0" stroke-width="3" fill="none" opacity=".4"/>`,

    arnhem: sky('#e7c78a') + sun + ground('#b5641a', 96) +
      `<path d="M0 96 q70 -50 140 -30 q70 18 130 -10 q50 -22 90 6 l0 36 l-360 0 z" fill="#c98a4a" stroke="${INK}" stroke-width="3"/>
       <ellipse cx="180" cy="128" rx="86" ry="24" fill="#2f8fa8" stroke="${INK}" stroke-width="3"/>
       <g fill="#f6e7c8" stroke="${INK}" stroke-width="2"><circle cx="60" cy="70" r="5"/><circle cx="74" cy="80" r="4"/><circle cx="50" cy="84" r="3"/></g>
       <path d="M300 78 q-6 40 2 52 M300 78 q-22 10 -26 28" stroke="#3f7a2e" stroke-width="5" fill="none" stroke-linecap="round"/>` + crocEyes,

    barkly: sky('#f0d9a8') + sun + ground('#d9b877', 104) +
      `<path d="M0 104 q80 -14 160 -4 q80 10 200 -6 l0 66 l-360 0 z" fill="#e6cf9a" stroke="${INK}" stroke-width="3"/>
       <rect y="96" width="360" height="14" fill="#6d6d6d"/>
       <path d="M40 96 v-30 M120 96 v-30 M200 96 v-30" stroke="${INK}" stroke-width="3"/>
       <path d="M40 66 q80 -22 160 0" stroke="${INK}" stroke-width="3" fill="none"/>
       <g fill="#8a7f75" opacity=".7"><circle cx="60" cy="40" r="20"/><circle cx="96" cy="30" r="24"/><circle cx="140" cy="42" r="18"/></g>
       <g transform="translate(250 92)"><rect x="0" y="-14" width="70" height="18" rx="4" fill="#c8412f" stroke="${INK}" stroke-width="3"/><rect x="66" y="-22" width="26" height="24" rx="4" fill="#fffaf0" stroke="${INK}" stroke-width="3"/></g>`,

    alice: sky('#ffd9a0') + sun + ground('#c8412f', 96) +
      `<path d="M0 96 l50 -34 l46 20 l56 -30 l64 34 l60 -22 l84 30 l0 26 l-360 0 z" fill="#a05a3a" stroke="${INK}" stroke-width="3"/>
       <path d="M0 120 q40 -12 80 0 t80 0 t80 0 t80 0 t40 0" stroke="#e6cf9a" stroke-width="8" fill="none"/>
       <path d="M60 96 q-4 -26 4 -36 M60 60 q-20 6 -24 20 M60 60 q20 6 24 20" stroke="#3f7a2e" stroke-width="5" fill="none" stroke-linecap="round"/>
       <path d="M300 96 q-4 -24 4 -34 M300 62 q-18 6 -22 18 M300 62 q18 6 22 18" stroke="#3f7a2e" stroke-width="5" fill="none" stroke-linecap="round"/>`,

    uluru: sky('#f7b267') + `<circle cx="298" cy="46" r="26" fill="#ffd25e" stroke="${INK}" stroke-width="3"/>` + ground('#d98a4a', 104) +
      `<path d="M40 116 q10 -76 80 -78 q70 -2 84 66 l0 22 l-164 0 z" fill="#c8412f" stroke="${INK}" stroke-width="4"/>
       <path d="M70 112 q14 -50 54 -52" stroke="#e0725a" stroke-width="6" fill="none" stroke-linecap="round"/>
       <path d="M60 130 q-4 -26 4 -36 M60 94 q-20 6 -24 20" stroke="#3f7a2e" stroke-width="5" fill="none" stroke-linecap="round"/>
       <path d="M300 130 q-4 -26 4 -36 M300 94 q20 6 24 20" stroke="#3f7a2e" stroke-width="5" fill="none" stroke-linecap="round"/>`
  };
  return `<svg viewBox="0 0 360 160" xmlns="${NS}" class="loc-art-svg" aria-hidden="true">${art[id] || art.darwin}</svg>`;
}

// Full-stage landscape drawn behind the mini-games, so every round looks like it is
// happening in the location you are travelling through. The scene viewBox is 360x480,
// but the drawing deliberately overflows it: tall phone screens letterbox the viewBox,
// and this way the scenery still fills that space instead of leaving flat colour bars.
//
// A soft haze is layered over the scenery (but still beneath the game sprites) so the
// backdrop recedes and the round's characters, crocs and props stay easy to read.
export function locationBackdrop(id) {
  const ink = (w = 3) => `stroke="${INK}" stroke-width="${w}"`;

  // Sky and ground cover the whole SVG viewport, well past the 360x480 viewBox.
  const sky = (fill) => `<rect x="-240" y="-700" width="840" height="${700 + 300}" fill="${fill}"/>`;
  const ground = (fill, y = 300) => `<rect x="-240" y="${y}" width="840" height="1400" fill="${fill}"/>`;
  const sun = (cx, cy, r = 24) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffd25e" ${ink()}/>`;
  const cloud = (cx, cy, s = 1) => `<g transform="translate(${cx} ${cy}) scale(${s})" fill="#fffaf0" ${ink(2.5)} opacity=".85"><ellipse cx="0" cy="0" rx="26" ry="14"/><ellipse cx="20" cy="4" rx="18" ry="11"/><ellipse cx="-20" cy="5" rx="16" ry="10"/></g>`;
  const wave = (y, o = .4) => `<path d="M-60 ${y} q30 -10 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#fffaf0" stroke-width="4" fill="none" opacity="${o}"/>`;
  const tussock = (x, y, s = 1, c = '#3f7a2e') => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"><path d="M0 0 q-6 -30 0 -46"/><path d="M0 0 q-22 4 -30 24"/><path d="M0 0 q22 4 30 24"/></g>`;

  const art = {
    // Darwin: harbour city skyline, a boat on the blue water and a palm on the shore.
    darwin: sky('#8fd0e0') + sun(300, 70, 24) + cloud(70, 30, .8) + cloud(250, 12, .6) +
      `<rect x="-240" y="248" width="840" height="116" fill="#2f8fa8"/>` + wave(272) + wave(306, .3) +
      `<g fill="#f2d89b" ${ink()}><rect x="10" y="196" width="34" height="56"/><rect x="52" y="168" width="28" height="84"/><rect x="88" y="208" width="30" height="44"/><rect x="126" y="182" width="24" height="70"/></g>
       <g fill="#c8412f"><rect x="52" y="168" width="28" height="10"/><rect x="10" y="196" width="34" height="8"/></g>
       <g ${ink()} fill="none"><path d="M176 252 v-72 M176 180 h34 M210 180 v22"/></g>
       <g transform="translate(278 262)"><path d="M-24 0 h48 l-8 12 h-32 z" fill="#fffaf0" ${ink()}/><line x1="0" y1="0" x2="0" y2="-26" ${ink()}/><path d="M0 -26 l18 8 l-18 8 z" fill="#e0892e" ${ink(2)}/></g>
       <ellipse cx="150" cy="326" rx="26" ry="6" fill="#3e5f2a" ${ink(2)}/><circle cx="141" cy="323" r="3.6" fill="#ffe066" ${ink(1.4)}/><circle cx="159" cy="323" r="3.6" fill="#ffe066" ${ink(1.4)}/>` +
      ground('#e6d3a3', 352) +
      `<path d="M320 500 q-6 -70 4 -100 M324 400 q-30 4 -40 26 M324 400 q30 4 38 26 M324 400 q-20 -18 -34 -14" stroke="#3f7a2e" stroke-width="7" fill="none" stroke-linecap="round"/>`,

    // Kakadu: escarpment behind the world-heritage wetlands and their lilies.
    kakadu: sky('#cfe8a0') + sun(300, 66, 22) + cloud(90, 34, .7) +
      `<path d="M-40 300 q60 -76 132 -58 q40 -34 92 -12 q40 -18 92 6 q40 -10 104 20 l0 44 z" fill="#8a6a3a" ${ink()}/>
       <path d="M-40 300 q60 -76 132 -58 q40 -34 92 -12 q40 -18 92 6 q40 -10 104 20" fill="none" stroke="#a3834d" stroke-width="5" opacity=".55"/>` +
      `<rect x="-240" y="286" width="840" height="30" fill="#6f9a4a"/>` +
      `<rect x="-240" y="300" width="840" height="220" fill="#2f7f8f"/>` + wave(326) + wave(366, .3) +
      `<g fill="#7fb35a" ${ink(2)}><ellipse cx="90" cy="332" rx="18" ry="8"/><ellipse cx="150" cy="356" rx="14" ry="6"/><ellipse cx="250" cy="340" rx="16" ry="7"/></g>
       <g stroke="#3f7a2e" stroke-width="5" fill="none" stroke-linecap="round"><path d="M40 300 q-4 -34 2 -48"/><path d="M52 300 q6 -30 0 -44"/><path d="M330 300 q4 -32 -2 -46"/><path d="M318 300 q-6 -28 0 -42"/></g>
       <path d="M210 92 q10 -12 22 -4 q-8 8 -22 4z" fill="#fffaf0" ${ink(2)}/><path d="M252 72 q8 -10 18 -3 q-7 7 -18 3z" fill="#fffaf0" ${ink(2)}/>`,

    // Litchfield: a waterfall dropping off the escarpment into a plunge pool.
    litchfield: sky('#bfe3ea') + sun(296, 60, 22) + cloud(80, 40, .7) +
      `<path d="M226 300 q10 -124 62 -154 q24 -14 36 -6 l0 160 z" fill="#9a7a4a" ${ink()}/>
       <path d="M238 300 q8 -98 48 -132" stroke="#b5945f" stroke-width="5" fill="none" opacity=".6"/>` +
      `<path d="M272 150 h22 v134 q-11 12 -22 0 z" fill="#9fd8ef" ${ink()}/>
       <path d="M278 162 v110 M288 162 v118" stroke="#fffaf0" stroke-width="3" opacity=".6"/>` +
      `<ellipse cx="180" cy="332" rx="152" ry="58" fill="#2f8fa8" ${ink()}/>` + wave(328) + wave(356, .3) +
      `<g transform="translate(58 300)"><path d="M0 0 q-4 -60 4 -88" stroke="#6b4a2b" stroke-width="8" fill="none" stroke-linecap="round"/><g stroke="#3f7a2e" stroke-width="6" fill="none" stroke-linecap="round"><path d="M2 -88 q-34 2 -48 26"/><path d="M2 -88 q34 2 48 26"/><path d="M2 -88 q-22 -20 -40 -18"/><path d="M2 -88 q22 -20 40 -18"/></g></g>` +
      ground('#6f9a4a', 358),

    // Katherine: big river country running between red gorge walls.
    katherine: sky('#f2c98a') + sun(62, 66, 24) + cloud(272, 40, .7) +
      `<path d="M-40 300 l72 -122 l60 40 l40 -70 l0 152 z" fill="#a05a3a" ${ink()}/>
       <path d="M400 300 l-92 -132 l-70 50 l-40 -60 l0 142 z" fill="#8a4a34" ${ink()}/>` +
      `<rect x="-240" y="300" width="840" height="240" fill="#2f8fa8"/>` + wave(326) + wave(366, .3) +
      `<ellipse cx="120" cy="358" rx="46" ry="10" fill="#e0b877" ${ink(2)}/>`,

    // Arnhem Land: rock-art country, a sandstone plateau over a remote waterhole.
    arnhem: sky('#e7c78a') + sun(300, 70, 22) + cloud(90, 44, .6) +
      `<path d="M-40 300 q70 -100 152 -70 q40 -30 92 -12 q60 -16 104 22 l0 60 z" fill="#c98a4a" ${ink()}/>
       <path d="M-40 300 q70 -100 152 -70 q40 -30 92 -12 q60 -16 104 22" fill="none" stroke="#a06a30" stroke-width="5" opacity=".5"/>` +
      `<g fill="#f6e7c8" ${ink(2)}><circle cx="70" cy="232" r="5"/><circle cx="86" cy="244" r="4"/><circle cx="58" cy="248" r="3"/><circle cx="100" cy="230" r="3"/></g>` +
      `<ellipse cx="180" cy="358" rx="176" ry="68" fill="#2f8fa8" ${ink()}/>` + wave(350) +
      ground('#b5641a', 300),

    // Barkly: the long flat drive east, highway running to the horizon in dust.
    barkly: sky('#f0d9a8') + sun(300, 74, 22) +
      `<path d="M-40 288 q80 -30 160 -8 q80 22 228 -14 l0 36 l-436 0 z" fill="#c9a25a" ${ink()}/>` +
      ground('#d9b877', 300) +
      `<path d="M132 520 L172 300 L188 300 L228 520 z" fill="#6d6d6d" ${ink()}/>` +
      `<path d="M180 300 v44 M180 364 v44 M180 428 v92" stroke="#fffaf0" stroke-width="4" stroke-dasharray="14 12"/>` +
      `<g opacity=".5" fill="#8a7f75"><circle cx="150" cy="278" r="16"/><circle cx="184" cy="272" r="20"/><circle cx="214" cy="282" r="14"/></g>
       <g transform="translate(300 286)"><rect x="-30" y="-14" width="52" height="14" rx="3" fill="#c8412f" ${ink(2)}/><rect x="20" y="-18" width="22" height="18" rx="3" fill="#fffaf0" ${ink(2)}/></g>` +
      tussock(70, 404, 1, '#8a9a4a') + tussock(306, 436, 1.1, '#8a9a4a') + tussock(120, 466, .9, '#8a9a4a'),

    // Alice Springs: desert ranges over a dry riverbed and ghost gums.
    alice: sky('#ffd9a0') + sun(296, 66, 24) +
      `<path d="M-40 292 l70 -66 l60 40 l70 -70 l70 78 l60 -50 l94 60 l0 44 z" fill="#a05a3a" ${ink()}/>
       <path d="M-40 300 l60 -40 l50 26 l70 -46 l80 56 l60 -34 l84 46 l0 32 z" fill="#8a4a34" ${ink()} opacity=".9"/>` +
      ground('#e6cf9a', 300) +
      `<rect x="-240" y="340" width="840" height="46" fill="#d8c391"/>
       <path d="M-60 364 q40 -8 80 0 t80 0 t80 0 t80 0 t80 0 t80 0" stroke="#e6cf9a" stroke-width="5" fill="none"/>` +
      `<g transform="translate(64 350)"><path d="M0 0 q-6 -62 6 -86" stroke="#f2ede0" stroke-width="8" fill="none" stroke-linecap="round"/><g fill="#5f8a45" ${ink(2)}><circle cx="-14" cy="-94" r="16"/><circle cx="12" cy="-102" r="18"/><circle cx="26" cy="-86" r="13"/></g></g>
       <g transform="translate(312 342)"><path d="M0 0 q6 -58 -4 -80" stroke="#f2ede0" stroke-width="7" fill="none" stroke-linecap="round"/><g fill="#5f8a45" ${ink(2)}><circle cx="-13" cy="-88" r="14"/><circle cx="13" cy="-92" r="15"/></g></g>
       <g stroke="#a05a3a" stroke-width="4" fill="none"><path d="M64 350 q-4 30 4 40"/><path d="M312 342 q4 26 -4 34"/></g>`,

    // Uluru: the rock and Kata Tjuta under a red-centre sky.
    uluru: sky('#f7b267') + sun(300, 64, 26) +
      `<g fill="#9a4a3a" ${ink()}><path d="M250 300 q16 -46 40 -46 q24 0 40 46 z"/><path d="M302 300 q10 -30 26 -30 q16 0 26 30 z"/></g>` +
      ground('#d98a4a', 300) +
      `<path d="M10 322 q6 -122 96 -124 q92 -2 108 108 l0 16 z" fill="#c8412f" ${ink(4)}/>
       <path d="M44 316 q22 -86 78 -92" stroke="#e0725a" stroke-width="7" fill="none" stroke-linecap="round"/>
       <path d="M120 320 q6 -60 -2 -92" stroke="#a8301f" stroke-width="5" fill="none" opacity=".5"/>` +
      tussock(250, 364, 1.1, '#7a6a2e') + tussock(324, 404, 1, '#7a6a2e')
  };
  // Drawn last so it sits over the scenery, but the game's own art is appended to the
  // scene afterwards and therefore renders crisply on top of it.
  const haze = `<rect x="-240" y="-700" width="840" height="2400" fill="#fffaf0" opacity=".45"/>`;
  return `<g class="loc-backdrop" aria-hidden="true">${art[id] || art.darwin}${haze}</g>`;
}

// Classic and Daily rounds also get a backdrop: the first location that features the hazard.
export function homeLocationFor(gameId) {
  return LOCATIONS.find(l => l.games.includes(gameId)) || LOCATIONS[0];
}
