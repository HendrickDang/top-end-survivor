// Server-side scoring and run validation.
// The server never trusts the client's score: it recomputes it from the per-round results.

export const GAME_IDS = [
  'croc-edge', 'swim-sign', 'croc-camp', 'stinger-vinegar', 'stinger-suit',
  'cyclone-kit', 'flood-road', 'heat-drink', 'snake-bite', 'bushfire-leave'
];
export const MAX_LIVES = 3;

// Must match web/js/main.js pointsFor()
export const pointsFor = (round) => 100 + 10 * (round - 1);

export function scoreOf(results) {
  return results.reduce((sum, r, i) => sum + (r.ok ? pointsFor(i + 1) : 0), 0);
}

const NAME_RE = /^[A-Za-z0-9 _-]{2,16}$/;
// Small blocklist for a public booth screen. Matching ignores spaces, digits-as-letters and case.
const BLOCK = ['fuck', 'shit', 'cunt', 'bitch', 'dick', 'cock', 'pussy', 'slut', 'whore', 'nigg', 'fag', 'rape', 'nazi', 'hitler', 'wank', 'twat', 'bastard', 'retard', 'penis', 'vagina', 'boob', 'porn', 'sex'];

export function cleanName(raw) {
  if (typeof raw !== 'string') return { error: 'Name is required.' };
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!NAME_RE.test(name)) return { error: 'Use 2 to 16 letters, numbers, spaces, - or _.' };
  const flat = name.toLowerCase()
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/[^a-z]/g, '');
  if (BLOCK.some(w => flat.includes(w))) return { error: 'Please pick a friendlier name.' };
  return { name };
}

export function validateRun(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid body.' };
  const { results, durationMs, clientId } = body;
  if (typeof clientId !== 'string' || clientId.length < 8 || clientId.length > 64) return { error: 'Invalid client id.' };
  if (!Array.isArray(results) || results.length < 1 || results.length > 300) return { error: 'Invalid results.' };
  for (const r of results) {
    if (!r || !GAME_IDS.includes(r.g) || typeof r.ok !== 'boolean') return { error: 'Invalid result entry.' };
    if (!Number.isFinite(r.ms) || r.ms < 0 || r.ms > 15000) return { error: 'Invalid round time.' };
    if (r.ok && r.ms < 120) return { error: 'Round too fast.' };
  }
  const losses = results.filter(r => !r.ok).length;
  if (losses !== MAX_LIVES || results[results.length - 1].ok) return { error: 'A run must end on the last life.' };
  if (!Number.isFinite(durationMs) || durationMs < results.length * 1500 || durationMs > 4 * 3600 * 1000) return { error: 'Invalid duration.' };
  return {
    run: {
      clientId,
      results: results.map(r => ({ g: r.g, ok: r.ok, ms: Math.round(r.ms) })),
      durationMs: Math.round(durationMs),
      score: scoreOf(results),
      rounds: results.length,
      wins: results.length - losses,
      appVersion: typeof body.appVersion === 'string' ? body.appVersion.slice(0, 20) : null
    }
  };
}

// Calendar day in Darwin time, used for the "Today" board on competition day.
export function darwinDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Darwin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
