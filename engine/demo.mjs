#!/usr/bin/env node
// End-to-end smoke test: render the 5 s synthetic demo, mux silence, run QA.
import path from 'node:path';
import { ROOT, renderVideo } from './render.mjs';
import { finalize } from './encode.mjs';
import { check } from './check.mjs';

const dir = path.join(ROOT, 'engine/demo');
const { log } = await renderVideo(dir, {});
const out = await finalize(dir, {});
const { pass, summary, sheet } = await check(dir, {});
console.log(summary);
console.log(`\n✓ ${path.relative(ROOT, out)} (${log.videoSeconds}s, render ${log.seconds}s)\ncontact sheet: ${path.relative(ROOT, sheet)}`);
process.exit(pass ? 0 : 1);
