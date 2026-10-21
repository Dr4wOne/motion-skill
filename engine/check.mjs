#!/usr/bin/env node
// Self-correction loop entry: npm run check -- <slug> [--cut name] [--captions] [--fast]
// Every frame's manifest → overflow/safe-area/contrast; sampled frames → pixel contrast +
// contact sheet; encoded video (if current) → blank/flash/duration; final mix → loudness.
import { existsSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, resolveProject, parseArgs, openProject, frame, renderFrames, sceneHashes } from './render.mjs';
import { readManifests } from './qa/util.mjs';
import { contactSheet } from './contact-sheet.mjs';
import { writeReport } from './qa/report.mjs';
import * as overflow from './qa/overflow.mjs';
import * as overlap from './qa/overlap.mjs';
import * as safeArea from './qa/safe-area.mjs';
import * as contrast from './qa/contrast.mjs';
import * as blank from './qa/blank-frames.mjs';
import * as flashes from './qa/flashes.mjs';
import * as determinism from './qa/determinism.mjs';
import * as durationSync from './qa/duration-sync.mjs';
import * as loudness from './qa/loudness.mjs';
import * as captions from './qa/captions.mjs';
import * as musicProvenance from './qa/music-provenance.mjs';
import * as linksMatch from './qa/links-match.mjs';
import * as palette from './qa/palette.mjs';

export async function check(dir, opts = {}) {
  const name = [path.basename(dir), opts.cut, opts.captions ? 'captioned' : null].filter(Boolean).join('.');
  const out = path.join(dir, 'out');
  mkdirSync(out, { recursive: true });

  // 1. Manifests for every frame: reuse the render's if it matches the current scene hashes.
  const probe = await openProject(dir, { ...opts, workers: opts.workers || 4 });
  const { info } = probe;
  const hashes = sceneHashes(dir, info, opts);
  const logFile = path.join(out, `${name}.render-log.json`);
  const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, 'utf8')) : null;
  const fresh = log && log.scenes.length === info.scenes.length && log.scenes.every((s) => s.hash === hashes[s.id]);
  let manifests;
  if (fresh) { manifests = readManifests(path.join(out, `${name}.manifest.jsonl`)); }
  else {
    manifests = new Array(info.frames);
    let next = 0;
    await Promise.all(probe.pages.map(async (page) => {
      while (next < info.frames) { const f = next++; manifests[f] = (await frame(page, f, { png: false })).manifest; }
    }));
  }
  await probe.close();

  // 2. Sampled frames (start + 0.5 s, middle, last) per scene.
  const sampleDir = path.join(out, 'qa-frames', name); // per cut: concurrent checks don't clobber each other
  rmSync(sampleDir, { recursive: true, force: true });
  const picks = info.scenes.flatMap((s) => [s.frameStart + Math.min(s.frames - 1, Math.round(info.fps * 0.5)), s.frameStart + (s.frames >> 1), s.frameStart + s.frames - 1 - Math.round(info.fps * 0.4)]);
  const { results: samples } = await renderFrames(dir, picks, sampleDir, { ...opts, workers: opts.workers || 4 });

  // 3. Encoded artefacts.
  const videoFile = fresh && existsSync(path.join(out, `${name}.video.mp4`)) ? path.join(out, `${name}.video.mp4`) : null;
  const stats = videoFile ? await blank.lumaStats(videoFile) : null;
  const finalFile = existsSync(path.join(out, `${name}.mp4`)) ? path.join(out, `${name}.mp4`) : null;
  const mixPath = path.join(dir, `audio/mix${opts.cut ? '.' + opts.cut : ''}.wav`);
  const mixFile = existsSync(mixPath) ? mixPath : null;
  const project = JSON.parse(readFileSync(path.join(dir, 'project.json'), 'utf8'));
  const ctx = { dir, info, manifests, samples, videoFile, finalFile, stats, mixFile, opts, audioFile: existsSync(path.join(dir, 'audio/narration.mp3')) ? path.join(dir, 'audio/narration.mp3') : null, expect: opts.cut ? JSON.parse(readFileSync(path.join(dir, 'storyboard.json'), 'utf8')).cuts[opts.cut].acceptance || {} : project.acceptance || {} };

  const checks = [overflow, overlap, safeArea, contrast, blank, flashes, durationSync, loudness, captions, musicProvenance, linksMatch, palette];
  if (!opts.fast) checks.push(determinism);
  const results = [];
  for (const c of checks) results.push(await c.check(ctx));

  const sheet = await contactSheet(samples, path.join(out, `${name}.contact-sheet.png`), { title: `${name} · ${info.frames} frames · ${info.duration.toFixed(1)} s` });
  const { pass, summary } = writeReport(path.join(dir, opts.cut ? `qa-report.${opts.cut}.json` : 'qa-report.json'), { project: path.basename(dir), cut: opts.cut, results, extra: { contactSheet: path.relative(dir, sheet), manifestSource: fresh ? 'render' : 'manifest-pass' } });
  return { pass, summary, sheet };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2));
  if (!a._[0]) { console.error('usage: npm run check -- <slug> [--cut name] [--captions] [--fast]'); process.exit(1); }
  const dir = resolveProject(a._[0]);
  const { pass, summary, sheet } = await check(dir, a);
  console.log(summary.split('\n').slice(0, 30).join('\n'));
  console.log(`\ncontact sheet: ${path.relative(ROOT, sheet)}`);
  process.exit(pass ? 0 : 1);
}
