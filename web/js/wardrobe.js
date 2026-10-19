// Wardrobe: every badge unlocks a piece of gear. Your Territory Character (characters.js)
// sets your skin and default shirt; the wardrobe adds hats, shirts and specs on top.
import { unlocked } from './badges.js';

const KEY = 'tes_outfit_v1';

// badge: null means free from the start.
export const GEAR = {
  hat: [
    { id: 'bush', name: 'Bush hat', badge: null },
    { id: 'cap', name: 'Cap', badge: null },
    { id: 'none', name: 'No hat', badge: null },
    { id: 'croc', name: 'Croc hat', badge: 'crocwise' },
    { id: 'hardhat', name: 'Hard hat', badge: 'cyclone' },
    { id: 'firehelmet', name: 'Fire helmet', badge: 'bushfire' },
    { id: 'legionnaire', name: 'Shade cap', badge: 'heat' },
    { id: 'party', name: 'Party hat', badge: 'daily3' },
    { id: 'explorer', name: 'Explorer hat', badge: 'all10' },
    { id: 'grad', name: 'Graduate cap', badge: 'brainy' },
    { id: 'crown', name: 'Boss crown', badge: 'boss' }
  ],
  shirt: [
    { id: 'own', name: "Character's own", badge: null },
    { id: 'orange', name: 'Orange tee', badge: null },
    { id: 'blue', name: 'Blue tee', badge: null },
    { id: 'green', name: 'Green tee', badge: null },
    { id: 'stinger', name: 'Stinger suit', badge: 'stingers' },
    { id: 'hivis', name: 'Hi-vis', badge: 'flood' },
    { id: 'firstaid', name: 'First aid', badge: 'snake' },
    { id: 'lifesaver', name: 'Lifesaver', badge: 'lightning' },
    { id: 'longs', name: 'Light and long', badge: 'mozzies' },
    { id: 'cooling', name: 'Cool tee', badge: 'comeback' },
    { id: 'territory', name: 'Territory tee', badge: 'install' },
    { id: 'hawaii', name: 'Holiday shirt', badge: 'town' },
    { id: 'racing', name: 'Racing stripes', badge: 'streak5' },
    { id: 'gold', name: 'Gold legend', badge: 'score1500' }
  ],
  specs: [
    { id: 'none', name: 'No specs', badge: null },
    { id: 'nerd', name: 'Smart specs', badge: 'reader' },
    { id: 'sunnies', name: 'Sunnies', badge: 'sun' },
    { id: 'heart', name: 'Heart specs', badge: 'challenger' }
  ]
};

export const DEFAULT = { hat: 'bush', shirt: 'own', specs: 'none' };

export function current() {
  try { return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return { ...DEFAULT }; }
}
export function save(o) {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* ignore */ }
}

export function isUnlocked(item, got = unlocked()) {
  return !item.badge || !!got[item.badge];
}

// Gear that the given badge ids unlock (used to say "New gear: Croc hat!").
export function gearFor(badgeIds) {
  const out = [];
  for (const slot of Object.keys(GEAR)) for (const item of GEAR[slot]) if (item.badge && badgeIds.includes(item.badge)) out.push(item);
  return out;
}
