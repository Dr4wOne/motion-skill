#!/usr/bin/env node
// YouTube chapters from the storyboard: one chapter per Blueprint block group, topics by title.
//   node engine/blueprint/chapters.mjs <slug>   → projects/<slug>/chapters.txt
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timed, mmss } from './model.mjs';

const GROUP = { 'cold-open': 'Intro', sting: 'Intro', intro: 'Intro', overview: 'Overview and roadmap', roadmap: 'Overview and roadmap', 'full-picture': 'The full picture', takeaways: 'Takeaways', outro: 'Takeaways' };

export function buildChapters(board, roadmap) {
  const titles = Object.fromEntries((roadmap?.topics || []).map((t, i) => [t.id, `${i + 1}. ${t.title}`]));
  const out = [];
  for (const s of timed(board)) {
    const name = s.block === 'topic' ? titles[s.topic] || s.topic : GROUP[s.block] || 'Intro';
    if (!out.length || out[out.length - 1].name !== name) out.push({ name, start: s.start });
  }
  out[0].start = 0;
  const total = board.scenes.reduce((a, s) => a + (s.duration || 0), 0);
  return out.map((c, i) => ({ ...c, end: out[i + 1]?.start ?? total }));
}

export const formatChapters = (ch) => ch.map((c) => `${mmss(c.start)} ${c.name}`).join('\n') + '\n';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = (await import('../render.mjs')).resolveProject(process.argv[2]);
  const board = JSON.parse(readFileSync(path.join(dir, 'storyboard.json'), 'utf8'));
  const roadmap = JSON.parse(readFileSync(path.join(dir, 'roadmap.json'), 'utf8'));
  const ch = buildChapters(board, roadmap);
  writeFileSync(path.join(dir, 'chapters.txt'), formatChapters(ch));
  console.log(`✓ chapters.txt: ${ch.length} chapters`);
}
