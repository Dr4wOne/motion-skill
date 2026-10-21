import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseMidi } from '../audio/midi.mjs';
import { sonicLogo } from '../audio/sonic-logo.mjs';
import { SR } from '../audio/synth.mjs';

const hash = (f) => createHash('sha256').update(Buffer.from(f.buffer)).digest('hex');

test('sonic logo: deterministic and ≤ 1.5 s', () => {
  const a = sonicLogo(), b = sonicLogo();
  assert.equal(hash(a.L), hash(b.L));
  assert.ok(a.L.length / SR <= 1.5 + 1e-9);
});

test('MIDI parser: tempo map and note durations', () => {
  // format 0, 480 ticks/quarter; tempo 1,000,000 µs/quarter (60 bpm); C4 for 1 quarter, then E4 (running status) for 2.
  const trk = [0x00, 0xff, 0x51, 0x03, 0x0f, 0x42, 0x40, 0x00, 0x90, 60, 100, 0x83, 0x60, 0x80, 60, 0, 0x00, 0x90, 64, 90, 0x87, 0x40, 64, 0, 0x00, 0xff, 0x2f, 0x00];
  const buf = Uint8Array.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, trk.length, ...trk]);
  const notes = parseMidi(buf);
  assert.equal(notes.length, 2);
  assert.deepEqual(notes.map((n) => n.midi), [60, 64]);
  assert.ok(Math.abs(notes[0].dur - 1) < 1e-6 && Math.abs(notes[1].t - 1) < 1e-6 && Math.abs(notes[1].dur - 2) < 1e-6);
});

import { deltaE2000, deltaE2000Lab } from '../qa/palette.mjs';
test('CIEDE2000 matches Sharma, Wu & Dalal (2005) test data', () => {
  // pairs 1, 7 and 17 of the published table
  assert.ok(Math.abs(deltaE2000Lab([50, 2.6772, -79.7751], [50, 0, -82.7485]) - 2.0425) < 1e-4);
  assert.ok(Math.abs(deltaE2000Lab([50, 0, 0], [50, -1, 2]) - 2.3669) < 1e-4);
  assert.ok(Math.abs(deltaE2000Lab([50, 2.5, 0], [73, 25, -18]) - 27.1492) < 1e-4);
  assert.equal(deltaE2000('#40D0F0', '#40D0F0'), 0);
  assert.ok(Math.abs(deltaE2000('#000000', '#FFFFFF') - 100) < 1e-3);
});
