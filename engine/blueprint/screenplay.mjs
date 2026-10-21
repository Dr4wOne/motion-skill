#!/usr/bin/env node
// screenplay.md from storyboard.json + script.md: one entry per scene, block/topic/time, narration,
// on-screen text, visual, audio cues, source anchors.   node engine/blueprint/screenplay.mjs <slug>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timed, mmss } from './model.mjs';
import { parseScript } from '../../scripts/lib/script.mjs';

export function buildScreenplay(board, roadmap, script) {
  const topicIdx = Object.fromEntries((roadmap?.topics || []).map((t, i) => [t.id, i + 1]));
  const n = roadmap?.topics?.length || 0;
  const lines = [`# Screenplay: ${board.slug}`, '', `Thesis: ${roadmap?.thesis || ''}`, ''];
  timed(board).forEach((s, i) => {
    const part = script.scenes.find((x) => x.id === s.say?.split(':')[0]);
    const where = s.block === 'topic' ? `TOPIC ${topicIdx[s.topic]}/${n}${s.part ? ` (${s.part})` : ''}` : s.block.toUpperCase();
    const audio = [s.block === 'sting' || s.block === 'outro' ? 'sonic logo' : null, s.music ? `music: ${s.music}` : null, i > 0 ? 'transition swell' : null, s.props?.beats?.length ? `${s.props.beats.length} reveal ticks` : null].filter(Boolean).join('; ');
    lines.push(`## SCENE ${String(i + 1).padStart(2, '0')} · ${where} · ${mmss(s.start)}-${mmss(s.end)} · ${s.id}`, '',
      `- **NARRATION:** ${s.narration || '(none)'}`,
      `- **ON SCREEN:** ${part?.onscreen || s.onscreen || '(see visual)'}`,
      `- **VISUAL:** ${part?.visual || s.template}`,
      `- **AUDIO:** ${audio || 'none'}`,
      `- **SOURCE:** ${(s.anchors || []).map((a) => `#${a}`).join(' ') || '(production metadata)'}`, '');
  });
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = (await import('../render.mjs')).resolveProject(process.argv[2]);
  const board = JSON.parse(readFileSync(path.join(dir, 'storyboard.json'), 'utf8'));
  const roadmap = existsSync(path.join(dir, 'roadmap.json')) ? JSON.parse(readFileSync(path.join(dir, 'roadmap.json'), 'utf8')) : null;
  const script = parseScript(readFileSync(path.join(dir, 'script.md'), 'utf8'));
  writeFileSync(path.join(dir, 'screenplay.md'), buildScreenplay(board, roadmap, script));
  console.log(`✓ screenplay.md: ${board.scenes.length} scenes`);
}
