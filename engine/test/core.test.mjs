import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, seedFrom, hashRandom } from '../prng.mjs';
import * as E from '../ease.mjs';
import { progress, tween, inOut, mixHex } from '../tween.mjs';
import { buildTimeline, locateFrame, locateTime } from '../timeline.mjs';
import { safeRect, minTextPx, inside } from '../safe-area.mjs';

test('prng is deterministic and in [0,1)', () => {
  const a = mulberry32(42), b = mulberry32(42);
  const xs = Array.from({ length: 1000 }, () => a());
  assert.deepEqual(xs, Array.from({ length: 1000 }, () => b()));
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  assert.ok(Math.abs(mean - 0.5) < 0.05);
  assert.notDeepEqual(xs.slice(0, 5), Array.from({ length: 5 }, mulberry32(43)));
});

test('seedFrom and hashRandom are stable', () => {
  assert.equal(seedFrom('s01'), seedFrom('s01'));
  assert.notEqual(seedFrom('s01'), seedFrom('s02'));
  assert.equal(hashRandom(7, 3), hashRandom(7, 3));
});

test('easings hit endpoints', () => {
  for (const [name, f] of Object.entries(E)) {
    if (typeof f !== 'function' || ['clamp01', 'cubicBezier'].includes(name)) continue;
    assert.ok(Math.abs(f(0)) < 1e-6, `${name}(0)`);
    assert.ok(Math.abs(f(1) - 1) < 1e-6, `${name}(1)`);
  }
  const css = E.cubicBezier(0.25, 0.1, 0.25, 1); // CSS "ease"
  assert.ok(Math.abs(css(0.5) - 0.8024) < 0.002);
  assert.ok(E.house(0.5) > 0.85);
});

test('tween helpers', () => {
  assert.equal(progress(0.5, 0, 1), 0.5);
  assert.equal(progress(-1, 0, 1), 0);
  assert.equal(tween(2, 1, 2, 10, 20), 15);
  assert.equal(inOut(5, 0, 10, 1), 1);
  assert.equal(inOut(9.5, 0, 10, 1), 0.5);
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
});

test('timeline maps frames to scenes', () => {
  const tl = buildTimeline([{ id: 'a', duration: 1 }, { id: 'b', duration: 2.5 }], 30);
  assert.equal(tl.frames, 105);
  assert.equal(tl.duration, 3.5);
  assert.equal(locateFrame(tl, 0).scene.id, 'a');
  assert.equal(locateFrame(tl, 29).scene.id, 'a');
  const f30 = locateFrame(tl, 30);
  assert.equal(f30.scene.id, 'b');
  assert.equal(f30.localT, 0);
  assert.equal(locateTime(tl, 3.49).scene.id, 'b');
  assert.equal(locateFrame(tl, 105), null);
  assert.throws(() => buildTimeline([{ id: 'a', duration: 1 }, { id: 'a', duration: 1 }], 30));
});

test('safe area', () => {
  assert.deepEqual(safeRect('16:9', 1920, 1080), { x: 96, y: 54, w: 1728, h: 972 });
  const v = safeRect('9:16', 1080, 1920);
  assert.equal(v.y, 269);
  assert.equal(v.y + v.h, 1248);
  assert.equal(minTextPx(1920, 1080), 36);
  assert.equal(minTextPx(1280, 720), 24);
  assert.ok(inside({ x: 100, y: 60, w: 10, h: 10 }, safeRect('16:9', 1920, 1080)));
  assert.ok(!inside({ x: 0, y: 60, w: 10, h: 10 }, safeRect('16:9', 1920, 1080)));
});
