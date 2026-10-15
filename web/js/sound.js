// Tiny synthesised sound effects (no audio files, works offline).
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('tes_muted') === '1'; } catch { /* ignore */ }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'square', when = 0, vol = 0.08) {
  if (muted) return;
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), gn = a.createGain();
  o.type = type; o.frequency.value = freq;
  const t = a.currentTime + when;
  gn.gain.setValueAtTime(vol, t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(a.destination);
  o.start(t); o.stop(t + dur);
}

export const sfx = {
  unlock: () => ac(),
  go: () => { tone(523, .08); tone(784, .12, 'square', .08); },
  tap: () => tone(880, .04, 'triangle', 0, .05),
  win: () => { tone(659, .1); tone(784, .1, 'square', .1); tone(1047, .18, 'square', .2); },
  lose: () => { tone(300, .15, 'sawtooth'); tone(200, .3, 'sawtooth', .15); },
  over: () => { tone(392, .2, 'triangle'); tone(330, .2, 'triangle', .2); tone(262, .5, 'triangle', .4); },
  tick: () => tone(1200, .03, 'square', 0, .03)
};

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('tes_muted', muted ? '1' : '0'); } catch { /* ignore */ }
  return muted;
}
export const isMuted = () => muted;
