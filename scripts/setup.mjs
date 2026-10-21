#!/usr/bin/env node
// One-command setup. Idempotent: a second run installs nothing and changes no files.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const step = (msg) => console.log(`\n▸ ${msg}`);
const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) { console.error(`✗ ${cmd} ${args.join(' ')} failed`); process.exit(r.status ?? 1); }
};

step('Node version');
if (Number(process.versions.node.split('.')[0]) < 20) {
  console.error(`✗ Node ${process.versions.node} is too old. Install Node 22 LTS and re-run.`);
  process.exit(1);
}
console.log(`✓ node v${process.versions.node}`);

step('npm dependencies');
const lock = path.join(root, 'package-lock.json');
const stamp = path.join(root, 'node_modules/.package-lock.json');
if (!existsSync(stamp) || (existsSync(lock) && statSync(lock).mtimeMs > statSync(stamp).mtimeMs + 1000)) {
  sh('npm', existsSync(lock) ? ['ci', '--no-audit', '--no-fund'] : ['install', '--no-audit', '--no-fund']);
} else console.log('✓ already installed');

step('Chromium for Playwright');
const { chromium } = await import('playwright');
if (existsSync(chromium.executablePath())) console.log('✓ already installed');
else sh('npx', ['playwright', 'install', 'chromium']);

step('FFmpeg');
try {
  console.log('✓ ' + execFileSync('ffmpeg', ['-hide_banner', '-version'], { encoding: 'utf8' }).split('\n')[0]);
} catch {
  console.error('✗ ffmpeg not found. Install it (sudo apt install ffmpeg | brew install ffmpeg | winget install ffmpeg) and re-run.');
  process.exit(1);
}

step('Doctor');
const doc = spawnSync(process.execPath, [path.join(root, 'scripts/doctor.mjs')], { stdio: 'inherit' });

console.log(`
Optional, only if you want them:
  • Narration (paid, off by default): copy .env.example to .env and fill ELEVENLABS_API_KEY and
    ELEVENLABS_VOICE_ID. Nothing is ever sent before the audio gate; see skills/motion-skill/references/audio.md.
  • Archify diagrams: install archify yourself and set ARCHIFY_BIN, see skills/motion-skill/references/archify.md.
  • Start a video:  npm run new -- --slug <slug> --source <url|file>
`);
process.exit(doc.status ?? 1);
