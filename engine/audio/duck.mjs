// Ducking measurement: music must sit ≥ 10 dB under speech wherever speech is present.
// Compares 400 ms momentary loudness of the speech stem and the music stem over the speech windows.
import { run } from '../render.mjs';

async function momentary(file) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-filter_complex', 'ebur128=framelog=verbose', '-f', 'null', '-']);
  return [...err.matchAll(/t:\s*([\d.]+)\s+TARGET.*?M:\s*(-?[\d.]+|-inf)/g)].map((m) => ({ t: Number(m[1]), M: m[2] === '-inf' ? -120 : Number(m[2]) }));
}

export async function measureDucking(speechFile, musicFile) {
  const [sp, mu] = await Promise.all([momentary(speechFile), momentary(musicFile)]);
  const byT = new Map(mu.map((x) => [x.t.toFixed(1), x.M]));
  const windows = sp.filter((x) => x.M > -40); // speech present
  if (!windows.length) return { speechWindows: 0, minDuckDb: null, pass: true };
  const deltas = windows.map((x) => x.M - (byT.get(x.t.toFixed(1)) ?? -120));
  const min = Math.min(...deltas);
  return { speechWindows: windows.length, minDuckDb: +min.toFixed(1), pass: min >= 10, note: min >= 60 ? 'no music under speech' : undefined };
}
