<<<<<<< Updated upstream
// Synthesised sound effects + a chiptune music loop (no audio files: works offline, no copyright issues).
=======
// Sound: short feedback effects + a looping soundtrack.
// The effects are synthesised live with the Web Audio API (no files needed).
// The soundtrack is a single bundled MP3, cached with the rest of the app by the
// service worker, so it still plays offline.
>>>>>>> Stashed changes
let ctx = null;
let master = null, musicBus = null, sfxBus = null;
let muted = false;
try { muted = localStorage.getItem('tes_muted') === '1'; } catch { /* ignore */ }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
<<<<<<< Updated upstream
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
=======
    try { ctx = new AC(); } catch { return null; }
>>>>>>> Stashed changes
  }
  // A browser may keep the context suspended until the player interacts.
  if (ctx.state === 'suspended' && ctx.resume) Promise.resolve(ctx.resume()).catch(() => { /* blocked for now */ });
  return ctx;
}

<<<<<<< Updated upstream
function tone(freq, dur, { type = 'square', when = 0, vol = 0.08, slide = 0, bus } = {}) {
  const a = ac(); if (!a || muted) return;
=======
// ---------- one-shot effects ----------
function tone(freq, dur, type = 'square', when = 0, vol = 0.08) {
  if (muted) return;
  const a = ac(); if (!a) return;
>>>>>>> Stashed changes
  const o = a.createOscillator(), gn = a.createGain();
  o.type = type;
  const t = a.currentTime + when;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  gn.gain.setValueAtTime(vol, t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(bus || sfxBus);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, { when = 0, vol = 0.15, filter = 1200, type = 'lowpass', sweep = 0 } = {}) {
  const a = ac(); if (!a || muted) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = type;
  const t = a.currentTime + when;
  f.frequency.setValueAtTime(filter, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, filter + sweep), t + dur);
  const gn = a.createGain();
  gn.gain.setValueAtTime(vol, t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(gn).connect(sfxBus);
  src.start(t);
}

export const sfx = {
  unlock: () => ac(),
  go: () => { tone(523, .08); tone(784, .12, { when: .08 }); },
  tap: () => tone(880, .04, { type: 'triangle', vol: .05 }),
  pop: () => tone(600, .08, { type: 'triangle', slide: 500, vol: .07 }),
  coin: () => { tone(988, .06, { vol: .06 }); tone(1319, .14, { when: .06, vol: .06 }); },
  win: () => { tone(659, .1); tone(784, .1, { when: .1 }); tone(1047, .18, { when: .2 }); },
  streak: (n) => { const base = 523 + Math.min(n, 8) * 40; [0, .07, .14, .21].forEach((w, i) => tone(base * [1, 1.25, 1.5, 2][i], .09, { when: w, vol: .06 })); },
  lose: () => { tone(300, .15, { type: 'sawtooth' }); tone(200, .3, { type: 'sawtooth', when: .15 }); },
  // themed fail sounds
  chomp: () => { noise(.08, { vol: .3, filter: 900 }); tone(140, .12, { type: 'square', slide: -80, vol: .12 }); noise(.08, { when: .14, vol: .3, filter: 700 }); },
  splash: () => { noise(.5, { vol: .25, filter: 3000, sweep: -2600 }); tone(400, .3, { type: 'sine', slide: -300, vol: .06, when: .05 }); },
  zap: () => { for (let i = 0; i < 5; i++) tone(1200 - i * 150, .05, { type: 'sawtooth', when: i * .05, vol: .05 }); },
  sizzle: () => noise(.7, { vol: .12, filter: 5000, type: 'highpass' }),
  whoosh: () => noise(.45, { vol: .2, filter: 300, sweep: 2500, type: 'bandpass' }),
  boing: () => tone(180, .35, { type: 'triangle', slide: 320, vol: .1 }),
  over: () => { tone(392, .2, { type: 'triangle' }); tone(330, .2, { type: 'triangle', when: .2 }); tone(262, .5, { type: 'triangle', when: .4 }); },
  fanfare: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, .14, { when: i * .1, vol: .07 })); },
  badge: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .12, { type: 'triangle', when: i * .08, vol: .08 })); },
  thunder: () => { noise(1.6, { vol: .35, filter: 400, sweep: -300 }); noise(.25, { vol: .3, filter: 2500, when: .02 }); },
  buzz: () => { for (let i = 0; i < 6; i++) tone(560 + (i % 2) * 40, .12, { type: 'sawtooth', when: i * .1, vol: .025 }); },
  struck: () => { noise(.12, { vol: .5, filter: 6000, type: 'highpass' }); noise(1.2, { vol: .35, filter: 350, when: .08, sweep: -250 }); },
    tick: () => tone(1200, .03, { vol: .03 })
};

// ---------- music: a cheerful 8-bar chiptune loop, tempo rises with the round ----------
const N = (s) => 440 * Math.pow(2, (s - 9) / 12); // semitones from C4
// C - Am - F - G progression, bouncy bass + lead
const BASS = [0, 0, 7, 0, -3, -3, 4, -3, -7, -7, 0, -7, -5, -5, 2, -5].map(s => s - 12);
const LEAD = [12, null, 16, 19, 16, null, 12, null, 9, 12, null, 16, 14, null, 11, null,
  17, null, 16, 14, 12, null, 9, null, 11, 12, 14, null, 19, null, 17, 16];
let musicOn = false, timer = 0, step = 0, nextTime = 0, tempo = 132;

function schedule() {
  const a = ctx; if (!a) return;
  while (nextTime < a.currentTime + 0.15) {
    const s16 = 60 / tempo / 4;
    const bi = Math.floor(step / 2) % BASS.length;
    if (step % 2 === 0) tone(N(BASS[bi]), s16 * 1.6, { type: 'triangle', when: nextTime - a.currentTime, vol: .22, bus: musicBus });
    const li = step % LEAD.length;
    if (LEAD[li] !== null && step % 1 === 0) tone(N(LEAD[li]), s16 * .9, { type: 'square', when: nextTime - a.currentTime, vol: .05, bus: musicBus });
    if (step % 4 === 2) noise(.04, { when: nextTime - a.currentTime, vol: .05, filter: 7000, type: 'highpass' });
    nextTime += s16;
    step++;
  }
}

export const music = {
  start() {
    if (!ac() || musicOn) return;
    musicOn = true; step = 0; nextTime = ctx.currentTime + 0.05;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(0.32, ctx.currentTime);
    timer = setInterval(schedule, 50);
  },
  stop() { musicOn = false; clearInterval(timer); },
  setTempo(bpm) { tempo = Math.max(100, Math.min(200, bpm)); },
  duck(on) { if (musicBus && ctx) musicBus.gain.setTargetAtTime(on ? 0.1 : 0.32, ctx.currentTime, 0.05); }
};

// ---------- soundtrack ----------
// One looping track, bundled in web/audio/ and precached by the service worker so
// it plays offline. Levels are faded in and out rather than clipped, and the mute
// toggle simply drives the same fade. The mood name is remembered so resume() can
// pick the track back up after a hidden tab or a mute.
const TRACK = 'audio/Clockwork_Catastrophe.mp3';
const MUSIC_VOL = 0.45;         // master volume once faded in (kept under the effects)
const FADE_MS = 600;

let el = null;        // the looping <audio> element
let wanted = null;    // mood the screens last asked for
let fadeTimer = 0;
let stopTimer = 0;

function track() {
  if (el) return el;
  if (typeof Audio !== 'function') return null;
  el = new Audio(TRACK);
  el.loop = true;
  el.preload = 'auto';
  el.volume = 0;
  return el;
}

function fadeTo(target, ms) {
  const a = track(); if (!a) return;
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = 0; }
  const from = a.volume, steps = Math.max(1, Math.round(ms / 40));
  let i = 0;
  fadeTimer = setInterval(() => {
    i++;
    a.volume = Math.min(1, Math.max(0, from + (target - from) * (i / steps)));
    if (i >= steps) { clearInterval(fadeTimer); fadeTimer = 0; a.volume = target; }
  }, 40);
}

export const music = {
  // Play (or keep playing) the track. Safe to call on every screen change.
  play(name) {
    if (!name) return;
    wanted = name;
    if (muted) return;                      // remember it, stay silent until unmuted
    const a = track(); if (!a) return;
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = 0; }
    if (a.paused) {
      a.volume = 0;
      // Browsers block playback until the player interacts; armAudio() retries on the
      // first tap or key press.
      const p = a.play();
      if (p && p.catch) p.catch(() => { /* blocked for now */ });
    }
    fadeTo(MUSIC_VOL, FADE_MS);
  },
  // Fade out and pause but remember the mood, so resume() can pick the track back up.
  stop() {
    if (!el) return;
    if (stopTimer) clearTimeout(stopTimer);
    fadeTo(0, 400);
    stopTimer = setTimeout(() => { if (el) { el.pause(); el.volume = 0; } stopTimer = 0; }, 450);
  },
  resume() { if (wanted) this.play(wanted); }
};

// ---------- mute ----------
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('tes_muted', muted ? '1' : '0'); } catch { /* ignore */ }
<<<<<<< Updated upstream
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
=======
  if (muted) music.stop(); else music.resume();
>>>>>>> Stashed changes
  return muted;
}
export const isMuted = () => muted;
