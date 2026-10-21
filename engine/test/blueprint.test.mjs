// Blueprint linter: the fixture passes; each planted violation is caught by its rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { lint } from '../blueprint/lint.mjs';
import { buildChapters } from '../blueprint/chapters.mjs';

const FIX = path.join(import.meta.dirname, 'fixtures/blueprint-ok');

function mutate(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), 'bp-'));
  cpSync(FIX, dir, { recursive: true });
  const j = (f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
  const w = (f, v) => writeFileSync(path.join(dir, f), JSON.stringify(v));
  fn({ j, w, dir });
  return lint(dir);
}
const rules = (r) => new Set(r.errors.map((e) => e.rule));

test('fixture passes', () => {
  const r = lint(FIX);
  assert.deepEqual(r.errors, []);
  assert.equal(r.stats.topics, 3);
});

test('chapters start at 00:00 and group blocks', () => {
  const b = JSON.parse(readFileSync(path.join(FIX, 'storyboard.json'), 'utf8'));
  const ch = buildChapters(b, JSON.parse(readFileSync(path.join(FIX, 'roadmap.json'), 'utf8')));
  assert.equal(ch[0].start, 0);
  assert.deepEqual(ch.map((c) => c.name), ['Intro', 'Overview and roadmap', '1. Input', '2. Gears', '3. Output', 'The full picture', 'Takeaways']);
});

test('block order violation', () => {
  const r = mutate(({ j, w }) => { const b = j('storyboard.json'); [b.scenes[3], b.scenes[4]] = [b.scenes[4], b.scenes[3]]; w('storyboard.json', b); });
  assert.ok(rules(r).has('blocks'));
});

test('term used before it is introduced', () => {
  const r = mutate(({ j, w }) => { const b = j('storyboard.json'); b.scenes[5].narration = 'A widget with a gear takes something in.'; w('storyboard.json', b); });
  assert.ok(r.errors.some((e) => e.rule === 'glossary' && /gear/.test(e.msg)));
});

test('preview blocks may name terms early', () => {
  const r = mutate(({ j, w }) => { const b = j('storyboard.json'); b.scenes[3].narration = 'A widget uses a gear to turn input into output.'; w('storyboard.json', b); });
  assert.deepEqual(r.errors, []);
});

test('recap too long, not on screen, budget off, too few topics, missing roadmap scene', () => {
  assert.ok(rules(mutate(({ j, w }) => { const m = j('roadmap.json'); m.topics[0].recap = 'one two three four five six seven eight nine ten eleven twelve thirteen'; w('roadmap.json', m); })).has('recap'));
  assert.ok(rules(mutate(({ j, w }) => { const b = j('storyboard.json'); b.scenes[6].props.text = 'Something else.'; w('storyboard.json', b); })).has('recap'));
  assert.ok(rules(mutate(({ j, w }) => { const b = j('storyboard.json'); b.scenes[5].duration = 60; w('storyboard.json', b); })).has('budget'));
  assert.ok(rules(mutate(({ j, w }) => { const m = j('roadmap.json'); m.topics = m.topics.slice(0, 2); w('roadmap.json', m); })).has('topics'));
  assert.ok(rules(mutate(({ j, w }) => { const b = j('storyboard.json'); b.scenes[4].template = 'big-idea'; w('storyboard.json', b); })).has('roadmap'));
});

test('[#meta] outside channel blocks and unknown anchors are errors', () => {
  const r = mutate(({ dir }) => { const f = path.join(dir, 'script.md'); writeFileSync(f, readFileSync(f, 'utf8').replace('A gear moves it. [#b]', 'A gear moves it. [#meta]').replace('Then it comes out. [#c]', 'Then it comes out. [#zzz]')); });
  assert.ok(r.errors.some((e) => e.rule === 'anchors' && /meta/.test(e.msg)));
  assert.ok(r.errors.some((e) => e.rule === 'anchors' && /zzz/.test(e.msg)));
});
