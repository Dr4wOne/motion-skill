#!/usr/bin/env node
// Starter sonic logo: ≤ 1.5 s motif generated in code (rising fifth + octave on a bell timbre over a
// soft low root). Deterministic. node engine/audio/sonic-logo.mjs [out.wav]
import { fileURLToPath } from 'node:url';
import { renderNotes, fade, SR } from './synth.mjs';
import { writeWav } from './wav.mjs';

export function sonicLogo() {
  // D5 – A5 – D6, then a held D3 underneath. Change the notes to make it yours.
  const notes = [
    { t: 0.0, dur: 0.18, midi: 74, vel: 0.55 }, { t: 0.16, dur: 0.18, midi: 81, vel: 0.6 }, { t: 0.32, dur: 0.9, midi: 86, vel: 0.7 },
    { t: 0.32, dur: 1.0, midi: 50, vel: 0.35 },
  ];
  const out = fade(renderNotes(notes, { seconds: 1.5, timbre: 'bell', gain: 0.3, reverb: 0.25 }), 0.004, 0.45);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] || 'sonic-logo.wav';
  const { L, R } = sonicLogo();
  writeWav(file, [L, R], SR);
  console.log(`✓ ${file} (${(L.length / SR).toFixed(2)} s)`);
}
