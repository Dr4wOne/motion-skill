#!/usr/bin/env node
// Health check. Exits 1 if anything blocks rendering; warnings don't fail.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statfsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const ok = (name, detail) => results.push({ level: 'ok', name, detail });
const warn = (name, detail) => results.push({ level: 'warn', name, detail });
const fail = (name, detail) => results.push({ level: 'fail', name, detail });

function run(cmd, args) {
  try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { return null; }
}

// Node
const [major, minor] = process.versions.node.split('.').map(Number);
if (major >= 20) ok('node', `v${process.versions.node}`);
else fail('node', `v${process.versions.node} < 20; install Node 22 LTS (https://nodejs.org)`);

// FFmpeg / ffprobe
const ffv = run('ffmpeg', ['-hide_banner', '-version']);
if (!ffv) fail('ffmpeg', 'not found; install: sudo apt install ffmpeg | brew install ffmpeg | winget install ffmpeg');
else {
  ok('ffmpeg', ffv.split('\n')[0].replace('ffmpeg version ', '').split(' ')[0]);
  const enc = run('ffmpeg', ['-hide_banner', '-encoders']) || '';
  for (const e of ['libx264', 'aac']) (enc.includes(` ${e} `) ? ok : fail)(`encoder ${e}`, enc.includes(` ${e} `) ? 'present' : 'missing; use an ffmpeg build with it');
  const filters = run('ffmpeg', ['-hide_banner', '-filters']) || '';
  for (const f of ['loudnorm', 'ebur128', 'sidechaincompress', 'tile', 'signalstats']) (filters.includes(` ${f} `) ? ok : fail)(`filter ${f}`, filters.includes(` ${f} `) ? 'present' : 'missing');
  (filters.includes(' subtitles ') ? ok : warn)('filter subtitles (libass)', filters.includes(' subtitles ') ? 'present' : 'missing: burned-in captions disabled, SRT sidecar still produced');
}
if (!run('ffprobe', ['-hide_banner', '-version'])) fail('ffprobe', 'not found (ships with ffmpeg)');

// Playwright + Chromium
const pwPkg = path.join(root, 'node_modules/playwright/package.json');
if (!existsSync(pwPkg)) fail('playwright', 'not installed; run npm run setup');
else {
  ok('playwright', JSON.parse(readFileSync(pwPkg, 'utf8')).version);
  try {
    const { chromium } = await import('playwright');
    const exe = chromium.executablePath();
    (existsSync(exe) ? ok : fail)('chromium', existsSync(exe) ? path.basename(path.dirname(path.dirname(exe))) : 'missing; run npm run setup');
  } catch (e) { fail('chromium', e.message.split('\n')[0]); }
}

// Fonts
for (const f of ['SourceSerif4-latin-wght-normal.woff2', 'JetBrainsMono-latin-400.woff2']) {
  (existsSync(path.join(root, 'assets/fonts', f)) ? ok : fail)(`font ${f}`, existsSync(path.join(root, 'assets/fonts', f)) ? 'present' : 'missing from assets/fonts');
}

// Disk
try {
  const s = statfsSync(root);
  const gb = (s.bavail * s.bsize) / 1e9;
  (gb >= 5 ? ok : warn)('disk free', `${gb.toFixed(0)} GB${gb < 5 ? ' (a 5-min render needs ~3 GB of cache)' : ''}`);
} catch { warn('disk free', 'unknown'); }

// Optional: narration
const envFile = path.join(root, '.env');
const env = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
const hasKey = /^ELEVENLABS_API_KEY=\S+/m.test(env);
const hasVoice = /^ELEVENLABS_VOICE_ID=\S+/m.test(env);
if (hasKey && hasVoice) ok('narration', 'ElevenLabs configured (.env)');
else warn('narration (optional)', 'off: silent and SFX-only videos work; to narrate, set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env');

// Brand: placeholder links still in place?
const linksFile = path.join(root, 'brand/links.json');
if (existsSync(linksFile)) {
  const ph = JSON.parse(readFileSync(linksFile, 'utf8')).filter((l) => l.placeholder).length;
  (ph ? warn : ok)('brand links', ph ? `${ph} placeholder link(s) in brand/links.json: replace them before publishing` : 'no placeholders');
}

// Optional: Archify CLI for npm run diagram:layout (the committed sample layout works without it).
const archBin = process.env.ARCHIFY_BIN;
if (archBin) (existsSync(archBin) ? ok : warn)('archify (optional)', existsSync(archBin) ? `ARCHIFY_BIN=${path.basename(archBin)}` : 'ARCHIFY_BIN points to a missing file');
else warn('archify (optional)', 'not configured: diagram:layout needs ARCHIFY_BIN (path to bin/archify.mjs); the sample layout still renders');

const icon = { ok: '✓', warn: '!', fail: '✗' };
for (const r of results) console.log(`${icon[r.level]} ${r.name.padEnd(28)} ${r.detail}`);
const fails = results.filter((r) => r.level === 'fail').length;
console.log(fails ? `\n${fails} blocker(s). Fix the ✗ lines above.` : '\nAll required checks passed.');
process.exit(fails ? 1 : 0);
