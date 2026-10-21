// Uniform (blank) stretches ≥ 0.5 s and clipped frames, from ffmpeg signalstats on the encoded video.
// Also returns per-frame YAVG for the flash check.
import { result, skip } from './util.mjs';
import { run } from '../render.mjs';

export async function lumaStats(video) {
  const { out } = await run('ffmpeg', ['-v', 'error', '-i', video, '-vf', 'signalstats,metadata=print:file=-', '-f', 'null', '-']);
  const frames = [];
  let cur = null;
  for (const line of out.split('\n')) {
    const fm = line.match(/^frame:(\d+)/);
    if (fm) { cur = { frame: +fm[1] }; frames.push(cur); continue; }
    const kv = line.match(/lavfi\.signalstats\.(YMIN|YMAX|YAVG|YHIGH|YLOW)=([\d.]+)/);
    if (kv && cur) cur[kv[1]] = +kv[2];
  }
  return frames;
}

export async function check({ videoFile, info, stats }) {
  if (!videoFile) return skip('blank-frames', 'no current picture track (run npm run render)');
  const frames = stats ?? (await lumaStats(videoFile));
  const fails = [];
  const minRun = Math.round(info.fps * 0.5);
  let start = -1;
  for (let i = 0; i <= frames.length; i++) {
    const blank = i < frames.length && frames[i].YMAX - frames[i].YMIN < 8;
    if (blank && start < 0) start = i;
    if (!blank && start >= 0) {
      if (i - start >= minRun) fails.push({ frame: start, frames: i - start, t: +(start / info.fps).toFixed(2), msg: `blank for ${((i - start) / info.fps).toFixed(2)} s` });
      start = -1;
    }
  }
  // Clipping: more than 25% of the frame at full white (YHIGH = 90th percentile ≥ 250).
  const clipped = frames.filter((f) => f.YHIGH >= 250);
  if (clipped.length) fails.push({ frame: clipped[0].frame, frames: clipped.length, msg: `${clipped.length} frame(s) with ≥10% pixels near full white` });
  return result('blank-frames', fails, { frames: frames.length });
}
