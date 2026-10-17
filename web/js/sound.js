// Synthesised sound effects + a chiptune music loop (no audio files: works offline, no copyright issues).
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

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('tes_muted', muted ? '1' : '0'); } catch { /* ignore */ }
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  return muted;
}
export const isMuted = () => muted;
