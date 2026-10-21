// Audio for a brand scene (intro sting / outro): template meta SFX + sonic logo in the last 1.5 s + music cue,
// levelled so the loudest short-term window is −17 LUFS (stings ≤ −16), true-peak limited at −2.5 dBTP.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, run } from '../render.mjs';
import { KINDS } from './sfx.mjs';
import { sonicLogo } from './sonic-logo.mjs';
import { SR } from './synth.mjs';
import { writeWav } from './wav.mjs';

export async function templateMeta(template) {
  const f = path.join(ROOT, 'templates/scenes', `${template}.mjs`);
  return existsSync(f) ? (await import(pathToFileURL(f).href)).meta || {} : {};
}

const ebur = async (f) => (await run('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'])).err;
export const shortTermMax = (err) => Math.max(...[...err.matchAll(/ S:\s*(-?[\d.]+)/g)].map((m) => Number(m[1])).filter((v) => v > -70));
export const summary = (err) => { const s = err.slice(err.lastIndexOf('Summary:')); return { integrated: Number(s.match(/I:\s+(-?[\d.]+)/)?.[1]), truePeak: Number(s.match(/Peak:\s+(-?[\d.]+)/)?.[1]), shortTermMax: shortTermMax(err) }; };

// scene: { id, duration, template, audio?: { music, sfx, logo }, music? }  → { file, ...loudness }
export async function buildBrandAudio(scene, outDir) {
  const meta = await templateMeta(scene.template);
  const sfx = scene.audio?.sfx?.length ? scene.audio.sfx : meta.sfx || [];
  const musicId = scene.audio?.music ?? scene.music ?? null;
  const logo = scene.audio?.logo ?? true;
  const n = Math.round(scene.duration * SR), L = new Float32Array(n), R = new Float32Array(n);
  const add = (sig, at, g = 1, pan = 0) => { const i0 = Math.round(at * SR); for (let i = 0; i < sig.length && i0 + i < n; i++) { L[i0 + i] += sig[i] * g * (1 - pan); R[i0 + i] += sig[i] * g * (1 + pan); } };
  for (const e of sfx) { const f = KINDS[e.kind]; if (!f) throw new Error(`${scene.id}: unknown sfx kind ${e.kind}`); add(f(...(e.args || [])), e.at, e.gain ?? 1, e.pan ?? 0); }
  if (logo) { const lg = sonicLogo(); const at = Math.max(0, scene.duration - lg.L.length / SR); add(lg.L, at, 0.8, -0.0); for (let i = 0; i < lg.R.length && Math.round(at * SR) + i < n; i++) R[Math.round(at * SR) + i] += (lg.R[i] - lg.L[i]) * 0.8; }
  const sfxWav = path.join(outDir, `${scene.id}.sfx.wav`);
  writeWav(sfxWav, [L, R], SR);
  const music = musicId ? path.join(ROOT, 'assets/music', `${musicId}.flac`) : null;
  const inputs = ['-i', sfxWav, ...(music ? ['-i', music] : [])];
  const graph = music ? `[1:a]volume=-3dB,afade=t=out:st=${Math.max(0, scene.duration - 1.6)}:d=1.5[m];[0:a][m]amix=inputs=2:normalize=0,atrim=0:${scene.duration}[mix]` : `[0:a]atrim=0:${scene.duration}[mix]`;
  const raw = path.join(outDir, `${scene.id}.raw.wav`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${graph};[mix]aresample=48000[o]`, '-map', '[o]', '-t', String(scene.duration), raw]);
  const gain = -17 - shortTermMax(await ebur(raw));
  const out = path.join(outDir, `${scene.id}.wav`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=${10 ** (-2.5 / 20)}:level=false:attack=2:release=50,aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo`, out]);
  return { file: out, music: musicId, ...summary(await ebur(out)) };
}

export { ebur };
