// Archify integration: normalisation of Archify layout JSON, the diagram:layout CLI (with a fake
// archify binary, so Archify itself is not needed), and deterministic rendering of archify-diagram.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { normalizeArchify, focusLayout, polylineLength } from '../archify.mjs';
import { ROOT, openProject, frame } from '../render.mjs';
import * as overflow from '../qa/overflow.mjs';
import * as overlap from '../qa/overlap.mjs';
import * as safeArea from '../qa/safe-area.mjs';

const FIX = path.join(ROOT, 'engine/test/fixtures/archify');
const json = (f) => JSON.parse(readFileSync(f, 'utf8'));
const rawArch = () => json(path.join(FIX, 'raw-architecture.json'));
const SAMPLE = path.join(ROOT, 'examples/archify/production-deployment.layout.json');

test('architecture: normalised layout has nodes, boundaries, routed edges and labels', () => {
  const L = normalizeArchify(rawArch());
  assert.equal(L.version, 1);
  assert.deepEqual(L.source, { tool: 'archify', type: 'architecture' });
  assert.deepEqual(L.viewBox, { w: 1376, h: 790 });
  assert.equal(L.nodes.length, 12);
  assert.deepEqual(L.nodes[0], { id: 'clients', label: 'Customers', x: 38, y: 300, w: 122, h: 60, type: 'external', rank: 0 });
  assert.equal(L.boundaries.length, 4);
  assert.deepEqual(L.boundaries[0].wraps.slice(0, 2), ['edge', 'gateway']);
  assert.equal(L.edges.length, 12);
  for (const e of L.edges) {
    assert.ok(e.points.length >= 2);
    assert.ok(Math.abs(e.length - polylineLength(e.points)) < 0.01);
  }
  const vpc = L.edges.find((e) => e.from === 'gateway' && e.to === 'api_a');
  assert.deepEqual(vpc.points, [[558, 330], [594, 330], [594, 226], [630, 226]]);
  assert.deepEqual(vpc.labelAt, [594, 275]);
  assert.deepEqual(L.edges.map((e) => e.step).sort((a, b) => a - b), [...Array(12).keys()]);
  assert.ok(L.labels.some((l) => l.text === 'cross-region WAL'));
  // Reveal order follows the graph: an edge's source never ranks after its target unless it closes a cycle.
  const rank = new Map(L.nodes.map((n) => [n.id, n.rank]));
  assert.equal(rank.get('edge'), 1);
  assert.equal(rank.get('gateway'), 2);
});

test('normalisation is deterministic and matches the committed sample layout', () => {
  const a = JSON.stringify(normalizeArchify(rawArch()));
  const b = JSON.stringify(normalizeArchify(rawArch()));
  assert.equal(a, b);
  assert.deepEqual(JSON.parse(a), json(SAMPLE), 'examples/archify/production-deployment.layout.json is stale: regenerate it with npm run diagram:layout -- --raw …');
});

test('workflow: labels, sublabels and lanes come from the spec', () => {
  const L = normalizeArchify(json(path.join(FIX, 'raw-workflow.json')), json(path.join(FIX, 'spec-workflow.json')), { specName: 'spec-workflow.json' });
  assert.equal(L.source.type, 'workflow');
  assert.equal(L.source.spec, 'spec-workflow.json');
  assert.deepEqual(L.nodes.map((n) => [n.label, n.lane, n.rank]), [['Draft', 'author', 0], ['Review', 'reviewer', 1], ['Publish', 'author', 2]]);
  assert.equal(L.nodes[0].sublabel, 'write it');
  assert.deepEqual(L.boundaries.map((b) => [b.kind, b.label, b.wraps.join(',')]), [['lane', 'Author', 'draft,publish'], ['lane', 'Reviewer', 'review']]);
  assert.equal(L.edges[1].label, 'approve');
  assert.equal(L.edges[0].id, 'draft->review#0');
});

test('invalid layouts are rejected with a clear message', () => {
  const bad = rawArch();
  bad.connections[0].to = 'nowhere';
  assert.throws(() => normalizeArchify(bad), /unknown node/);
  const short = rawArch();
  short.connections[0].points = [[0, 0]];
  assert.throws(() => normalizeArchify(short), /fewer than 2 points/);
  assert.throws(() => normalizeArchify({ ok: false, error: { message: 'schema' } }), /ok:false/);
  const nan = rawArch();
  nan.components[0].x = 'left';
  assert.throws(() => normalizeArchify(nan), /finite number/);
});

test('focusLayout keeps the chosen nodes, their edges, and re-fits boundaries', () => {
  const L = normalizeArchify(rawArch());
  const F = focusLayout(L, ['clients', 'edge', 'gateway']);
  assert.deepEqual(F.nodes.map((n) => n.id), ['clients', 'edge', 'gateway']);
  assert.deepEqual(F.edges.map((e) => `${e.from}>${e.to}`), ['clients>edge', 'edge>gateway']);
  assert.equal(F.boundaries.length, 1);
  const region = F.boundaries[0];
  assert.deepEqual(region.wraps, ['edge', 'gateway']);
  assert.equal(region.x, 210); // same left padding as the original (edge.x 230 − 20)
  assert.ok(region.x + region.w < 600, 'boundary shrinks to the focused nodes');
  assert.equal(focusLayout(L, null), L);
});

test('diagram:layout runs archify offline via ARCHIFY_BIN and normalises the result', () => {
  const out = path.join(mkdtempSync(path.join(tmpdir(), 'archify-')), 'layout.json');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/diagram-layout.mjs'), path.join(FIX, 'spec-workflow.json'), '--out', out], {
    encoding: 'utf8', env: { ...process.env, ARCHIFY_BIN: path.join(FIX, 'fake-archify.mjs') },
  });
  assert.equal(r.status, 0, r.stderr);
  const L = json(out);
  assert.equal(L.source.type, 'workflow');
  assert.deepEqual(L.nodes.map((n) => n.label), ['Draft', 'Review', 'Publish']);
  const missing = spawnSync(process.execPath, [path.join(ROOT, 'scripts/diagram-layout.mjs'), path.join(FIX, 'spec-workflow.json'), '--out', out], {
    encoding: 'utf8', env: { ...process.env, ARCHIFY_BIN: path.join(FIX, 'no-such-archify.mjs') },
  });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /does not exist/);
  const env = { ...process.env };
  delete env.ARCHIFY_BIN;
  const unset = spawnSync(process.execPath, [path.join(ROOT, 'scripts/diagram-layout.mjs'), path.join(FIX, 'spec-workflow.json'), '--out', out], { encoding: 'utf8', env });
  assert.notEqual(unset.status, 0, 'no ARCHIFY_BIN must fail (no npx fallback)');
  assert.match(unset.stderr, /ARCHIFY_BIN is not set/);
});

test('archify-diagram renders deterministically and passes text QA', async () => {
  const dir = path.join(ROOT, 'engine/test/fixtures/archify-scene');
  const frames = [10, 40, 90, 150, 209, 215, 260, 330, 389];
  const hashes = [];
  let manifests = [];
  for (const order of [frames, [...frames].reverse()]) {
    const p = await openProject(dir, { workers: 1 });
    const h = new Map();
    for (const f of order) {
      const r = await frame(p.pages[0], f, { png: false });
      if (order === frames) manifests.push(r.manifest);
      h.set(f, await p.pages[0].evaluate(() => window.pixelHash()));
    }
    hashes.push(h);
    if (order === frames) {
      // Same session, same frame after other frames: still the same pixels (no hidden state).
      await p.pages[0].evaluate(() => window.render(150));
      assert.equal(await p.pages[0].evaluate(() => window.pixelHash()), h.get(150));
    }
    await p.close();
  }
  for (const f of frames) assert.equal(hashes[0].get(f), hashes[1].get(f), `frame ${f} differs between sessions`);
  assert.notEqual(hashes[0].get(150), hashes[0].get(209), 'the comet moves');
  const texts = manifests.flatMap((m) => m.texts.map((t) => t.text));
  assert.ok(texts.includes('Customers') && texts.includes('PostgreSQL'));
  const info = { fps: 30 };
  const focused = manifests.filter((m) => m.scene === 'a02');
  for (const c of [overflow, overlap, safeArea]) {
    const r = await c.check({ manifests: focused, info: { ...info, safe: { x: 96, y: 54, w: 1728, h: 972 } } });
    assert.equal(r.pass, true, `${r.name}: ${JSON.stringify(r.failures.slice(0, 3))}`);
  }
});
