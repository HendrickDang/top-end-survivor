// Shared by the game, the booth, the teacher dashboard AND the server (server/src/scoring.js).
// "Locals vs visitors": one optional tap after a game, so we can see which rules newcomers miss.
export const WHO = [
  { id: 'local', label: 'Local', long: 'NT local', icon: '🏡' },
  { id: 'new', label: 'New to the NT', long: 'New to the NT', icon: '📦' },
  { id: 'visitor', label: 'Visiting', long: 'Visitor', icon: '🧳' }
];
export const WHO_IDS = WHO.map(w => w.id);
export const whoLabel = (id) => (WHO.find(w => w.id === id) || {}).long || id;

// Short names for the safety topics (the keys of SOURCES in lessons.js).
export const TOPIC_LABELS = {
  crocwise: 'Crocs', stingers: 'Stingers', cyclone: 'Cyclones', flood: 'Floods', heat: 'Heat',
  snake: 'Snake bites', roads: 'Dust storms', lightning: 'Lightning', mozzies: 'Mozzies', sun: 'Sun', bushfire: 'Bushfire', wildlife: 'Roos on roads'
};

// Classroom codes: 5 characters, no look-alikes (0/O, 1/I/L).
export const CLASS_CODE_RE = /^[A-HJKMNP-Z2-9]{5}$/;
// Booth Battle codes: 4 letters, no look-alikes.
export const BATTLE_CODE_RE = /^[A-HJKMNP-Z]{4}$/;
