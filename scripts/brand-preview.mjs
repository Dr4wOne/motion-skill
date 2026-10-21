#!/usr/bin/env node
// Brand gate preview: render the channel intro (sting) and outro from brand/brand.json with their code SFX
// and sonic logo, then run QA. Output: brand/preview/out/preview.mp4 + contact sheet (git-ignored).
//   npm run brand:preview [-- --no-audio]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, renderVideo } from '../engine/render.mjs';
import { finalize } from '../engine/encode.mjs';
import { check } from '../engine/check.mjs';
import { buildSfx } from '../engine/audio/sfx.mjs';
import { writeWav } from '../engine/audio/wav.mjs';
import { mix } from '../engine/audio/mix.mjs';

const brand = JSON.parse(readFileSync(path.join(ROOT, 'brand/brand.json'), 'utf8'));
const dir = path.join(ROOT, 'brand/preview');
mkdirSync(path.join(dir, 'audio'), { recursive: true });
const metaOf = async (tpl) => (await import(pathToFileURL(path.join(ROOT, 'templates/scenes', `${tpl}.mjs`)).href)).meta || {};
const scene = async (id, part, props = {}) => ({ id, block: id, template: part.template, brand: true, music: part.music ?? null, duration: (await metaOf(part.template)).duration || 6, props });
const scenes = [await scene('sting', brand.intro), await scene('outro', brand.outro, { preview: true })];
const total = scenes.reduce((n, s) => n + s.duration, 0);
writeFileSync(path.join(dir, 'project.json'), JSON.stringify({ slug: 'preview', title: `${brand.name}: intro and outro`, format: '16:9', fps: 30, style: 'default', audio: { sfx: true, narration: null, music: null }, acceptance: { minSeconds: total - 0.1, maxSeconds: total + 0.1 } }, null, 2) + '\n');
writeFileSync(path.join(dir, 'storyboard.json'), JSON.stringify({ version: 1, slug: 'preview', fps: 30, scenes }, null, 2) + '\n');

await renderVideo(dir, {});
if (!process.argv.includes('--no-audio')) {
  const { L, R } = buildSfx({ scenes });
  writeWav(path.join(dir, 'audio/sfx.wav'), [L, R], 48000);
  await mix(dir, {});
}
const out = await finalize(dir, {});
const { pass, summary, sheet } = await check(dir, { fast: true });
console.log(summary.split('\n').slice(0, 20).join('\n'));
console.log(`\n✓ ${path.relative(ROOT, out)}\ncontact sheet: ${path.relative(ROOT, sheet)}\nBrand gate: show both to the human; change brand/brand.json (name, wordmark, palette, intro/outro) and brand/links.json until they approve.`);
process.exit(pass ? 0 : 1);
