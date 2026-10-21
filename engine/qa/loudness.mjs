// EBU R128 loudness of the final mix: integrated −14 ± 1 LUFS, true peak ≤ −1 dBTP.
import { existsSync } from 'node:fs';
import { result, skip } from './util.mjs';
import { run } from '../render.mjs';

export async function measure(file) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-']);
  const summary = err.slice(err.lastIndexOf('Summary:'));
  const num = (re) => { const m = summary.match(re); return m ? Number(m[1]) : null; };
  return { integrated: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), truePeak: num(/Peak:\s+(-?[\d.]+) dBFS/) };
}

export async function check({ mixFile, target = -14, tol = 1, maxTP = -1 }) {
  if (!mixFile || !existsSync(mixFile)) return skip('loudness', 'no final audio mix yet');
  const m = await measure(mixFile);
  const fails = [];
  if (m.integrated === null || Math.abs(m.integrated - target) > tol) fails.push({ msg: `integrated ${m.integrated} LUFS, want ${target} ± ${tol}` });
  if (m.truePeak === null || m.truePeak > maxTP) fails.push({ msg: `true peak ${m.truePeak} dBTP > ${maxTP}` });
  return result('loudness', fails, m);
}
