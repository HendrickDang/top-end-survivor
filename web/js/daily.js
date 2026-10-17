// Shared by the game AND the server (server/src/scoring.js imports this file),
// so everyone in the NT gets the same Daily Challenge and the server can check it.

export const REGULAR = [
  'croc-edge', 'swim-sign', 'croc-camp', 'stinger-vinegar', 'stinger-suit',
  'cyclone-kit', 'flood-road', 'heat-drink', 'snake-bite', 'bushfire-leave',
  'lightning-pool', 'mozzie-dusk', 'sun-slip'
];
export const BOSSES = ['boss-cyclone', 'boss-croc'];
export const DAILY_ROUNDS = 10;
export const BOSS_EVERY = 10;

// Calendar day in Darwin time, e.g. "2026-11-05".
export function darwinDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Darwin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function prevDay(day) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function hash(str) { // FNV-1a
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export function seededRandom(seed) { // mulberry32
  let a = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 9 different hazards in a fixed order, then a boss on round 10.
export function dailySequence(day) {
  const rnd = seededRandom('tes-daily-' + day);
  const pool = REGULAR.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return [...pool.slice(0, DAILY_ROUNDS - 1), BOSSES[Math.floor(rnd() * BOSSES.length)]];
}

export const isBoss = (id) => BOSSES.includes(id);
// Classic mode: rounds 10, 20, 30... are boss rounds, alternating Cyclone Night and Croc Creek.
export const isBossRound = (round) => round % BOSS_EVERY === 0;
export const classicBossFor = (round) => BOSSES[(round / BOSS_EVERY - 1) % BOSSES.length];
