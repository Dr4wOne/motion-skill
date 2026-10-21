#!/usr/bin/env node
// Layer A: sound effects synthesised in code (deterministic, seeded). Subtle by design:
// a soft filtered-noise swell at each scene change and a quiet tick on diagram reveals (beats).
//   npm run sfx -- <slug>   → projects/<slug>/audio/sfx.wav (48 kHz stereo, full video length)
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../prng.mjs';
import { writeWav } from './wav.mjs';
import { scenesFor, suffix } from '../../scripts/lib/cuts.mjs';

const SR = 48000;
const db = (d) => 10 ** (d / 20);

export function swell(seconds = 0.9, peakDb = -30, seed = 1) {
  const n = Math.round(seconds * SR), out = new Float32Array(n), rnd = mulberry32(seed);
  let lp = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const cutoff = 0.02 + 0.06 * Math.sin(Math.PI * p); // filter opens then closes
    lp += cutoff * ((rnd() * 2 - 1) - lp);
    lp2 += cutoff * (lp - lp2);
    out[i] = lp2 * Math.sin(Math.PI * p) ** 2;
  }
  return normalise(out, peakDb);
}

export function tick(freq = 1320, seconds = 0.09, peakDb = -34) {
  const n = Math.round(seconds * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = (Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * freq * 2 * t)) * Math.exp(-t * 55) * Math.min(1, t * 2000);
  }
  return normalise(out, peakDb);
}

function normalise(x, peakDb) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  const g = m ? db(peakDb) / m : 0;
  return x.map((v) => v * g);
}

// Brand-lab SFX kinds (all subtle; no hits). Each returns mono Float32 at SR.
export function click(seed = 1, peakDb = -32) {
  const n = Math.round(0.018 * SR), out = new Float32Array(n), rnd = mulberry32(seed);
  let lp = 0;
  for (let i = 0; i < n; i++) { lp += 0.35 * ((rnd() * 2 - 1) - lp); out[i] = lp * Math.exp(-i / (0.004 * SR)); }
  return normalise(out, peakDb);
}
export function sweep(f0 = 220, f1 = 880, seconds = 0.8, peakDb = -30) {
  const n = Math.round(seconds * SR), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) { const p = i / n; ph += (2 * Math.PI * (f0 * (f1 / f0) ** p)) / SR; out[i] = Math.sin(ph) * Math.sin(Math.PI * p) ** 2; }
  return normalise(out, peakDb);
}
export function lock(peakDb = -30) {
  const n = Math.round(0.24 * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR, f = t < 0.08 ? 1200 : 1800; out[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-((t % 0.08) * 30)) * (t < 0.16 ? 1 : 0); }
  return normalise(out, peakDb);
}
export function scratch(seed = 2, seconds = 0.3, peakDb = -34) {
  const n = Math.round(seconds * SR), out = new Float32Array(n), rnd = mulberry32(seed);
  let a = 0, b = 0;
  for (let i = 0; i < n; i++) { const x = rnd() * 2 - 1; a += 0.5 * (x - a); b += 0.08 * (a - b); const grit = 0.6 + 0.4 * Math.sin(i / 90 + rnd()); out[i] = (a - b) * grit * Math.sin(Math.PI * i / n); }
  return normalise(out, peakDb);
}
export function clack(freq = 900, peakDb = -32) {
  const n = Math.round(0.06 * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; out[i] = (Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.sin(2 * Math.PI * freq * 2.7 * t)) * Math.exp(-t * 80); }
  return normalise(out, peakDb);
}
export function sub(peakDb = -30) {
  const n = Math.round(0.6 * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; out[i] = Math.sin(2 * Math.PI * 55 * t) * Math.min(1, t / 0.05) * Math.exp(-t * 4); }
  return normalise(out, peakDb);
}
export const KINDS = { click, sweep, lock, scratch, clack, sub, tick, swell };

export function buildSfx(board, { fps = board.fps || 30 } = {}) {
  const total = board.scenes.reduce((a, s) => a + s.duration, 0);
  const L = new Float32Array(Math.ceil(total * SR) + SR), R = new Float32Array(L.length);
  const add = (sig, at, pan = 0) => {
    const i0 = Math.max(0, Math.round(at * SR));
    for (let i = 0; i < sig.length && i0 + i < L.length; i++) { L[i0 + i] += sig[i] * (1 - pan) ; R[i0 + i] += sig[i] * (1 + pan); }
  };
  const cues = [];
  let t = 0;
  board.scenes.forEach((s, i) => {
    if (i > 0) { const w = swell(0.9, -30, 1000 + i); add(w, t - 0.45); cues.push({ t: +(t - 0.45).toFixed(3), kind: 'swell', scene: s.id }); }
    for (const [j, b] of (s.brand ? [] : s.props?.beats || []).entries()) {
      if (b < 0.3 || b > s.duration - 0.3) continue;
      add(tick(j % 2 ? 1320 : 1180), t + b + 0.15, j % 2 ? 0.15 : -0.15);
      cues.push({ t: +(t + b + 0.15).toFixed(3), kind: 'tick', scene: s.id });
    }
    t += s.duration;
  });
  return { L: L.subarray(0, Math.ceil(total * SR)), R: R.subarray(0, Math.ceil(total * SR)), cues, seconds: total };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slug = process.argv[2];
  const ci = process.argv.indexOf('--cut'), cut = ci > 0 ? process.argv[ci + 1] : null;
  const dir = (await import('../render.mjs')).resolveProject(slug);
  const full = JSON.parse(readFileSync(path.join(dir, 'storyboard.json'), 'utf8'));
  const board = { ...full, scenes: scenesFor(full, cut) };
  const { L, R, cues, seconds } = buildSfx(board);
  mkdirSync(path.join(dir, 'audio'), { recursive: true });
  writeWav(path.join(dir, `audio/sfx${suffix(cut)}.wav`), [L, R], SR);
  console.log(`✓ audio/sfx${suffix(cut)}.wav ${seconds.toFixed(1)} s, ${cues.filter((c) => c.kind === 'swell').length} swells, ${cues.filter((c) => c.kind === 'tick').length} ticks`);
}
