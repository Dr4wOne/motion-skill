#!/usr/bin/env node
// Start a video project: snapshot the source article and create the project skeleton.
// npm run new -- --slug <slug> --source <url|file> [--format 16:9|9:16] [--length 5m] [--lang en|pt-BR]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).join(' ').split(/\s*--/).filter(Boolean).map((p) => {
    const [k, ...v] = p.trim().split(/\s+/);
    return [k, v.join(' ') || true];
  }),
);
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

const slug = args.slug;
const source = args.source;
if (!slug || !source) die('usage: npm run new -- --slug <slug> --source <url|file> [--format 16:9|9:16] [--length 5m] [--lang en|pt-BR]');
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) die('slug must be lowercase letters, digits and dashes');
const format = args.format || '16:9';
if (!['16:9', '9:16'].includes(format)) die('--format must be 16:9 or 9:16');
const lang = args.lang || 'en';
if (!['en', 'pt-BR'].includes(lang)) die('--lang must be en or pt-BR');
const lengthSec = parseLength(args.length || '5m');

const dir = path.join(root, 'projects', slug);
if (existsSync(path.join(dir, 'project.json'))) die(`projects/${slug} already exists; pick another slug or delete it first`);
const src = path.join(dir, 'source');
for (const d of ['source/figures', 'scenes', 'audio', 'captions', 'out']) mkdirSync(path.join(dir, d), { recursive: true });

// 1. Snapshot the source
let kind;
if (/^https?:\/\//.test(source)) {
  const res = await fetch(source, { headers: { 'user-agent': 'motion-skill/0.1 (+article snapshot)' } });
  if (!res.ok) die(`fetch ${source} → HTTP ${res.status}`);
  writeFileSync(path.join(src, 'article.html'), await res.text());
  kind = 'html';
} else {
  const file = path.resolve(source);
  if (!existsSync(file)) die(`source file not found: ${file}`);
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html' || ext === '.htm') { copyFileSync(file, path.join(src, 'article.html')); kind = 'html'; }
  else if (ext === '.md' || ext === '.mdx') { kind = 'md'; writeMarkdownSource(readFileSync(file, 'utf8')); }
  else die('source must be a URL, .html, .md or .mdx file');
}
let stats = {};
if (kind === 'html') {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/lib/html-to-md.mjs'), path.join(src, 'article.html'), src], { encoding: 'utf8' });
  if (r.status !== 0) die(`article conversion failed:\n${r.stderr}`);
  stats = JSON.parse(r.stdout.trim().split('\n').pop());
}
const anchors = JSON.parse(readFileSync(path.join(src, 'anchors.json'), 'utf8'));
const title = (readFileSync(path.join(src, 'article.md'), 'utf8').match(/^# (.+)$/m) || [, slug])[1].trim();

// 2. Skeleton
const project = {
  slug, title, source, snapshotDate: new Date().toISOString().slice(0, 10),
  format, lang, fps: 30, targetSeconds: lengthSec, style: 'default',
  dials: { DESIGN_VARIANCE: 4, MOTION_INTENSITY: 4, VISUAL_DENSITY: 3 },
  reducedMotion: false,
  audio: { sfx: true, narration: null, music: null }, // narration: 'elevenlabs' to opt in (paid, after the audio gate)
  // Video Blueprint (skills/motion-skill/references/blueprint.md): main content (everything but sting and outro) and total length windows.
  blueprint: { coldOpen: true, sting: true, mainSeconds: [lengthSec - 15, lengthSec + 45], topicTolerance: 0.15 },
  acceptance: { minSeconds: lengthSec, maxSeconds: lengthSec + 60 },
};
writeFileSync(path.join(dir, 'project.json'), JSON.stringify(project, null, 2) + '\n');
writeFileSync(path.join(dir, 'claims.json'), '[]\n');
// The channel's intro (sting) and outro come from brand/brand.json (brand gate); fill the scenes between them.
const brandPath = path.join(root, 'brand/brand.json');
if (!existsSync(brandPath)) die('brand/brand.json is missing: see skills/motion-skill/references/brand.md');
const brand = JSON.parse(readFileSync(brandPath, 'utf8'));
if (!brand.intro?.template || !brand.outro?.template) die('brand/brand.json needs intro.template and outro.template');
const metaOf = async (tpl) => (await import(pathToFileURL(path.join(root, 'templates/scenes', `${tpl}.mjs`)).href)).meta;
const brandScene = async (id, tpl, music, props = {}) => {
  const d = (await metaOf(tpl)).duration;
  return { id, block: id, template: tpl, minDuration: d, lead: 0, tail: 0, music: music ?? null, brand: true, props, narration: '', anchors: [] };
};
const scenes = [await brandScene('sting', brand.intro.template, brand.intro.music), await brandScene('outro', brand.outro.template, brand.outro.music, { preview: false })];
writeFileSync(path.join(dir, 'storyboard.json'), JSON.stringify({ version: 1, slug, fps: 30, scenes, cuts: {} }, null, 2) + '\n');
writeFileSync(path.join(dir, 'roadmap.json'), JSON.stringify({
  thesis: '',
  topics: [{ id: 't1', title: '', promise: '', recap: '', budgetSec: 36, sourceAnchors: [], glossaryIntroduced: [] }],
}, null, 2) + '\n');
writeFileSync(path.join(dir, 'glossary.json'), '{}\n');
writeFileSync(path.join(dir, 'brief.md'), `# Brief: ${title}

- **Audience:**
- **Promise:**
- **Tone:** calm, concrete, no hype, no jargon before it is explained
- **Language:** ${lang}
- **Length / format:** ${Math.round(lengthSec / 60)} min / ${format}
- **Source:** ${source} (snapshot ${project.snapshotDate})
`);
writeFileSync(path.join(dir, 'script.md'), `# Script: ${title}

<!-- One sentence per line. End every sentence with its source anchor, e.g. [#the-core-idea].
     Scene breaks: a line "## <id> <title>" (ids match storyboard "say"), then "> on-screen:" and "> visual:".
     [#transition] for bridges, [#meta] only in cold open, intro, takeaways and outro.
     Follow the Video Blueprint (references/blueprint.md). Narration runs about 150 words per minute. -->
`);
writeFileSync(path.join(dir, 'README.md'), `# ${title}

Project created by \`npm run new\`. Next steps are in \`skills/motion-skill/references/workflow.md\`.
`);

console.log(`✓ projects/${slug} created
  source: ${kind}${stats.words ? `, ${stats.words} words` : ''}, ${Object.keys(anchors).length} anchors${stats.svgs != null ? `, ${stats.svgs} inline figures` : ''}
  brand:  sting ${brand.intro.template}, outro ${brand.outro.template} (brand/brand.json)
  next:   write brief.md and claims.json (skill step 2), then roadmap.json and glossary.json (Blueprint), or run /motion-skill ${slug}`);

function parseLength(s) {
  const m = String(s).match(/^(\d+(?:\.\d+)?)(s|m)?$/);
  if (!m) die('--length like 5m, 90s or 300');
  return Math.round(Number(m[1]) * (m[2] === 'm' ? 60 : 1));
}

// Markdown/MDX source: keep text, derive GitHub-style heading ids (deduped with -1, -2, …).
function writeMarkdownSource(md) {
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  const seen = new Map();
  const anchorsOut = {};
  const out = body.replace(/^(#{2,3}) (.+)$/gm, (line, hashes, text) => {
    const clean = text.replace(/\{#.*\}$/, '').replace(/[*_`]/g, '').trim();
    let id = clean.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n) id = `${id}-${n}`;
    anchorsOut[id] = clean;
    return `${hashes} ${clean} {#${id}}`;
  });
  const fm = md.match(/^---\n[\s\S]*?\ntitle:\s*["']?(.+?)["']?\n/);
  writeFileSync(path.join(src, 'article.md'), (fm && !/^# /m.test(out) ? `# ${fm[1]}\n\n` : '') + out);
  writeFileSync(path.join(src, 'anchors.json'), JSON.stringify(anchorsOut, null, 2) + '\n');
}
