#!/usr/bin/env node
// Archify as an offline layout engine: spec → normalised layout JSON for the `archify-diagram` template.
//   npm run diagram:layout -- <archify-spec.json> --out <layout.json> [--type architecture|workflow]
//   npm run diagram:layout -- --raw <archify-layout-output.json> [--spec <spec.json>] --out <layout.json>
// Archify (github.com/tt-a1i/archify, MIT) is an optional dependency you install yourself; nothing is
// downloaded here. ARCHIFY_BIN is required: the path to bin/archify.mjs in your Archify checkout (or an
// executable). There is deliberately no npx/npm fallback: an unrelated npm package could share the name.
// It runs with ARCHIFY_UPDATE_CHECK_DISABLED=1, so no network is used. Supported types: architecture (`inspect`) and workflow
// (`validate --layout-json`).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeArchify } from '../engine/archify.mjs';

const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

export function archifyCommand(env = process.env) {
  const bin = env.ARCHIFY_BIN;
  if (!bin) die('ARCHIFY_BIN is not set. Point it at bin/archify.mjs in your Archify checkout (see skills/motion-skill/references/archify.md). The committed sample layout renders without Archify.');
  if (!existsSync(bin)) die(`ARCHIFY_BIN=${bin} does not exist`);
  return /\.(mjs|cjs|js)$/.test(bin) ? [process.execPath, [bin]] : [bin, []];
}

export function argsFor(type, spec) {
  if (type === 'architecture') return ['inspect', 'architecture', spec];
  if (type === 'workflow') return ['validate', 'workflow', spec, '--layout-json'];
  throw new Error(`archify layout JSON is available for architecture and workflow diagrams only (got "${type}")`);
}

export function runArchify(type, spec, env = process.env) {
  const [cmd, pre] = archifyCommand(env);
  const r = spawnSync(cmd, [...pre, ...argsFor(type, spec)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...env, ARCHIFY_UPDATE_CHECK_DISABLED: '1', DO_NOT_TRACK: '1' },
  });
  if (r.error) die(`could not run ARCHIFY_BIN (${r.error.code || r.error.message}); see skills/motion-skill/references/archify.md`);
  const out = (r.stdout || '').trim();
  const start = out.indexOf('{');
  let json = null;
  try { json = start >= 0 ? JSON.parse(out.slice(start)) : null; } catch { json = null; }
  if (r.status !== 0 || !json || json.ok === false) {
    const why = json?.error || json?.diagnostics?.map((d) => d.message).join('\n') || r.stderr || out;
    die(`archify ${argsFor(type, '<spec>').join(' ')} failed (exit ${r.status}):\n${String(why).slice(0, 1200)}`);
  }
  return json;
}

function parse(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) { o[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i]; }
    else o._.push(argv[i]);
  }
  return o;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = parse(process.argv.slice(2));
  const specFile = a.spec || a._[0];
  if ((!specFile && !a.raw) || !a.out) die('usage: npm run diagram:layout -- <archify-spec.json> --out <layout.json>  (or --raw <archify-output.json> [--spec s.json] --out <layout.json>)');
  const spec = specFile ? JSON.parse(readFileSync(specFile, 'utf8')) : null;
  const type = a.type || spec?.diagram_type || 'architecture';
  const raw = a.raw ? JSON.parse(readFileSync(a.raw, 'utf8')) : runArchify(type, path.resolve(specFile));
  const layout = normalizeArchify(raw, spec, { specName: specFile ? path.basename(specFile) : undefined });
  mkdirSync(path.dirname(path.resolve(a.out)), { recursive: true });
  writeFileSync(a.out, JSON.stringify(layout, null, 2) + '\n');
  console.log(`✓ ${a.out}: ${layout.source.type}, ${layout.nodes.length} nodes, ${layout.boundaries.length} boundaries, ${layout.edges.length} edges (viewBox ${layout.viewBox.w}×${layout.viewBox.h})`);
}
