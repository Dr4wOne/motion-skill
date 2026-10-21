#!/usr/bin/env node
// Final mux: picture track + audio (or silence) → MP4 with AAC and +faststart.
//   node engine/encode.mjs <slug> [--cut name] [--captions] [--audio file]
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, resolveProject, parseArgs, run } from './render.mjs';

export async function finalize(dir, { cut, captions, audio } = {}) {
  const name = [path.basename(dir), cut, captions ? 'captioned' : null].filter(Boolean).join('.');
  const video = path.join(dir, 'out', `${name}.video.mp4`);
  if (!existsSync(video)) throw new Error(`${path.relative(ROOT, video)} missing; run npm run render first`);
  const mixFile = path.join(dir, `audio/mix${cut ? '.' + cut : ''}.wav`);
  const audioFile = audio || (existsSync(mixFile) ? mixFile : null);
  const out = path.join(dir, 'out', `${name}.mp4`);
  const input = audioFile ? ['-i', audioFile] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'];
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, ...input, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out]);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2));
  const out = await finalize(resolveProject(a._[0]), a);
  console.log(`✓ ${path.relative(ROOT, out)}`);
}
