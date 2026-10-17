// "In season now": hazards that matter right now in the Top End appear more often.
// Months are 1-12. Sources are listed in lessons.js.
export const SEASONS = [
  { topic: 'stingers', icon: '🪼', label: 'Stinger season', months: [10, 11, 12, 1, 2, 3, 4, 5], games: ['stinger-vinegar', 'stinger-suit'] }, // NT Health: 1 Oct to 31 May
  { topic: 'cyclone', icon: '🌀', label: 'Cyclone season', months: [11, 12, 1, 2, 3, 4], games: ['cyclone-kit'] },                         // SecureNT: 1 Nov to 30 Apr
  { topic: 'heat', icon: '🌡️', label: 'Extreme heat risk', months: [10, 11, 12, 1, 2, 3], games: ['heat-drink'] }                       // NT Health: October to March
];

function darwinMonth(date = new Date()) {
  return Number(new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Darwin', month: 'numeric' }).format(date));
}

export function inSeason(date = new Date()) {
  const m = darwinMonth(date);
  return SEASONS.filter(s => s.months.includes(m));
}

export function inSeasonGames(date = new Date()) {
  return inSeason(date).flatMap(s => s.games);
}
