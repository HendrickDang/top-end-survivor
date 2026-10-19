// Sound: synthesised effects (Web Audio, no files) + one looping soundtrack (web/audio/).
let ctx = null;
let master = null, musicBus = null, sfxBus = null;
let muted = false;
try { muted = localStorage.getItem('tes_muted') === '1'; } catch { /* ignore */ }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'square', when = 0, vol = 0.08, slide = 0, bus } = {}) {
  const a = ac(); if (!a || muted) return;
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

// ---------- soundtrack ----------
// One looping track (web/audio/, AI-generated for the team), precached by the service worker
// so it plays offline. Levels fade in and out rather than clipping. The game speeds the
// track up a little as rounds get faster, and a lot for boss rounds.
const TRACK = 'audio/Clockwork_Catastrophe.mp3';
const MUSIC_VOL = 0.45;   // kept under the sound effects
const DUCK_VOL = 0.15;    // while a fail animation plays
const FADE_MS = 600;

let audioEl = null;       // the looping <audio> element
let wanted = null;        // mood the screens last asked for ('menu' | 'play')
let level = MUSIC_VOL;
let fadeTimer = 0, stopTimer = 0;

function track() {
  if (audioEl) return audioEl;
  if (typeof Audio !== 'function') return null;
  audioEl = new Audio(TRACK);
  audioEl.loop = true;
  audioEl.preload = 'auto';
  audioEl.volume = 0;
  return audioEl;
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
  play(name = 'play') {
    wanted = name;
    if (muted) return;                 // remember it, stay silent until unmuted
    const a = track(); if (!a) return;
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = 0; }
    if (a.paused) {
      a.volume = 0;
      const p = a.play();              // blocked until the first tap; armAudio() retries
      if (p && p.catch) p.catch(() => { /* blocked for now */ });
    }
    level = MUSIC_VOL;
    fadeTo(level, FADE_MS);
  },
  start() { this.play('play'); },
  // Fade out and pause, but remember the mood so resume() can pick it back up.
  stop() {
    if (!audioEl) return;
    if (stopTimer) clearTimeout(stopTimer);
    fadeTo(0, 400);
    stopTimer = setTimeout(() => { if (audioEl) { audioEl.pause(); audioEl.volume = 0; } stopTimer = 0; }, 450);
  },
  resume() { if (wanted) this.play(wanted); },
  // 132 bpm = normal speed; faster rounds nudge the track up, bosses push it hard.
  setTempo(bpm) {
    const a = track(); if (!a) return;
    const rate = Math.max(1, Math.min(1.25, 1 + (bpm - 132) / 300));
    try { a.preservesPitch = true; a.playbackRate = rate; } catch { /* old browser */ }
  },
  duck(on) {
    if (!audioEl || muted || audioEl.paused) return;
    level = on ? DUCK_VOL : MUSIC_VOL;
    fadeTo(level, 150);
  }
};

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('tes_muted', muted ? '1' : '0'); } catch { /* ignore */ }
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  if (muted) music.stop(); else music.resume();
  return muted;
}
export const isMuted = () => muted;
