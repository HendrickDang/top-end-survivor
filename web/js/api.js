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
  outbox.push({ localId, ...run, clientId: clientId(), name: null, serverId: null, nameSent: false });
  save(KEY_OUTBOX, outbox.slice(-50));
  return localId;
}

export function setRunName(localId, name) {
  const outbox = load(KEY_OUTBOX, []);
  const r = outbox.find(x => x.localId === localId);
  if (r) { r.name = name; r.nameSent = false; save(KEY_OUTBOX, outbox); }
}

// Try to send everything in the outbox. Safe to call any time.
let flushing = null;
export function flush() {
  if (flushing) return flushing;
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
              name: r.name || undefined, appVersion: r.appVersion
            })
          });
          r.serverId = res.id; r.score = res.score; r.nameSent = !!r.name; changed = true;
        } else if (r.name && !r.nameSent) {
          await request(`/api/runs/${r.serverId}/name`, {
            method: 'POST', body: JSON.stringify({ name: r.name, clientId: r.clientId })
          });
          r.nameSent = true; changed = true;
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
        dead: f.dead || p.dead,
        error: f.error || p.error
      };
    });
    const pending = fresh.filter(r => !r.dead && (!r.serverId || (r.name && !r.nameSent)));
    const sent = fresh.filter(r => !r.dead && r.serverId && (!r.name || r.nameSent)).slice(-5);
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
  if (r.serverId && (!r.name || r.nameSent)) return { state: 'sent', serverId: r.serverId };
  return { state: 'queued' };
}

export const getLeaderboard = (period = 'today', limit = 20) => request(`/api/leaderboard?period=${period}&limit=${limit}&client=${encodeURIComponent(clientId())}`);
export const getStats = () => request('/api/stats');
export const ping = () => request('/api/health');
