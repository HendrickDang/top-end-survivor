// Leaderboard client with an offline outbox.
// Finished runs are queued in localStorage and sent whenever the device is online,
// so the game keeps working in places with no signal (most of remote NT).

const KEY_OUTBOX = 'tes_outbox_v1';
const KEY_CLIENT = 'tes_client_id';
const base = () => (window.TES_CONFIG && window.TES_CONFIG.API_BASE) || '';

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

export function clientId() {
  let id = load(KEY_CLIENT, null);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    save(KEY_CLIENT, id);
  }
  return id;
}

async function request(path, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(base() + path, {
      ...opts,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(body.error || `HTTP ${res.status}`); err.status = res.status; throw err; }
    return body;
  } finally { clearTimeout(t); }
}

// Queue a finished run. Returns the local id so a name can be attached later.
export function queueRun(run) {
  const outbox = load(KEY_OUTBOX, []);
  const localId = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  outbox.push({ localId, ...run, clientId: clientId(), name: null, serverId: null, nameSent: false, townSent: true, whoSent: true });
  save(KEY_OUTBOX, outbox.slice(-50));
  return localId;
}

export function setRunName(localId, name) {
  const outbox = load(KEY_OUTBOX, []);
  const r = outbox.find(x => x.localId === localId);
  if (r) { r.name = name; r.nameSent = false; save(KEY_OUTBOX, outbox); }
}

export function setRunTown(localId, town) {
  const outbox = load(KEY_OUTBOX, []);
  const r = outbox.find(x => x.localId === localId);
  if (r && r.town !== town) { r.town = town; r.townSent = !r.serverId; save(KEY_OUTBOX, outbox); }
}

// Locals vs visitors: the one-tap answer after a game.
export function setRunWho(localId, who) {
  const outbox = load(KEY_OUTBOX, []);
  const r = outbox.find(x => x.localId === localId);
  if (r && r.who !== who) { r.who = who; r.whoSent = !r.serverId; save(KEY_OUTBOX, outbox); }
}

const needsWork = (r) => !r.dead && (!r.serverId || (r.name && !r.nameSent) || (r.town && r.townSent === false) || (r.who && r.whoSent === false));

// Try to send everything in the outbox. Safe to call any time.
let flushing = null;
// If a send is already running (say the server is slow to wake up), queue ONE more pass after it,
// so a name typed meanwhile still gets sent instead of waiting for the next game.
let flushAgain = null;
export function flush() {
  if (flushing) return (flushAgain ||= flushing.catch(() => {}).then(() => { flushAgain = null; return flush(); }));
  flushing = (async () => {
    const outbox = load(KEY_OUTBOX, []);
    let changed = false;
    for (const r of outbox) {
      try {
        if (!r.serverId) {
          const res = await request('/api/runs', {
            method: 'POST',
            body: JSON.stringify({
              clientId: r.clientId, results: r.results, durationMs: r.durationMs,
              mode: r.mode || 'classic', day: r.day,
              town: r.town || undefined, challengeOf: r.challengeOf || undefined,
              relaxed: r.relaxed || undefined, hard: r.hard || undefined, dodged: r.dodged, who: r.who || undefined, classCode: r.classCode || undefined,
              name: r.name || undefined, appVersion: r.appVersion
            })
          });
          r.serverId = res.id; r.score = res.score; r.nameSent = !!r.name; r.townSent = true; r.whoSent = true; changed = true;
        }
        if (r.serverId && r.name && !r.nameSent) {
          await request(`/api/runs/${r.serverId}/name`, {
            method: 'POST', body: JSON.stringify({ name: r.name, clientId: r.clientId })
          });
          r.nameSent = true; changed = true;
        }
        if (r.serverId && r.town && r.townSent === false) {
          await request(`/api/runs/${r.serverId}/town`, {
            method: 'POST', body: JSON.stringify({ town: r.town, clientId: r.clientId })
          });
          r.townSent = true; changed = true;
        }
        if (r.serverId && r.who && r.whoSent === false) {
          await request(`/api/runs/${r.serverId}/who`, {
            method: 'POST', body: JSON.stringify({ who: r.who, clientId: r.clientId })
          });
          r.whoSent = true; changed = true;
        }
      } catch (e) {
        if (e.status && e.status >= 400 && e.status < 500) { r.dead = true; r.error = e.message; changed = true; }
        else break; // offline or server down: try again later
      }
    }
    if (!changed) return outbox;
    // Merge into a fresh copy: the player may have typed a name while we were sending.
    const done = new Map(outbox.map(r => [r.localId, r]));
    const fresh = load(KEY_OUTBOX, []).map(f => {
      const p = done.get(f.localId);
      if (!p) return f;
      return {
        ...f,
        serverId: f.serverId || p.serverId,
        score: p.score ?? f.score,
        nameSent: f.nameSent || (p.nameSent && p.name === f.name),
        townSent: f.townSent === false && p.townSent && p.town === f.town ? true : f.townSent,
        whoSent: f.whoSent === false && p.whoSent && p.who === f.who ? true : f.whoSent,
        dead: f.dead || p.dead,
        error: f.error || p.error
      };
    });
    const pending = fresh.filter(needsWork);
    const sent = fresh.filter(r => !r.dead && !needsWork(r)).slice(-5);
    const dead = fresh.filter(r => r.dead).slice(-3);
    save(KEY_OUTBOX, [...dead, ...sent, ...pending]);
    return fresh;
  })().finally(() => { flushing = null; });
  return flushing;
}

export function runStatus(localId) {
  const r = load(KEY_OUTBOX, []).find(x => x.localId === localId);
  if (!r) return { state: 'unknown' };
  if (r.dead) return { state: 'rejected', error: r.error };
  if (r.serverId && !needsWork(r)) return { state: 'sent', serverId: r.serverId };
  return { state: 'queued', serverId: r.serverId || null };
}

// Optional quick safety check results: tiny queue so they survive being offline.
const KEY_QUIZ = 'tes_quiz_outbox_v1';
export function queueQuiz(payload) {
  const q = load(KEY_QUIZ, []);
  const cls = myClass();
  q.push({ ...payload, clientId: clientId(), classCode: cls ? cls.code : undefined });
  save(KEY_QUIZ, q.slice(-4));
  flushQuiz();
}
export async function flushQuiz() {
  const q = load(KEY_QUIZ, []);
  const left = [];
  for (const item of q) {
    try { await request('/api/quiz', { method: 'POST', body: JSON.stringify(item) }); }
    catch (e) { if (!(e.status >= 400 && e.status < 500)) left.push(item); }
  }
  save(KEY_QUIZ, left);
}

export const getLeaderboard = (period = 'today', limit = 20) => request(`/api/leaderboard?period=${period}&limit=${limit}&client=${encodeURIComponent(clientId())}`);
export const getStats = (period = 'today') => request(`/api/stats?period=${period}`);
export const getTowns = (period = 'today') => request(`/api/towns?period=${period}`);
export const getChallenge = (id) => request(`/api/challenge/${encodeURIComponent(id)}`);
export const getChallengeResults = () => request(`/api/challenges/results?client=${encodeURIComponent(clientId())}`);
export const ping = () => request('/api/health');
export const getConfig = () => request('/api/config');

// ---- Classroom mode ----
// The class this device is playing for ({ code, name }), set by a teacher's join link.
const KEY_CLASS = 'tes_class';
export const myClass = () => load(KEY_CLASS, null);
export const setMyClass = (c) => { if (c) save(KEY_CLASS, { code: c.code, name: c.name }); else { try { localStorage.removeItem(KEY_CLASS); } catch { /* ignore */ } } };
export const getClass = (code) => request(`/api/classes/${encodeURIComponent(code)}`);

// ---- Live Booth Battle ----
export const battle = {
  get: (code) => request(`/api/battles/${encodeURIComponent(code)}`),
  join: (code, body) => request(`/api/battles/${encodeURIComponent(code)}/join`, { method: 'POST', body: JSON.stringify({ ...body, clientId: clientId() }) }),
  progress: (code, playerId, results) => request(`/api/battles/${encodeURIComponent(code)}/progress`, {
    method: 'POST', body: JSON.stringify({ playerId, clientId: clientId(), results })
  })
};
