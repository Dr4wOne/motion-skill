// Caption cues: reading speed ≤ 17 chars/s, duration 0.8–7 s, ≤ 2 lines, and (when word
// timestamps exist) cue start within ±150 ms of the first word for ≥ 95% of cues.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { result, skip } from './util.mjs';
import { run } from '../render.mjs';

// Independent placement check: where speech actually starts in the narration stem (silencedetect)
// vs. the first word of each scene's narration. Catches audio placed at the wrong offset.
// The stem is delayed by 1 s for detection so speech that starts < d after 0 s still yields an onset (shifted back).
// d (minimum silence) must be shorter than the shortest designed pause between scenes, or onsets merge; it is
// derived from the word timings (0.8 × shortest inter-scene gap), capped at the original 0.35 s.
async function speechOnsets(file, d = 0.35) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `adelay=1000:all=1,silencedetect=noise=-40dB:d=${d}`, '-f', 'null', '-']);
  return [...err.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]) - 1);
}
function minSceneGap(words) {
  let g = Infinity;
  for (let i = 1; i < words.length; i++) if (words[i].scene !== words[i - 1].scene) g = Math.min(g, words[i].start - words[i - 1].end);
  return g;
}

export async function check({ dir, manifests, opts = {} }) {
  const narrationStem = path.join(dir, `audio/narration${opts.cut ? '.' + opts.cut : ''}.wav`);
  const file = path.join(dir, `captions/captions${opts.cut ? '.' + opts.cut : ''}.json`);
  if (!existsSync(file)) return skip('captions', 'no captions/captions.json yet');
  const { cues, words } = JSON.parse(readFileSync(file, 'utf8'));
  const fails = [];
  let maxCps = 0, synced = 0, syncable = 0;
  for (const [i, c] of cues.entries()) {
    const d = c.end - c.start;
    const cps = c.text.replace(/\s+/g, ' ').length / d;
    maxCps = Math.max(maxCps, cps);
    if (cps > 17) fails.push({ t: c.start, msg: `cue ${i + 1}: ${cps.toFixed(1)} chars/s > 17: "${c.text.slice(0, 40)}"` });
    if (d < 0.8 || d > 7) fails.push({ t: c.start, msg: `cue ${i + 1}: duration ${d.toFixed(2)} s outside 0.8–7 s` });
    if (i && c.start < cues[i - 1].end - 1e-3) fails.push({ t: c.start, msg: `cue ${i + 1} overlaps the previous cue` });
    if (words?.length && c.firstWord != null) {
      syncable++;
      if (Math.abs(c.start - words[c.firstWord].start) <= 0.15) synced++;
    }
  }
  const capLines = manifests.flatMap((m) => m.texts.filter((t) => t.role === 'caption').map((t) => t.lines));
  if (capLines.some((n) => n > 2)) fails.push({ msg: 'a burned-in caption wraps to more than 2 lines' });
  const syncRate = syncable ? synced / syncable : null;
  let placement = 'no narration stem';
  if (existsSync(narrationStem) && words?.length) {
    const onsets = await speechOnsets(narrationStem, +Math.max(0.12, Math.min(0.35, 0.8 * minSceneGap(words))).toFixed(3));
    const firsts = [...new Map([...words].reverse().map((w) => [w.scene, w])).values()]; // first word per scene
    const deltas = firsts.map((w) => Math.min(...onsets.map((o) => Math.abs(o - w.start))));
    const ok = deltas.filter((d) => d <= 0.15).length;
    placement = `${ok}/${deltas.length} scenes ≤ 150 ms (max ${Math.max(...deltas).toFixed(3)} s)`;
    if (ok < deltas.length) fails.push({ msg: `narration placement: ${placement}` });
  }
  if (syncRate !== null && syncRate < 0.95) fails.push({ msg: `only ${(syncRate * 100).toFixed(1)}% of cues within ±150 ms of word timestamps (want ≥ 95%)` });
  return result('captions', fails, { cues: cues.length, maxCps: +maxCps.toFixed(1), syncRate: syncRate === null ? 'no word timestamps' : +syncRate.toFixed(3), narrationPlacement: placement });
}
