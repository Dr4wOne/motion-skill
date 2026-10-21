// Integration: QA must pass the clean demo and flag every planted defect in the broken fixture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { ROOT, openProject, frame } from '../render.mjs';
import * as overflow from '../qa/overflow.mjs';
import * as safeArea from '../qa/safe-area.mjs';
import * as contrast from '../qa/contrast.mjs';
import * as determinism from '../qa/determinism.mjs';

async function manifestsOf(dir) {
  const p = await openProject(dir, { workers: 1 });
  const ms = [];
  for (let f = 0; f < p.info.frames; f++) ms.push((await frame(p.pages[0], f, { png: false })).manifest);
  await p.close();
  return { info: p.info, manifests: ms };
}

test('determinism: same frame, two sessions → same pixels (demo)', async () => {
  const dir = path.join(ROOT, 'engine/demo');
  const { info } = await manifestsOf(dir);
  const r = await determinism.check({ dir, info });
  assert.equal(r.pass, true, JSON.stringify(r.failures));
  assert.ok(r.metrics.framesCompared >= 6);
});

test('QA flags overflow, contrast, safe-area and Math.random in the broken fixture', async () => {
  const dir = path.join(ROOT, 'engine/test/fixtures/broken');
  const { info, manifests } = await manifestsOf(dir);
  const ctx = { dir, info, manifests, samples: [] };
  const o = await overflow.check(ctx), s = await safeArea.check(ctx), c = await contrast.check(ctx), d = await determinism.check(ctx);
  assert.equal(o.pass, false, 'overflow not flagged');
  assert.ok(o.failures.some((f) => /does not fit/.test(f.msg)));
  assert.equal(s.pass, false, 'safe-area not flagged');
  assert.ok(s.failures.some((f) => /Edge/.test(f.msg)));
  assert.equal(c.pass, false, 'contrast not flagged');
  assert.ok(c.failures.some((f) => /Low contrast/.test(f.msg)));
  assert.equal(d.pass, false, 'non-determinism not flagged');
  assert.ok(d.failures.every((f) => f.frame >= 45), 'only the random scene should differ');
});
