#!/usr/bin/env node
// Resolve a storyboard against the script and the narration timing.
//   npm run board -- <slug> [--wpm 150]
// For each scene: `say: "s02:0-2"` (script scene id : sentence range) → narration text + anchors.
// Timing: if audio/clips/<sceneId>.json exists (ElevenLabs alignment), speech duration and word times come
// from it; otherwise they are estimated from character counts at --wpm. duration = lead + speech + tail.
// `beatWords: [...]` → props.beats (scene-local seconds of each keyword). Writes storyboard.json (derived
// fields), captions/captions.json (cues + words, global seconds) and captions/<slug>.srt.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScript } from './lib/script.mjs';
import { buildCues, toSrt } from './lib/cues.mjs';
import { scenesFor } from './lib/cuts.mjs';

export function resolveBoard(dir, { wpm = 150 } = {}) {
  const boardFile = path.join(dir, 'storyboard.json');
  const board = JSON.parse(readFileSync(boardFile, 'utf8'));
  const script = parseScript(readFileSync(path.join(dir, 'script.md'), 'utf8'));
  const fps = board.fps || 30;
  const words = [];
  let t = 0;
  for (const sc of board.scenes) {
    const lead = sc.lead ?? 0.8, tail = sc.tail ?? 1.4;
    let sw = [];
    if (sc.say) {
      const [sid, range] = sc.say.split(':');
      const part = script.scenes.find((s) => s.id === sid);
      if (!part) throw new Error(`${sc.id}: script scene ${sid} not found`);
      const [a, b] = (range || `0-${part.sentences.length - 1}`).split('-').map(Number);
      const sentences = part.sentences.slice(a, (b ?? a) + 1);
      if (!sentences.length) throw new Error(`${sc.id}: no sentences for ${sc.say}`);
      sc.narration = sentences.map((s) => s.text).join(' ');
      sc.anchors = [...new Set(sentences.map((s) => s.anchor))];
      const clip = path.join(dir, 'audio/clips', `${sc.id}.json`);
      if (existsSync(clip)) {
        const al = JSON.parse(readFileSync(clip, 'utf8'));
        sw = al.words.map((w) => ({ ...w }));
        sc.speech = { source: 'elevenlabs', seconds: al.duration };
      } else {
        sw = estimateWords(sc.narration, wpm);
        sc.speech = { source: 'estimate', seconds: sw.length ? sw[sw.length - 1].end : 0, wpm };
      }
    } else {
      sc.narration = '';
      sc.anchors = [];
      sc.speech = { source: 'none', seconds: 0 };
    }
    const minDur = sc.minDuration ?? 0;
    const frames = Math.round(Math.max(minDur, lead + sc.speech.seconds + tail) * fps);
    sc.duration = frames / fps;
    sc.speechStart = lead;
    // Beats from keywords (first occurrence, in order).
    if (sc.beatWords) {
      let from = 0;
      sc.props = sc.props || {};
      sc.props.beats = sc.beatWords.map((kw) => {
        if (typeof kw === 'number') return kw;
        const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
        const i = sw.findIndex((w, j) => j >= from && norm(w.text) === norm(kw));
        if (i < 0) throw new Error(`${sc.id}: beat word "${kw}" not found in narration (after word ${from})`);
        from = i + 1;
        return +(lead + sw[i].start - 0.15).toFixed(3);
      });
    }
    for (const w of sw) words.push({ text: w.text, start: +(t + lead + w.start).toFixed(3), end: +(t + lead + w.end).toFixed(3), scene: sc.id });
    t += sc.duration;
  }
  board.totalSeconds = +t.toFixed(3);
  // Roadmap travels with the storyboard so the runtime can draw the tracker.
  if (existsSync(path.join(dir, 'roadmap.json'))) board.roadmap = JSON.parse(readFileSync(path.join(dir, 'roadmap.json'), 'utf8'));
  writeFileSync(boardFile, JSON.stringify(board, null, 2) + '\n');
  const cues = buildCues(words, board.scenes);
  // Caption-only edits (scene.captionEdits: [{ from, to }]): light condensation where speech outruns
  // 17 cps reading speed. The narration audio is unchanged; timing stays on the spoken words.
  for (const c of cues) for (const e of board.scenes.find((s) => s.id === c.scene)?.captionEdits || []) c.text = c.text.replace(e.from, e.to);
  mkdirSync(path.join(dir, 'captions'), { recursive: true });
  writeFileSync(path.join(dir, 'captions/captions.json'), JSON.stringify({ source: board.scenes.some((s) => s.speech?.source === 'elevenlabs') ? 'alignment' : 'estimate', cues, words }, null, 1) + '\n');
  writeFileSync(path.join(dir, 'captions', `${path.basename(dir)}.srt`), toSrt(cues));
  // Cuts: same words, shifted to each cut's timeline.
  const mainStart = new Map();
  let acc = 0;
  for (const s of board.scenes) { mainStart.set(s.id, acc); acc += s.duration; }
  for (const cut of Object.keys(board.cuts || {})) {
    const scenes = scenesFor(board, cut);
    let ct = 0;
    const cw = [];
    for (const s of scenes) {
      const shift = ct - mainStart.get(s.id);
      for (const w of words) if (w.scene === s.id && w.end - mainStart.get(s.id) <= s.duration) cw.push({ ...w, start: +(w.start + shift).toFixed(3), end: +(w.end + shift).toFixed(3) });
      ct += s.duration;
    }
    const cc = buildCues(cw, scenes);
    for (const c of cc) for (const e of scenes.find((s) => s.id === c.scene)?.captionEdits || []) c.text = c.text.replace(e.from, e.to); // same caption-only edits as the main cut
    writeFileSync(path.join(dir, `captions/captions.${cut}.json`), JSON.stringify({ cut, cues: cc, words: cw }, null, 1) + '\n');
    writeFileSync(path.join(dir, 'captions', `${path.basename(dir)}.${cut}.srt`), toSrt(cc));
  }
  return { board, cues, words };
}

// Estimated word timings: time proportional to characters (incl. a pause after sentence ends).
export function estimateWords(text, wpm) {
  const toks = text.split(/\s+/).filter(Boolean);
  const weights = toks.map((w) => w.length + 1 + (/[.!?]$/.test(w) ? 6 : /[,;:]$/.test(w) ? 3 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  const seconds = (toks.length / wpm) * 60;
  let acc = 0;
  return toks.map((w, i) => {
    const start = (acc / total) * seconds;
    acc += weights[i];
    const end = ((acc - (/[.!?]$/.test(w) ? 6 : /[,;:]$/.test(w) ? 3 : 0)) / total) * seconds;
    return { text: w, start: +start.toFixed(3), end: +end.toFixed(3) };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  const wpm = Number(args[args.indexOf('--wpm') + 1]) || 150;
  const dir = (await import('../engine/render.mjs')).resolveProject(slug);
  const { board, cues } = resolveBoard(dir, { wpm });
  const m = Math.floor(board.totalSeconds / 60), s = (board.totalSeconds % 60).toFixed(1);
  console.log(`✓ ${board.scenes.length} scenes, ${m}:${s.padStart(4, '0')} total, ${cues.length} caption cues (${board.scenes.every((x) => x.speech?.source !== 'estimate') ? 'from narration timing' : 'estimated timing'})`);
}
