#!/usr/bin/env node
// Render a project to an H.264 picture track (no audio), or selected frames to PNG.
//   node engine/render.mjs <slug|dir> [--scene id,id] [--frames a-b|a,b,c] [--fps 30] [--format 16:9|9:16]
//        [--cut vertical] [--size WxH] [--preview] [--workers n] [--reducedMotion]
// Cache: each scene is split into chunks of ≤ CHUNK frames, encoded to .cache/segments/<sceneHash>/<k>.mp4.
// A scene's hash covers its storyboard entry, its template/module source, the engine, style, fonts and
// output settings, so editing one scene re-renders only that scene.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHUNK = 90;

export function resolveProject(arg) {
  for (const dir of [path.join(ROOT, 'projects', arg), path.resolve(arg), arg === 'demo' ? path.join(ROOT, 'engine/demo') : null]) {
    if (dir && existsSync(path.join(dir, 'storyboard.json'))) return dir;
  }
  throw new Error(`no storyboard.json for "${arg}" (looked in projects/${arg} and ${path.resolve(arg)})`);
}

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

// Open a browser with `n` pages on the project. Returns { info, pages, close }.
export async function openProject(dir, { format, cut, size, fps, reducedMotion, captions, workers = 1 } = {}) {
  const { server, url } = await serve(ROOT);
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-gpu', '--font-render-hinting=none', '--disable-lcd-text'] });
  const q = new URLSearchParams({ root: '/' + path.relative(ROOT, dir).split(path.sep).join('/') });
  if (format) q.set('format', format);
  if (cut) q.set('cut', cut);
  if (size) q.set('size', size);
  if (fps) q.set('fps', String(fps));
  if (reducedMotion) q.set('reducedMotion', '1');
  if (captions) q.set('captions', '1');
  const pages = await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${url}/engine/runtime.html?${q}`);
    try { await page.evaluate(() => window.__ready); }
    catch (e) { throw new Error(`runtime failed to boot: ${e.message}\n${errors.join('\n')}`); }
    return page;
  }));
  const info = await pages[0].evaluate(() => window.info);
  return { info, pages, query: q.toString(), close: async () => { await browser.close(); server.close(); } };
}

// Render one frame: returns { manifest, png (Buffer) }.
export async function frame(page, f, { png = true } = {}) {
  const [manifest, data] = await page.evaluate(([f, png]) => {
    const m = window.render(f);
    return [m, png ? document.getElementById('c').toDataURL('image/png') : null];
  }, [f, png]);
  return { manifest, png: data ? Buffer.from(data.slice(data.indexOf(',') + 1), 'base64') : null };
}

function sha(...parts) {
  const h = createHash('sha256');
  for (const p of parts) h.update(typeof p === 'string' ? p : JSON.stringify(p));
  return h.digest('hex').slice(0, 16);
}

function dirSources(rel) {
  const d = path.join(ROOT, rel);
  if (!existsSync(d)) return '';
  return readdirSync(d).filter((f) => f.endsWith('.mjs')).sort().map((f) => f + readFileSync(path.join(d, f), 'utf8')).join('\n');
}

export function sceneHashes(dir, info, opts) {
  const board = JSON.parse(readFileSync(path.join(dir, 'storyboard.json'), 'utf8'));
  const project = JSON.parse(readFileSync(path.join(dir, 'project.json'), 'utf8'));
  const styleFile = path.join(ROOT, 'styles', `${project.style || 'default'}.style.json`);
  const engine = sha(['timeline', 'draw', 'runtime', 'text-layout', 'ease', 'tween', 'prng', 'safe-area', 'tracker', 'archify'].map((m) => readFileSync(path.join(ROOT, 'engine', `${m}.mjs`), 'utf8')).join('\n'));
  const fonts = sha(readdirSync(path.join(ROOT, 'assets/fonts')).sort().join(','));
  const brandFiles = ['brand/brand.json', 'brand/links.json'].map((f) => (existsSync(path.join(ROOT, f)) ? readFileSync(path.join(ROOT, f), 'utf8') : '')).join('');
  const shared = sha(engine, fonts, brandFiles, readFileSync(styleFile, 'utf8'), dirSources('templates/scenes/lib'),
    { roadmap: board.roadmap || null, theme: project.theme, dials: project.dials, reducedMotion: !!opts.reducedMotion || !!project.reducedMotion, fps: info.fps, out: [info.outW, info.outH], format: info.format, cut: opts.cut || null });
  const byId = new Map(board.scenes.map((s) => [s.id, s]));
  const cutScenes = opts.cut ? Object.fromEntries(board.cuts[opts.cut].scenes.map((c) => [c.id, c])) : {};
  const cuesFile = path.join(dir, `captions/captions${opts.cut ? '.' + opts.cut : ''}.json`);
  const cues = opts.captions && existsSync(cuesFile) ? JSON.parse(readFileSync(cuesFile, 'utf8')).cues : [];
  return Object.fromEntries(info.scenes.map((s) => {
    const entry = { ...byId.get(s.id), ...(cutScenes[s.id] || {}) };
    const t0 = s.frameStart / info.fps, t1 = (s.frameStart + s.frames) / info.fps;
    entry.__cues = cues.filter((c) => c.end > t0 && c.start < t1);
    const src = entry.module ? path.join(dir, entry.module) : path.join(ROOT, 'templates/scenes', `${entry.template}.mjs`);
    const dataFile = entry.props?.layoutFile ? path.join(ROOT, entry.props.layoutFile) : null;
    const data = dataFile && existsSync(dataFile) ? readFileSync(dataFile, 'utf8') : '';
    return [s.id, sha(shared, entry, readFileSync(src, 'utf8'), data)];
  }));
}

function encoder(file, fps, preset) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', preset, '-crf', '18', '-pix_fmt', 'yuv420p', '-g', String(fps * 2), '-threads', '2', file], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (d) => { err += d; });
  const done = new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg: ${err}`)))));
  return {
    write: async (buf) => { if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r)); },
    end: () => { ff.stdin.end(); return done; },
  };
}

// Render the whole picture track. Returns { file, manifestFile, log }.
export async function renderVideo(dir, opts = {}) {
  const t0 = Date.now();
  const workers = Number(opts.workers) || Math.max(1, Math.min(8, cpus().length - 2));
  const name = opts.name || [path.basename(dir), opts.cut, opts.captions ? 'captioned' : null, opts.preview ? 'preview' : null].filter(Boolean).join('.');
  const size = opts.preview && !opts.size ? undefined : opts.size;
  const proj = await openProject(dir, { ...opts, size: opts.preview ? previewSize(opts, dir) : size, workers });
  const { info, pages } = proj;
  try {
    const hashes = sceneHashes(dir, info, opts);
    const only = opts.scene ? new Set(String(opts.scene).split(',')) : null;
    const cacheRoot = path.join(ROOT, '.cache/segments');
    const jobs = [];
    const log = { project: path.basename(dir), cut: opts.cut || null, fps: info.fps, size: `${info.outW}x${info.outH}`, workers, scenes: [] };
    for (const s of info.scenes) {
      if (only && !only.has(s.id)) continue;
      const sdir = path.join(cacheRoot, hashes[s.id]);
      const chunks = Math.ceil(s.frames / CHUNK);
      const hit = existsSync(path.join(sdir, 'done.json'));
      log.scenes.push({ id: s.id, hash: hashes[s.id], frames: s.frames, cache: hit ? 'hit' : 'miss' });
      if (hit) continue;
      rmSync(sdir, { recursive: true, force: true });
      mkdirSync(sdir, { recursive: true });
      for (let k = 0; k < chunks; k++) jobs.push({ scene: s, sdir, k, from: s.frameStart + k * CHUNK, to: Math.min(s.frameStart + s.frames, s.frameStart + (k + 1) * CHUNK) });
    }
    // Longest-first is unnecessary: chunks are near-equal. Simple shared queue.
    let next = 0;
    const preset = opts.preview ? 'veryfast' : 'medium';
    await Promise.all(pages.map(async (page) => {
      while (next < jobs.length) {
        const job = jobs[next++];
        const tmp = path.join(job.sdir, `${job.k}.tmp.mp4`);
        const enc = encoder(tmp, info.fps, preset);
        const lines = [];
        for (let f = job.from; f < job.to; f++) {
          const r = await frame(page, f);
          lines.push(JSON.stringify(r.manifest));
          await enc.write(r.png);
        }
        await enc.end();
        renameSync(tmp, path.join(job.sdir, `${job.k}.mp4`));
        writeFileSync(path.join(job.sdir, `${job.k}.jsonl`), lines.join('\n') + '\n');
      }
    }));
    for (const s of log.scenes) {
      if (s.cache === 'miss') writeFileSync(path.join(cacheRoot, s.hash, 'done.json'), JSON.stringify({ id: s.id, frames: s.frames, chunks: Math.ceil(s.frames / CHUNK) }));
    }

    // Concatenate (stream copy) and merge manifests.
    const outDir = path.join(dir, 'out');
    mkdirSync(outDir, { recursive: true });
    const list = [], manifests = [];
    for (const s of log.scenes) {
      const sdir = path.join(cacheRoot, s.hash);
      for (let k = 0; k < Math.ceil(s.frames / CHUNK); k++) {
        list.push(`file '${path.join(sdir, `${k}.mp4`)}'`);
        manifests.push(readFileSync(path.join(sdir, `${k}.jsonl`), 'utf8'));
      }
    }
    const listFile = path.join(outDir, `${name}.concat.txt`);
    writeFileSync(listFile, list.join('\n') + '\n');
    const file = path.join(outDir, `${name}.video.mp4`);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', file]);
    rmSync(listFile);
    const manifestFile = path.join(outDir, `${name}.manifest.jsonl`);
    writeFileSync(manifestFile, manifests.join(''));
    log.renderedFrames = jobs.reduce((n, j) => n + (j.to - j.from), 0);
    log.seconds = +((Date.now() - t0) / 1000).toFixed(1);
    log.videoSeconds = +(log.scenes.reduce((n, s) => n + s.frames, 0) / info.fps).toFixed(2);
    log.realtimeRatio = +(log.seconds / log.videoSeconds).toFixed(2);
    writeFileSync(path.join(outDir, `${name}.render-log.json`), JSON.stringify(log, null, 2) + '\n');
    return { file, manifestFile, log, info };
  } finally { await proj.close(); }
}

function previewSize(opts, dir) {
  const fmt = opts.format || JSON.parse(readFileSync(path.join(dir, 'project.json'), 'utf8')).format || '16:9';
  return fmt === '9:16' ? '360x640' : '640x360';
}

// Render specific frames to PNG + manifest (QA sampling, thumbnails, storyboard cards).
export async function renderFrames(dir, frames, outDir, opts = {}) {
  const workers = Math.max(1, Math.min(Number(opts.workers) || 4, frames.length));
  const proj = await openProject(dir, { ...opts, workers });
  try {
    mkdirSync(outDir, { recursive: true });
    const results = new Array(frames.length);
    let next = 0;
    await Promise.all(proj.pages.map(async (page) => {
      while (next < frames.length) {
        const i = next++;
        const f = frames[i] === 'last' ? proj.info.frames - 1 : frames[i];
        const r = await frame(page, f);
        const file = path.join(outDir, `f${String(f).padStart(6, '0')}.png`);
        writeFileSync(file, r.png);
        results[i] = { frame: f, file, manifest: r.manifest };
      }
    }));
    return { info: proj.info, results };
  } finally { await proj.close(); }
}

export function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? resolve({ out, err }) : reject(new Error(`${cmd} ${args.slice(0, 6).join(' ')}…: ${err.slice(-800)}`))));
  });
}

export function parseFrames(spec, info) {
  return String(spec).split(',').flatMap((part) => {
    const m = part.match(/^(\d+)-(\d+)$/);
    if (m) return Array.from({ length: +m[2] - +m[1] + 1 }, (_, i) => +m[1] + i);
    return [part === 'last' ? info.frames - 1 : Number(part)];
  });
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2));
  if (!a._[0]) { console.error('usage: npm run render -- <slug> [--scene id] [--frames a-b] [--cut name] [--preview]'); process.exit(1); }
  const dir = resolveProject(a._[0]);
  if (a.frames) {
    const probe = await openProject(dir, a);
    const frames = parseFrames(a.frames, probe.info);
    await probe.close();
    const { results } = await renderFrames(dir, frames, path.join(dir, 'out/frames'), a);
    console.log(`✓ ${results.length} frame(s) → ${path.relative(ROOT, path.dirname(results[0].file))}/`);
  } else {
    const { file, log } = await renderVideo(dir, a);
    for (const s of log.scenes) console.log(`  ${s.id.padEnd(8)} ${s.cache === 'hit' ? 'cache hit ' : 'rendered  '} ${s.frames} frames  ${s.hash}`);
    console.log(`✓ ${path.relative(ROOT, file)}  ${log.videoSeconds}s video, rendered ${log.renderedFrames} frames in ${log.seconds}s (${log.realtimeRatio}× real time, ${log.workers} workers)`);
  }
}
