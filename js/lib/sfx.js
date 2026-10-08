// Sound effects. Everything is synthesised with WebAudio (no files needed);
// map a name to a file in config.SOUND_FILES to use your own audio instead.
import { SOUND_FILES } from '../config.js?v=20261008165204';

const MUTE_KEY = 'camille-blind-box/muted';
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {}

let ctx = null;
let master = null;
let noiseBuffer = null;
const listeners = new Set();
const fileCache = new Map();

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ f = 440, f2, t = 0, dur = 0.15, type = 'square', vol = 0.15, attack = 0.005 }) {
  const c = audio();
  if (!c) return;
  const now = c.currentTime + t;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, now);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(vol, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g).connect(master);
  o.start(now);
  o.stop(now + dur + 0.05);
}

function noise({ t = 0, dur = 0.1, vol = 0.15, freq = 1200, f2, q = 1, type = 'bandpass' }) {
  const c = audio();
  if (!c) return;
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const now = c.currentTime + t;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, now);
  if (f2) filter.frequency.exponentialRampToValueAtTime(f2, now + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(vol, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(now);
  src.stop(now + dur + 0.05);
}

const arp = (notes, { step = 0.07, dur = 0.22, type = 'triangle', vol = 0.1, t = 0 } = {}) =>
  notes.forEach((f, i) => tone({ f, t: t + i * step, dur, type, vol }));

const SYNTH = {
  click: () => tone({ f: 880, f2: 1320, dur: 0.06, vol: 0.06 }),
  open: () => arp([392, 523, 659], { step: 0.05, dur: 0.12, type: 'square', vol: 0.06 }),
  poke: () => tone({ f: 520, f2: 980, dur: 0.12, type: 'square', vol: 0.06 }),
  rattle: () => {
    noise({ dur: 0.05, freq: 1600 + Math.random() * 1800, q: 5, vol: 0.2 });
    tone({ f: 160 + Math.random() * 90, dur: 0.05, type: 'triangle', vol: 0.07 });
  },
  whoosh: () => noise({ dur: 0.45, freq: 300, f2: 3200, q: 0.7, vol: 0.12 }),
  rip: () => noise({ dur: 0.05 + Math.random() * 0.04, freq: 2500 + Math.random() * 3500, q: 0.9, type: 'highpass', vol: 0.16 }),
  tearoff: () => {
    noise({ dur: 0.28, freq: 1800, f2: 6000, q: 0.6, type: 'highpass', vol: 0.2 });
    tone({ f: 420, f2: 900, dur: 0.18, type: 'triangle', vol: 0.08, t: 0.05 });
  },
  deal: () => {
    noise({ dur: 0.14, freq: 1400, f2: 4200, q: 1.2, vol: 0.13 });
    tone({ f: 260, f2: 520, dur: 0.08, type: 'triangle', vol: 0.05 });
  },
  dim: () => tone({ f: 220, f2: 90, dur: 0.7, type: 'sine', vol: 0.18 }),
  heartbeat: () => {
    tone({ f: 70, dur: 0.16, type: 'sine', vol: 0.45 });
    tone({ f: 64, t: 0.22, dur: 0.18, type: 'sine', vol: 0.35 });
  },
  charge: (tier = 0) => {
    const dur = 0.6 + tier * 0.18;
    tone({ f: 180, f2: 700 + tier * 280, dur, type: 'sawtooth', vol: 0.05 });
    tone({ f: 360, f2: 1400 + tier * 500, dur, type: 'sine', vol: 0.05 });
    noise({ dur, freq: 400, f2: 5000, q: 1.5, vol: 0.05 });
  },
  pop: () => {
    tone({ f: 620, f2: 110, dur: 0.2, type: 'sine', vol: 0.3 });
    noise({ dur: 0.09, freq: 2600, vol: 0.14 });
  },
  flash: () => {
    noise({ dur: 0.9, freq: 7000, f2: 400, type: 'lowpass', vol: 0.22 });
    tone({ f: 95, f2: 38, dur: 0.9, type: 'sine', vol: 0.4 });
  },
  flip: () => noise({ dur: 0.13, freq: 2200, f2: 7000, q: 2, vol: 0.12 }),
  sparkle: () => {
    for (let i = 0; i < 6; i++)
      tone({ f: 1400 + Math.random() * 1800, t: i * 0.045, dur: 0.14, type: 'triangle', vol: 0.045 });
  },
  glitch: () => {
    for (let i = 0; i < 9; i++)
      tone({ f: 80 + Math.random() * 1400, t: i * 0.04, dur: 0.05, type: Math.random() > 0.5 ? 'sawtooth' : 'square', vol: 0.07 });
    noise({ dur: 0.35, freq: 900, q: 8, vol: 0.12 });
  },
  reveal: (tier = 0) => {
    const C = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
    if (tier === 0) arp(C.slice(0, 3), { step: 0.06 });
    else if (tier === 1) arp(C.slice(0, 4), { step: 0.06 });
    else if (tier === 2) {
      arp([587.3, 740, 880, 1174.7], { step: 0.07, vol: 0.11 });
      SYNTH.sparkle();
    } else if (tier === 3) {
      arp([523.25, 659.25, 783.99, 1046.5], { step: 0.08, type: 'square', vol: 0.06, dur: 0.18 });
      arp([783.99, 1046.5, 1318.5], { step: 0.0, t: 0.38, type: 'square', vol: 0.05, dur: 0.6 });
      SYNTH.sparkle();
    } else if (tier === 4) SYNTH.secret();
    else SYNTH.glitch();
  },
  secret: () => {
    // tiny fanfare: da-da-da DAAA
    const n = [
      [523.25, 0, 0.12], [523.25, 0.13, 0.12], [523.25, 0.26, 0.12],
      [698.5, 0.4, 0.5], [880, 0.4, 0.5], [1046.5, 0.4, 0.5],
      [932.3, 0.95, 0.14], [1046.5, 1.1, 0.9], [1318.5, 1.1, 0.9], [1568, 1.1, 0.9],
    ];
    n.forEach(([f, t, dur]) => tone({ f, t, dur, type: 'square', vol: 0.05 }));
    for (let i = 0; i < 14; i++) tone({ f: 1800 + Math.random() * 2400, t: 1.1 + i * 0.05, dur: 0.12, type: 'triangle', vol: 0.03 });
  },
};

function playFile(name) {
  let a = fileCache.get(name);
  if (!a) {
    a = new Audio(SOUND_FILES[name]);
    fileCache.set(name, a);
  }
  const node = a.cloneNode();
  node.volume = 0.7;
  node.play().catch(() => {});
}

export const sfx = {
  play(name, ...args) {
    if (muted) return;
    try {
      if (SOUND_FILES[name]) playFile(name);
      else SYNTH[name]?.(...args);
    } catch {
      /* audio is a nice-to-have */
    }
  },
  isMuted: () => muted,
  toggle() {
    muted = !muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {}
    if (!muted) audio();
    listeners.forEach((fn) => fn(muted));
    return muted;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
