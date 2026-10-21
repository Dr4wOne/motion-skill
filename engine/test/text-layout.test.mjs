import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapGreedy, wrapBalanced, fitText, REF_PX } from '../text-layout.mjs';

// Fake monospace font: every character is 0.5 em wide.
const measure = (s) => s.length * 0.5 * REF_PX;

test('greedy wrap respects width', () => {
  const lines = wrapGreedy('aaaa bbbb cccc dddd'.split(' '), 100, measure, 20); // 10 chars per line
  assert.deepEqual(lines, ['aaaa bbbb', 'cccc dddd']);
});

test('balanced wrap avoids an orphan last word', () => {
  const text = 'one two three four five six seven';
  const greedy = wrapGreedy(text.split(' '), 300, measure, 20); // 30 chars: one line except "seven"? no
  const bal = wrapBalanced(text, 200, measure, 20); // 20 chars per line
  assert.equal(bal.length, 2);
  assert.ok(bal.every((l) => l.includes(' ')), `lines: ${JSON.stringify(bal)}`);
  assert.ok(greedy.length >= 1);
});

test('explicit newlines are kept', () => {
  assert.deepEqual(wrapBalanced('a b\nc d', 1000, measure, 20), ['a b', 'c d']);
});

test('fitText shrinks until it fits', () => {
  const r = fitText('a long headline that must shrink', { maxWidth: 400, maxHeight: 100, maxPx: 80, minPx: 20, measure });
  assert.equal(r.fits, true);
  assert.ok(r.px < 80 && r.px >= 20);
  assert.ok(r.width <= 400 && r.height <= 100);
});

test('fitText reports fits:false at the floor', () => {
  const r = fitText('x'.repeat(200), { maxWidth: 100, maxHeight: 40, maxPx: 60, minPx: 36, measure });
  assert.equal(r.fits, false);
  assert.equal(r.px, 36);
});

test('orphan flag', () => {
  const r = fitText('aaa aaaa b', { maxWidth: 90, maxHeight: 1000, maxPx: 20, minPx: 20, measure, balance: false });
  assert.equal(r.orphan, true);
});

test('two stacked single words are not an orphan; fitText prefers a size without one', () => {
  const r = fitText('Instruction tuning', { maxWidth: 120, maxHeight: 1000, maxPx: 20, minPx: 20, measure });
  assert.equal(r.lines.length, 2);
  assert.equal(r.orphan, false);
  const s = fitText('aaaa bbbb cccc dd', { maxWidth: 140, maxHeight: 1000, maxPx: 20, minPx: 16, measure });
  assert.equal(s.orphan, false);
});
