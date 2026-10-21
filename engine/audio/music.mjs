#!/usr/bin/env node
// Music cues synthesised in code from public-domain scores (route 1). Deterministic.
//   node engine/audio/music.mjs            → assets/music/<cue>.flac + PROVENANCE.md entries (reviewer: PENDING)
// Each cue: excerpt [from, to) seconds of the source MIDI (score time), time-stretched by `speed`, optional
// `final` excerpt appended (the cadence), fade-out, normalised to −18 LUFS integrated.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMidi } from './midi.mjs';
import { renderNotes, fade, SR } from './synth.mjs';
import { writeWav } from './wav.mjs';
import { ROOT, run } from '../render.mjs';

// Scores and cues come from assets/music/cues.json (none ship with this repo). Format:
// { "checked": "YYYY-MM-DD",
//   "scores": { "<key>": { "file": "assets/music/scores/<x>.mid", "composition": "...", "composer": "... (years)", "page": "<URL of the score page showing its licence>" } },
//   "cues": [ { "id": "intro-satie", "use": "starter intro", "score": "<key>", "from": 0, "to": 6, "speed": 1, "fadeOut": 1.5, "excerpt": "bars 1-2", "final": [136, 140] } ] }
// Only add a score after checking on its page that both the composition and the score file are public domain.
const CUES_FILE = path.join(ROOT, 'assets/music/cues.json');
const CFG = existsSync(CUES_FILE) ? JSON.parse(readFileSync(CUES_FILE, 'utf8')) : { scores: {}, cues: [] };
export const SCORES = CFG.scores || {};
export const CUES = CFG.cues || [];
const CHECKED = CFG.checked || 'unknown';

function excerpt(notes, from, to, offset = 0) {
  return notes.filter((n) => n.t >= from - 1e-6 && n.t < to - 1e-6).map((n) => ({ ...n, t: n.t - from + offset, dur: Math.min(n.dur, to - n.t + 1.5) }));
}

export async function buildCue(cue) {
  const sc = SCORES[cue.score];
  const notes = parseMidi(readFileSync(path.join(ROOT, sc.file)));
  let seq = excerpt(notes, cue.from, cue.to);
  let len = cue.to - cue.from;
  if (cue.final) { seq = seq.concat(excerpt(notes, cue.final[0], cue.final[1], len)); len += cue.final[1] - cue.final[0]; }
  seq = seq.map((n) => ({ ...n, t: n.t / cue.speed, dur: n.dur / cue.speed }));
  const seconds = len / cue.speed + 1.2; // tail for the last chord / reverb
  const audio = fade(renderNotes(seq, { seconds, timbre: 'piano', gain: 0.18, reverb: 0.24 }), 0.005, cue.fadeOut);
  const tmp = path.join(ROOT, '.cache', `${cue.id}.wav`);
  writeWav(tmp, [audio.L, audio.R], SR);
  const out = path.join(ROOT, 'assets/music', `${cue.id}.flac`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', 'loudnorm=I=-18:TP=-3:LRA=11', '-ar', '48000', '-sample_fmt', 's16', '-c:a', 'flac', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', out]);
  return { file: path.relative(ROOT, out), seconds: +seconds.toFixed(2), notes: seq.length };
}

const sha = (f) => createHash('sha256').update(readFileSync(path.join(ROOT, f))).digest('hex');

export function provenanceBlocks(results) {
  const prov = path.join(ROOT, 'assets/music/PROVENANCE.md');
  const prev = existsSync(prov) ? readFileSync(prov, 'utf8') : '';
  const reviewerOf = (file) => { const m = prev.match(new RegExp(`- file: ${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?- reviewer: (.*)`)); return m ? m[1].trim() : 'PENDING'; };
  const keep = (file, h) => (prev.includes(`- sha256: ${h}`) ? reviewerOf(file) : 'PENDING'); // re-review if the file changed
  const lines = ['# Music provenance', '', 'Process record, not legal advice. Route 1 = synthesised in code from a public-domain score (no recording used). Checked by `node engine/qa/music-provenance.mjs`.', ''];
  for (const [key, s] of Object.entries(SCORES)) {
    const h = sha(s.file);
    lines.push(`## score: ${key}`, `- file: ${s.file}`, `- sha256: ${h}`, `- use: source score for cues ${CUES.filter((c) => c.score === key).map((c) => c.id).join(', ')}`, `- composition: ${s.composition}`, `- composer: ${s.composer}`,
      `- score source: ${s.page} · licence: Public Domain (verify on the page) · checked ${CHECKED}`, '- route: 1', '- performer/synth: n/a (MIDI score file)', '- recording source: n/a (score, not a recording)',
      '- excerpt: whole file (excerpts chosen per cue)', '- modifications: none', '- attribution: not required (Public Domain); credit the score source as a courtesy', '- author: lead engineer (downloaded)', `- reviewer: ${keep(s.file, h)}`, '');
  }
  for (const r of results) {
    const c = CUES.find((x) => r.file.endsWith(`${x.id}.flac`)), s = SCORES[c.score];
    const h = sha(r.file);
    lines.push(`## ${c.id}`, `- file: ${r.file}`, `- sha256: ${h}`, `- use: ${c.use}`, `- composition: ${s.composition}`, `- composer: ${s.composer}`,
      `- score source: ${s.page} · licence: Public Domain (verify on the page) · checked ${CHECKED}`, '- route: 1', '- performer/synth: engine/audio/synth.mjs (additive piano + Schroeder reverb, code only, no samples or soundfont)',
      '- recording source: synthesised in code; no third-party recording used',
      `- excerpt: ${c.excerpt || `score time ${c.from}-${c.to} s`}${c.final ? ` + ${c.final[0]}-${c.final[1]} s` : ''}; speed ${c.speed}×; ${r.seconds} s`,
      `- modifications: time-scaled ${c.speed}×, ${c.fadeOut} s fade-out, loudnorm −18 LUFS`, '- attribution: not required (Public Domain composition and score)', '- author: lead engineer (engine/audio/music.mjs)', `- reviewer: ${keep(r.file, h)}`, '');
  }
  writeFileSync(prov, lines.join('\n'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = [];
  if (!CUES.length) { console.log('No cues defined. Add scores and cues to assets/music/cues.json (see the comment at the top of engine/audio/music.mjs).'); process.exit(0); }
  for (const c of CUES) { const r = await buildCue(c); results.push(r); console.log(`✓ ${r.file} ${r.seconds} s (${r.notes} notes)`); }
  provenanceBlocks(results);
  console.log('✓ assets/music/PROVENANCE.md (reviewer PENDING until music-curator signs)');
}
