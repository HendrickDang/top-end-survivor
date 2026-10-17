// Collectable badges, saved on the device. They reward exactly the behaviour we want:
// learning each safety topic, replaying, and reading the real rules.
import { LESSONS } from './lessons.js';

const KEY = 'tes_badges_v1';
const NEED = 3; // topic wins needed for a topic badge

export const BADGES = [
  { id: 'crocwise', icon: '🐊', name: 'Crocwise', hint: `Survive ${NEED} croc rounds`, topic: 'crocwise' },
  { id: 'stingers', icon: '🪼', name: 'Stinger Pro', hint: `Survive ${NEED} stinger rounds`, topic: 'stingers' },
  { id: 'cyclone', icon: '🌀', name: 'Cyclone Ready', hint: `Survive ${NEED} cyclone rounds`, topic: 'cyclone' },
  { id: 'flood', icon: '🚙', name: 'Flood Smart', hint: `Survive ${NEED} flood rounds`, topic: 'flood' },
  { id: 'heat', icon: '💧', name: 'Heat Beater', hint: `Survive ${NEED} heat rounds`, topic: 'heat' },
  { id: 'snake', icon: '🩹', name: 'First Aider', hint: `Survive ${NEED} snake bite rounds`, topic: 'snake' },
  { id: 'bushfire', icon: '🔥', name: 'Fire Ready', hint: `Survive ${NEED} bushfire rounds`, topic: 'bushfire' },
  { id: 'streak5', icon: '⚡', name: 'On a Roll', hint: 'Win 5 rounds in a row' },
  { id: 'all10', icon: '🗺️', name: 'Top End Tourist', hint: 'Survive all 10 different games in one run' },
  { id: 'score1500', icon: '🏆', name: 'Top End Legend', hint: 'Score 1,500 in one run' },
  { id: 'comeback', icon: '❤️', name: 'Never Say Die', hint: 'Survive 5 rounds on your last life' },
  { id: 'reader', icon: '📖', name: 'Read the Rules', hint: 'Open the Safety tips screen' }
];

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { got: {}, topicWins: {} }; } catch { return { got: {}, topicWins: {} }; }
}
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }

export const unlocked = () => load().got;
export const count = () => Object.keys(load().got).length;

function grant(s, id, fresh) {
  if (!s.got[id]) { s.got[id] = Date.now(); fresh.push(BADGES.find(b => b.id === id)); }
}

// Call at game over with the run's results [{g, ok}] and final score. Returns newly unlocked badges.
export function evaluateRun(results, score) {
  const s = load(); const fresh = [];
  let streak = 0, best = 0, lastLifeWins = 0, losses = 0;
  const survived = new Set();
  for (const r of results) {
    if (r.ok) {
      const topic = LESSONS[r.g]?.source;
      if (topic) s.topicWins[topic] = (s.topicWins[topic] || 0) + 1;
      survived.add(r.g);
      streak++; best = Math.max(best, streak);
      if (losses === 2) lastLifeWins++;
    } else { streak = 0; losses++; }
  }
  for (const b of BADGES) if (b.topic && (s.topicWins[b.topic] || 0) >= NEED) grant(s, b.id, fresh);
  if (best >= 5) grant(s, 'streak5', fresh);
  if (survived.size >= 10) grant(s, 'all10', fresh);
  if (score >= 1500) grant(s, 'score1500', fresh);
  if (lastLifeWins >= 5) grant(s, 'comeback', fresh);
  save(s);
  return fresh;
}

export function grantReader() {
  const s = load(); const fresh = [];
  grant(s, 'reader', fresh); save(s);
  return fresh;
}

export function progress(b) {
  if (!b.topic) return null;
  return Math.min(NEED, load().topicWins[b.topic] || 0) + ' / ' + NEED;
}
