// The "Funny Territory Characters": the player's avatars, their code-drawn art and
// the coin profile that unlocks them. Like the rest of the game, the art is drawn in
// code (no image files) so it stays small and works offline.
//
// Each character has three moods: 'idle' (menu), 'win' and 'fail' (result screens),
// each with its own pose and animation.
import { NS } from './art.js';

const INK = '#1d1a16';

// price 0 = free/starter. Cheaper mates unlock first.
export const CHARACTERS = [
  {
    id: 'barry', name: 'Backpacker Barry', price: 0, accent: '#2f7fd0', skin: '#e0ac69', shirt: '#f28ab2',
    tagline: 'Two thumbs, one billy, zero sunscreen.',
    winLine: 'Barry scored a lift!', failLine: 'Barry got bogged.'
  },
  {
    id: 'craig', name: 'Croc-Wrestling Craig', price: 100, accent: '#4f8a3c', skin: '#c68642', shirt: '#4f8a3c',
    tagline: 'He calls the big ones "mate".',
    winLine: 'Craig wrangled it!', failLine: 'Craig got chomped.'
  },
  {
    id: 'cheryl', name: 'Cyclone Cheryl', price: 180, accent: '#6a5aa8', skin: '#f1c27d', shirt: '#ffe066',
    tagline: 'Already taped the windows. Twice.',
    winLine: 'Cheryl weathered it!', failLine: 'Cheryl blew away.'
  },
  {
    id: 'bazza', name: 'Bush Mechanic Bazza', price: 260, accent: '#e0892e', skin: '#8d5524', shirt: '#b8b8b8',
    tagline: 'She\'ll be right.',
    winLine: 'Bazza got it going!', failLine: 'Bazza blew a head gasket.'
  },
  {
    id: 'trevor', name: 'Tourist Trevor', price: 350, accent: '#f28ab2', skin: '#f1c27d', shirt: '#8fd0e0',
    tagline: 'Is this the one with the crocs?',
    winLine: 'Trevor got the shot!', failLine: 'Trevor got toasted.'
  },
  {
    id: 'mick', name: 'Mad Dog Mick', price: 450, accent: '#c8412f', skin: '#e0ac69', shirt: '#2b2b2b',
    tagline: 'Watch this, mate.',
    winLine: 'Mick went the ton!', failLine: 'Mick stacked it.'
  },
  {
    id: 'sheila', name: 'Market Stall Sheila', price: 600, accent: '#ffd25e', skin: '#c68642', shirt: '#f28ab2',
    tagline: 'Mangoes, two for five.',
    winLine: 'Sheila sold out!', failLine: 'Sheila dropped the mangoes.'
  }
];

export const charById = (id) => CHARACTERS.find(c => c.id === id) || CHARACTERS[0];

// ---------- small shared parts ----------
const SHADOW = '<ellipse cx="100" cy="185" rx="44" ry="9" fill="rgba(0,0,0,.18)"/>';
const headBase = (skin) => `<circle cx="100" cy="56" r="30" fill="${skin}" stroke="${INK}" stroke-width="4"/>`;
const torso = (fill, y = 80, h = 62) => `<rect x="68" y="${y}" width="64" height="${h}" rx="22" fill="${fill}" stroke="${INK}" stroke-width="4"/>`;
const legs = (pants, shoe) => `<g class="ch-legs">
  <rect x="78" y="132" width="17" height="50" rx="8" fill="${pants}" stroke="${INK}" stroke-width="4"/>
  <rect x="105" y="132" width="17" height="50" rx="8" fill="${pants}" stroke="${INK}" stroke-width="4"/>
  <ellipse cx="86" cy="182" rx="15" ry="8" fill="${shoe}" stroke="${INK}" stroke-width="4"/>
  <ellipse cx="114" cy="182" rx="15" ry="8" fill="${shoe}" stroke="${INK}" stroke-width="4"/>
</g>`;
const armDown = (x, skin) => `<rect x="${x}" y="88" width="19" height="50" rx="9" fill="${skin}" stroke="${INK}" stroke-width="4"/><circle cx="${x + 9.5}" cy="140" r="11" fill="${skin}" stroke="${INK}" stroke-width="4"/>`;
const armUp = (x, skin) => `<rect x="${x}" y="40" width="19" height="52" rx="9" fill="${skin}" stroke="${INK}" stroke-width="4"/><circle cx="${x + 9.5}" cy="36" r="11" fill="${skin}" stroke="${INK}" stroke-width="4"/>`;
const armL = (inner, ox, oy) => `<g class="ch-armL" style="transform-box:view-box;transform-origin:${ox}px ${oy}px">${inner}</g>`;
const armR = (inner, ox, oy) => `<g class="ch-armR" style="transform-box:view-box;transform-origin:${ox}px ${oy}px">${inner}</g>`;

// Face parts. mood: idle | win | fail
function eyes(mood, { x = 100, y = 56, dx = 10, r = 4 } = {}) {
  if (mood === 'fail') {
    return `<g class="ch-eyes">
      <path d="M${x - dx - 5} ${y - 5} l10 10 M${x - dx + 5} ${y - 5} l-10 10" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M${x + dx - 5} ${y - 5} l10 10 M${x + dx + 5} ${y - 5} l-10 10" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
    </g>`;
  }
  if (mood === 'win') {
    return `<g class="ch-eyes"><path d="M${x - dx - 7} ${y + 3} q7 -10 14 0 M${x + dx - 7} ${y + 3} q7 -10 14 0" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>`;
  }
  return `<g class="ch-eyes">
    <circle cx="${x - dx}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + dx}" cy="${y}" r="${r}" fill="${INK}"/>
    <circle cx="${x - dx + 1.4}" cy="${y - 1.4}" r="1.4" fill="#fff"/><circle cx="${x + dx + 1.4}" cy="${y - 1.4}" r="1.4" fill="#fff"/>
  </g>`;
}
function mouth(mood, { x = 100, y = 72, w = 18 } = {}) {
  if (mood === 'fail') return `<path d="M${x - w / 2} ${y + 5} q${w / 2} -12 ${w} 0" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  if (mood === 'win') return `<path d="M${x - w / 2 - 2} ${y - 3} q${w / 2 + 2} 16 ${w + 4} 0" stroke="${INK}" stroke-width="3.5" fill="#c8412f" stroke-linecap="round"/>`;
  return `<path d="M${x - w / 2} ${y} q${w / 2} 9 ${w} 0" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
}
// Ground shadow + feet helper kept in one place.
const ground = (extra = '') => SHADOW + extra;
const shades = '<g><circle cx="82" cy="56" r="10" fill="' + INK + '"/><circle cx="118" cy="56" r="10" fill="' + INK + '"/><rect x="90" y="52" width="20" height="4" fill="' + INK + '"/><circle cx="79" cy="52" r="2.6" fill="#fff" opacity=".7"/></g>';

// ---------- the seven characters ----------
const ART = {

  // 1. Backpacker Barry - singlet, backpack, a big friendly wave.
  barry(mood) {
    const skin = '#e0ac69';
    const win = mood === 'win', fail = mood === 'fail';
    const arms = win || fail
      ? armL(armUp(46, skin), 56, 92) + armR(armUp(135, skin), 145, 92)
      : armL(armDown(46, skin), 56, 92)
        + armR(`<g class="ch-thumb" style="transform-box:view-box;transform-origin:145px 104px">
                <rect x="136" y="74" width="19" height="36" rx="9" fill="${skin}" stroke="${INK}" stroke-width="4"/>
                <rect x="133.5" y="46" width="6" height="16" rx="3" fill="${skin}" stroke="${INK}" stroke-width="2.5"/>
                <rect x="139.5" y="42" width="6" height="18" rx="3" fill="${skin}" stroke="${INK}" stroke-width="2.5"/>
                <rect x="145.5" y="42" width="6" height="18" rx="3" fill="${skin}" stroke="${INK}" stroke-width="2.5"/>
                <rect x="151.5" y="46" width="6" height="16" rx="3" fill="${skin}" stroke="${INK}" stroke-width="2.5"/>
                <rect x="124" y="60" width="16" height="7" rx="3.5" fill="${skin}" stroke="${INK}" stroke-width="2.5" transform="rotate(-35 132 64)"/>
                <rect x="132" y="56" width="26" height="22" rx="9" fill="${skin}" stroke="${INK}" stroke-width="4"/>
              </g>`, 145, 104);
    return ground()
      + `<g class="ch-fig ${fail ? 'ch-wobble' : 'ch-bob'}">
        <g transform="${fail ? 'rotate(12 132 96)' : ''}">
          <rect x="118" y="70" width="36" height="54" rx="13" fill="#2f7fd0" stroke="${INK}" stroke-width="4"/>
          <rect x="126" y="84" width="20" height="12" rx="4" fill="#1f5d9e"/>
          <rect x="112" y="84" width="8" height="30" rx="4" fill="#1f5d9e" stroke="${INK}" stroke-width="3"/>
        </g>
        ${legs('#3b4a6b', '#e0892e')}
        ${arms}
        ${torso('#f28ab2')}
        ${headBase(skin)}
        <path d="M72 48 q8 -24 28 -22 q22 -2 28 22 q-8 -8 -16 -6 q0 -8 -12 -8 q-12 0 -14 10 q-8 -2 -14 4 z" fill="#6b4a2b" stroke="${INK}" stroke-width="3"/>
        ${fail ? eyes(mood) : shades}
        ${mouth(mood, { y: 74 })}
        ${fail ? '<path class="ch-pop" d="M134 44 q6 8 0 12 q6 -2 6 -6 z" fill="#8fd0e0" stroke="#2f7fd0" stroke-width="2"/>' : ''}
      </g>`;
  },

  // 2. Croc-Wrestling Craig - akubra, tooth necklace, ready stance.
  craig(mood) {
    const skin = '#c68642';
    const win = mood === 'win', fail = mood === 'fail';
    const hat = `<ellipse cx="100" cy="34" rx="46" ry="10" fill="#8a6a3a" stroke="${INK}" stroke-width="4"/>
                 <path d="M72 34 q4 -26 28 -26 q24 0 28 26 z" fill="#a7834b" stroke="${INK}" stroke-width="4"/>
                 <rect x="74" y="28" width="52" height="6" fill="#5a3d1e"/>`;
    const teeth = `<g>${[0, 1, 2, 3, 4].map(i => `<path d="M${82 + i * 9} 84 l5 10 l5 -10 z" fill="#fffaf0" stroke="${INK}" stroke-width="2"/>`).join('')}</g>`;
    const arms = win
      ? armL(`<rect x="34" y="60" width="22" height="40" rx="11" fill="${skin}" stroke="${INK}" stroke-width="4"/><circle cx="45" cy="52" r="13" fill="${skin}" stroke="${INK}" stroke-width="4"/>`, 60, 96)
        + armR(`<rect x="144" y="60" width="22" height="40" rx="11" fill="${skin}" stroke="${INK}" stroke-width="4"/><circle cx="155" cy="52" r="13" fill="${skin}" stroke="${INK}" stroke-width="4"/>`, 140, 96)
      : armL(armDown(48, skin), 58, 92) + armR(armDown(133, skin), 142, 92);
    const croc = fail
      ? `<g class="ch-jaw" style="transform-box:view-box;transform-origin:100px 22px">
           <path d="M64 24 q36 -22 72 0 q-6 -18 -36 -18 q-30 0 -36 18 z" fill="#4f7a33" stroke="${INK}" stroke-width="4"/>
           <path d="M64 24 l72 0 q-6 16 -36 16 q-30 0 -36 -16 z" fill="#3e5f2a" stroke="${INK}" stroke-width="4"/>
           ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${70 + i * 11} 24 l4 8 l4 -8 z" fill="#fffaf0" stroke="${INK}" stroke-width="2"/>`).join('')}
           <circle cx="86" cy="6" r="5" fill="#ffe066" stroke="${INK}" stroke-width="3"/>
           <circle cx="114" cy="6" r="5" fill="#ffe066" stroke="${INK}" stroke-width="3"/>
         </g>`
      : '';
    return ground()
      + `<g class="ch-fig ${win ? '' : 'ch-sway'}">
        ${legs('#8a6a3a', '#5a3d1e')}
        ${arms}
        ${torso('#4f8a3c')}
        ${teeth}
        ${headBase(skin)}
        ${eyes(mood)}
        ${mouth(mood, { y: 74, w: 22 })}
        ${hat}
        ${croc}
      </g>`;
  },

  // 3. Cyclone Cheryl - hi-vis vest, radio, leaning into the wind.
  cheryl(mood) {
    const skin = '#f1c27d';
    const fail = mood === 'fail', win = mood === 'win';
    const radio = `<g transform="${fail ? 'rotate(-30 140 120)' : ''}">
      <rect x="126" y="104" width="30" height="20" rx="4" fill="#5b6c8f" stroke="${INK}" stroke-width="3"/>
      <line x1="132" y1="104" x2="126" y2="86" stroke="${INK}" stroke-width="3"/>
      <rect x="132" y="110" width="12" height="5" fill="#ffe9a8" stroke="${INK}" stroke-width="2"/>
    </g>`;
    const gust = `<g stroke="#8fd0e0" stroke-width="4" fill="none" stroke-linecap="round">
      <path d="M-6 60 q18 -8 30 0"/>
      <path d="M-4 78 q22 -8 36 0"/>
    </g>`;
    const arms = fail
      ? armL(armDown(46, skin), 56, 96) + armR(armDown(135, skin), 144, 96)
      : win
        ? armL(armUp(46, skin), 56, 92) + armR(armUp(135, skin), 145, 92)
        : armL(armDown(48, skin), 58, 92) + radio;
    return ground()
      + `<g class="ch-fig ${fail ? 'ch-blown' : 'ch-lean'}">
        ${legs('#2b3a5b', '#2b2b2b')}
        ${arms}
        <rect x="66" y="78" width="68" height="66" rx="20" fill="#2b3a5b" stroke="${INK}" stroke-width="4"/>
        <path d="M74 80 h52 v58 h-52 z" fill="#ffe066" stroke="${INK}" stroke-width="4"/>
        <path d="M86 80 v58 M114 80 v58" stroke="#e0b400" stroke-width="4"/>
        ${headBase(skin)}
        <path d="M124 46 q18 -6 26 16 q-14 -6 -26 -2 z" fill="#7a3b1e" stroke="${INK}" stroke-width="3"/>
        ${eyes(mood)}
        ${mouth(mood, { y: 74 })}
        <path d="M72 40 q28 -18 56 0 q-6 -14 -28 -14 q-22 0 -28 14 z" fill="#2b3a5b" stroke="${INK}" stroke-width="4"/>
        <path d="M126 38 q16 -2 20 12" stroke="#2b3a5b" stroke-width="4" fill="none"/>
        ${fail ? gust : ''}
      </g>`;
  },

  // 4. Bush Mechanic Bazza - singlet, backwards cap, wrench and a cold drink.
  bazza(mood) {
    const skin = '#8d5524';
    const win = mood === 'win', fail = mood === 'fail';
    const stub = `<rect x="38" y="116" width="23" height="32" rx="7" fill="#ffe066" stroke="${INK}" stroke-width="3"/>
      <rect x="38" y="116" width="23" height="9" fill="#fffaf0" stroke="${INK}" stroke-width="3"/>
      <circle cx="45" cy="130" r="2" fill="#c8412f"/><circle cx="56" cy="135" r="2" fill="#c8412f"/><circle cx="49" cy="141" r="2" fill="#c8412f"/>`;
    const wrenchIn = (x, hy) => `<g class="ch-wrench" style="transform-box:view-box;transform-origin:${x}px ${hy}px">
      <rect x="${x - 5}" y="${hy - 30}" width="10" height="28" rx="4" fill="#cfd6dc" stroke="${INK}" stroke-width="3"/>
      <circle cx="${x}" cy="${hy - 32}" r="7" fill="none" stroke="#cfd6dc" stroke-width="7"/>
      <circle cx="${x}" cy="${hy - 32}" r="7" fill="none" stroke="${INK}" stroke-width="2"/></g>`;
    const right = win
      ? armR(armUp(135, skin) + wrenchIn(145, 36), 145, 92)
      : armR(armDown(135, skin) + wrenchIn(145, 140), 145, 94);
    const puff = `<g fill="#d8d2c8" stroke="${INK}" stroke-width="2">
      <circle class="ch-puff" cx="84" cy="24" r="8"/>
      <circle class="ch-puff d2" cx="96" cy="18" r="10"/>
      <circle class="ch-puff d3" cx="108" cy="26" r="7"/>
    </g>`;
    return ground()
      + `<g class="ch-fig ${fail ? 'ch-wobble' : 'ch-bob'}">
        ${legs('#4a4a4a', '#8a6a3a')}
        ${armL(armDown(46, skin) + stub, 56, 92)}
        ${right}
        ${torso('#b8b8b8')}
        <path d="M84 82 v60" stroke="#9a9a9a" stroke-width="3"/>
        ${headBase(skin)}
        <path d="M86 70 q6 6 12 0" stroke="${INK}" stroke-width="3" fill="none"/>
        ${mouth(mood, { y: 74 })}
        <path d="M72 44 q28 -20 56 0 q-8 -12 -28 -12 q-20 0 -28 12 z" fill="#c8412f" stroke="${INK}" stroke-width="4"/>
        <rect x="118" y="34" width="16" height="5" rx="2" fill="#8a2f22"/>
        ${fail ? puff : ''}
      </g>`;
  },

  // 5. Tourist Trevor - floral shirt, big hat, camera, socks and sandals.
  trevor(mood) {
    const skin = mood === 'fail' ? '#e2725b' : '#f1c27d';
    const flowers = [[84, 92], [100, 92], [116, 92], [92, 108], [108, 108], [84, 124], [100, 124], [116, 124]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#ffe066" stroke="${INK}" stroke-width="1.5"/>`).join('');
    const camera = `<g>
      <rect x="86" y="92" width="28" height="20" rx="4" fill="#333" stroke="${INK}" stroke-width="3"/>
      <circle cx="100" cy="102" r="7" fill="#7fb8d6" stroke="${INK}" stroke-width="3"/>
      <path d="M84 92 l6 -8 h20 l6 8" fill="none" stroke="${INK}" stroke-width="3"/>
      <path d="M92 88 h16" stroke="${INK}" stroke-width="3"/>
    </g>`;
    return ground()
      + `<g class="ch-fig ${mood === 'fail' ? 'ch-wobble' : 'ch-bob'}">
        ${legs('#e8e2d2', '#fffaf0')}
        <rect x="74" y="150" width="24" height="14" fill="#fffaf0" stroke="${INK}" stroke-width="3"/>
        <rect x="102" y="150" width="24" height="14" fill="#fffaf0" stroke="${INK}" stroke-width="3"/>
        ${mood === 'win' ? armL(armUp(46, skin), 56, 92) + armR(armUp(135, skin), 145, 92) : armL(armDown(46, skin), 56, 92) + armR(armDown(135, skin), 145, 92)}
        ${torso('#8fd0e0')}
        ${flowers}
        ${camera}
        <g class="ch-look" style="transform-box:view-box;transform-origin:100px 92px">
          ${headBase(skin)}
          ${mood === 'win' ? eyes(mood) : eyes(mood)}
          ${mouth(mood, { y: 74 })}
          <ellipse cx="100" cy="30" rx="50" ry="12" fill="#f2d89b" stroke="${INK}" stroke-width="4"/>
          <path d="M70 30 q6 -22 30 -22 q24 0 30 22 z" fill="#f7e6b8" stroke="${INK}" stroke-width="4"/>
          <path d="M70 30 q30 8 60 0" stroke="#c8412f" stroke-width="5" fill="none"/>
        </g>
        ${mood === 'fail' ? '<g stroke="#e0892e" stroke-width="3" fill="none" stroke-linecap="round"><path d="M70 12 q6 -9 12 0 q6 9 12 0"/><path d="M104 6 q6 -9 12 0 q6 9 12 0"/></g>' : ''}
      </g>`;
  },

  // 6. Mad Dog Mick - mullet, singlet, can in hand, esky on the ground.
  mick(mood) {
    const skin = '#e0ac69';
    const win = mood === 'win', fail = mood === 'fail';
    const esky = `<g><rect x="150" y="150" width="40" height="32" rx="5" fill="#2f7fd0" stroke="${INK}" stroke-width="4"/>
      <rect x="150" y="146" width="40" height="10" rx="4" fill="#fffaf0" stroke="${INK}" stroke-width="4"/></g>`;
    const can = `<g class="ch-can" style="transform-box:view-box;transform-origin:140px 112px">
      <rect x="130" y="82" width="22" height="34" rx="5" fill="#c8412f" stroke="${INK}" stroke-width="3"/>
      <rect x="130" y="82" width="22" height="7" fill="#cfd6dc" stroke="${INK}" stroke-width="3"/>
    </g>`;
    const stars = `<g class="ch-chspin" style="transform-box:view-box;transform-origin:100px 22px">
      ${[0, 1, 2, 3].map(i => { const a = i * Math.PI / 2; const x = 100 + Math.cos(a) * 34, y = 22 + Math.sin(a) * 16; return `<path d="M${x} ${y - 7} l2.5 6 l6 .5 l-4.5 4 l1.5 6 l-5.5 -3.5 l-5.5 3.5 l1.5 -6 l-4.5 -4 l6 -.5 z" fill="#ffe066" stroke="${INK}" stroke-width="2"/>`; }).join('')}
    </g>`;
    return ground(esky)
      + `<g class="ch-fig ${fail ? 'ch-wobble' : 'ch-bob'}">
        ${legs('#5a4a3a', '#8a6a3a')}
        ${armL(armDown(46, skin), 56, 92)}
        ${win ? armR(armUp(135, skin), 145, 92) : armR(can, 145, 112)}
        ${torso('#2b2b2b')}
        ${headBase(skin)}
        <path d="M70 52 q-6 -30 30 -30 q36 0 30 30 q2 20 -8 26 q4 -16 -4 -22 q-20 4 -36 0 q-8 6 -4 22 q-10 -6 -8 -26 z" fill="#3b2a1e" stroke="${INK}" stroke-width="3"/>
        ${fail ? eyes(mood) : shades}
        ${mood === 'fail' ? '<path d="M96 78 q4 10 8 0 q2 6 -4 8 q-6 -2 -4 -8 z" fill="#c8412f" stroke="' + INK + '" stroke-width="2"/>' : mouth(mood, { y: 74 })}
        ${fail ? stars : ''}
        ${win ? '<path d="M138 30 q6 -10 0 -20" stroke="#fffaf0" stroke-width="3" fill="none"/>' : ''}
      </g>`;
  },

  // 7. Market Stall Sheila - bright dress, wide hat, basket of mangoes.
  sheila(mood) {
    const skin = '#c68642';
    const win = mood === 'win', fail = mood === 'fail';
    const dress = `<path d="M68 80 h64 l14 62 h-92 z" fill="#f28ab2" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    const basket = `<g>
      <path d="M42 114 h30 l-4 24 h-22 z" fill="#b5895a" stroke="${INK}" stroke-width="3"/>
      ${[[48, 108], [57, 105], [66, 110]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#e0892e" stroke="${INK}" stroke-width="2"/>`).join('')}
    </g>`;
    const scatter = `<g>${[[54, 168], [74, 176], [128, 172], [148, 166]].map(([x, y], i) => `<circle class="ch-mango" style="animation-delay:${i * 0.15}s" cx="${x}" cy="${y}" r="7" fill="#e0892e" stroke="${INK}" stroke-width="2"/>`).join('')}</g>`;
    const confetti = `<g>${[[70, 40], [110, 30], [140, 46], [90, 24]].map(([x, y], i) => `<rect class="ch-pop" style="animation-delay:${i * 0.1}s" x="${x}" y="${y}" width="7" height="7" fill="${['#ffe066', '#8fd0e0', '#4f8a3c', '#c8412f'][i]}" stroke="${INK}" stroke-width="2"/>`).join('')}</g>`;
    const rightArm = win || fail
      ? armR(armUp(135, skin), 145, 92)
      : `<g class="ch-wave" style="transform-box:view-box;transform-origin:140px 92px">${armUp(135, skin)}</g>`;
    return ground()
      + `<g class="ch-fig ${fail ? 'ch-wobble' : 'ch-bob'}">
        ${legs('#f28ab2', '#8a6a3a')}
        ${armL(armDown(46, skin) + basket, 56, 92)}
        ${rightArm}
        ${dress}
        ${headBase(skin)}
        <circle cx="70" cy="62" r="4" fill="#ffe066" stroke="${INK}" stroke-width="2"/>
        <circle cx="130" cy="62" r="4" fill="#ffe066" stroke="${INK}" stroke-width="2"/>
        ${eyes(mood)}
        ${mouth(mood, { y: 74, w: 16 })}
        <ellipse cx="100" cy="30" rx="52" ry="12" fill="#ffe9a8" stroke="${INK}" stroke-width="4"/>
        <path d="M68 30 q6 -22 32 -22 q26 0 32 22 z" fill="#fff3cf" stroke="${INK}" stroke-width="4"/>
        <path d="M68 30 q32 10 64 0" stroke="#c8412f" stroke-width="5" fill="none"/>
        ${fail ? scatter : ''}
        ${win ? confetti : ''}
      </g>`;
  }
};

// Render a character as an inline SVG string. mood: idle | win | fail.
export function characterSVG(id, mood = 'idle') {
  const c = charById(id);
  const art = (ART[c.id] || ART.barry)(mood);
  const label = `${c.name}${mood === 'idle' ? '' : mood === 'win' ? ' celebrating' : ' knocked over'}`;
  return `<svg viewBox="0 0 200 200" xmlns="${NS}" class="char ${c.id} mood-${mood}" role="img" aria-label="${label}">${art}</svg>`;
}

// ---------- coin profile (persisted in localStorage, like the other game state) ----------
const KEY = { coins: 'tes_coins', owned: 'tes_owned', selected: 'tes_selected' };

export const profile = {
  coins: 0,
  owned: [CHARACTERS[0].id],
  selected: CHARACTERS[0].id,

  load() {
    try {
      this.coins = Math.max(0, Math.floor(Number(localStorage.getItem(KEY.coins) || 0) || 0));
      const owned = JSON.parse(localStorage.getItem(KEY.owned) || 'null');
      if (Array.isArray(owned) && owned.length) this.owned = owned.filter(id => CHARACTERS.some(c => c.id === id));
      if (!this.owned.includes(CHARACTERS[0].id)) this.owned.unshift(CHARACTERS[0].id);
      const sel = localStorage.getItem(KEY.selected);
      this.selected = this.owned.includes(sel) ? sel : CHARACTERS[0].id;
    } catch { /* ignore corrupt storage */ }
    return this;
  },

  save() {
    try {
      localStorage.setItem(KEY.coins, String(this.coins));
      localStorage.setItem(KEY.owned, JSON.stringify(this.owned));
      localStorage.setItem(KEY.selected, this.selected);
    } catch { /* ignore */ }
  },

  owns(id) { return this.owned.includes(id); },
  get character() { return charById(this.selected); },

  addCoins(n) { this.coins += Math.max(0, Math.floor(n) || 0); this.save(); return this.coins; },

  // Returns { ok, reason } - reason is 'owned' | 'poor' on failure.
  buy(id) {
    const c = charById(id);
    if (this.owns(c.id)) return { ok: true, reason: 'owned' };
    if (this.coins < c.price) return { ok: false, reason: 'poor' };
    this.coins -= c.price;
    this.owned.push(c.id);
    this.selected = c.id;
    this.save();
    return { ok: true };
  },

  select(id) {
    const c = charById(id);
    if (!this.owns(c.id)) return false;
    this.selected = c.id;
    this.save();
    return true;
  }
};
