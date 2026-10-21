#!/usr/bin/env node
// Video Blueprint linter (skills/motion-skill/references/blueprint.md). Exit 1 on any error.
//   node engine/blueprint/lint.mjs <slug> [--json]
// Reads storyboard.json (scenes with block/topic/part), roadmap.json, glossary.json, script.md,
// source/anchors.json and project.json (blueprint flags + mainSeconds window).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORDER, PREVIEW_BLOCKS, words, timed, termRegex } from './model.mjs';
import { buildChapters } from './chapters.mjs';
import { parseScript } from '../../scripts/lib/script.mjs';

// YouTube chapter rules (support.google.com/youtube/answer/9884579, checked 2026-10-19; see references/blueprint-rationale.md).
export const CHAPTERS = { minCount: 3, minSeconds: 10 };
const META_OK = new Set(['cold-open', 'sting', 'intro', 'takeaways', 'outro']); // blocks where [#meta] lines (channel, credits) are allowed

const norm = (s) => String(s || '').toLowerCase().replace(/\{\{|\}\}/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

export function lint(dir) {
  const read = (f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
  const errors = [], warnings = [];
  const err = (rule, msg) => errors.push({ rule, msg });
  const warn = (rule, msg) => warnings.push({ rule, msg });
  for (const f of ['storyboard.json', 'roadmap.json', 'glossary.json', 'script.md', 'project.json']) if (!existsSync(path.join(dir, f))) err('files', `missing ${f}`);
  if (errors.length) return { errors, warnings };

  const board = read('storyboard.json'), roadmap = read('roadmap.json'), glossary = read('glossary.json'), project = read('project.json');
  const anchors = existsSync(path.join(dir, 'source/anchors.json')) ? read('source/anchors.json') : {};
  const script = parseScript(readFileSync(path.join(dir, 'script.md'), 'utf8'));
  const flags = { coldOpen: true, sting: true, ...(project.blueprint || {}) };
  const scenes = timed(board);

  // 1. Blocks present and in order
  const seq = scenes.map((s) => s.block).filter((b, i, a) => b !== a[i - 1]);
  for (const s of scenes) if (!ORDER.includes(s.block)) err('blocks', `scene ${s.id}: unknown or missing block "${s.block}"`);
  const required = ORDER.filter((b) => (b === 'cold-open' ? flags.coldOpen : b === 'sting' ? flags.sting : true));
  const present = [...new Set(seq)];
  for (const b of required) if (!present.includes(b)) err('blocks', `required block "${b}" is missing`);
  for (const b of present) if (!required.includes(b)) err('blocks', `block "${b}" is disabled by project flags but present`);
  if (seq.filter((b) => b === 'topic').length > 1) err('blocks', 'topic scenes are interrupted by another block');
  const ranks = seq.map((b) => ORDER.indexOf(b));
  ranks.forEach((r, i) => { if (i && r < ranks[i - 1]) err('blocks', `block "${seq[i]}" comes after "${seq[i - 1]}" (order: ${required.join(' → ')})`); });

  // 2. Roadmap topics
  const topics = roadmap.topics || [];
  if (topics.length < 3 || topics.length > 7) err('topics', `${topics.length} topics; allowed 3-7`);
  if (!roadmap.thesis || words(roadmap.thesis) > 40) err('thesis', 'roadmap.thesis missing or longer than 40 words');
  for (const t of topics) {
    if (!t.title || words(t.title) > 3) err('topics', `${t.id}: title "${t.title}" must be 1-3 words`);
    if (!t.promise || words(t.promise) > 12) err('topics', `${t.id}: promise must be ≤ 12 words (${words(t.promise)})`);
    if (!t.recap || words(t.recap) > 12) err('recap', `${t.id}: recap line must be ≤ 12 words (${words(t.recap)})`);
    if (!(t.budgetSec > 0)) err('topics', `${t.id}: budgetSec missing`);
    if (!t.sourceAnchors?.length) err('topics', `${t.id}: no sourceAnchors`);
    for (const a of t.sourceAnchors || []) if (Object.keys(anchors).length && !anchors[a.replace(/^#/, '')]) err('topics', `${t.id}: anchor ${a} not in source/anchors.json`);
  }

  // 3. Topic scenes: contiguous, in roadmap order, durations within ±15% of budget
  const topicSeq = scenes.filter((s) => s.block === 'topic').map((s) => s.topic).filter((x, i, a) => x !== a[i - 1]);
  if (topicSeq.join() !== topics.map((t) => t.id).join()) err('topics', `topic scene order [${topicSeq.join(', ')}] ≠ roadmap [${topics.map((t) => t.id).join(', ')}]`);
  const tol = project.blueprint?.topicTolerance ?? 0.15;
  const durations = {};
  for (const t of topics) {
    const d = scenes.filter((s) => s.block === 'topic' && s.topic === t.id).reduce((a, s) => a + s.duration, 0);
    durations[t.id] = +d.toFixed(1);
    if (Math.abs(d - t.budgetSec) > tol * t.budgetSec) err('budget', `${t.id} "${t.title}": ${d.toFixed(1)} s vs budget ${t.budgetSec} s (±${tol * 100}%)`);
  }
  const main = scenes.filter((s) => s.block !== 'sting' && s.block !== 'outro').reduce((a, s) => a + s.duration, 0);
  const [lo, hi] = project.blueprint?.mainSeconds || [0, Infinity];
  if (main < lo || main > hi) err('budget', `main content ${main.toFixed(1)} s outside ${lo}-${hi} s`);

  // 3b. Topic part lengths (blueprint topic anatomy): bridge-in ≤ 5 s, bridge-out ≤ 3 s, limit ≤ 8 s.
  const PART_MAX = { 'bridge-in': 5, 'bridge-out': 3, limit: 8 };
  for (const s of scenes) if (PART_MAX[s.part] && s.duration > PART_MAX[s.part] + 0.05) err('parts', `${s.id}: ${s.part} is ${s.duration.toFixed(2)} s (max ${PART_MAX[s.part]} s)`);

  // 4. Roadmap appears ≥ 3 times: roadmap block, tracker in every topic scene, recap strip at the end
  if (!scenes.some((s) => s.block === 'roadmap' && s.template === 'roadmap')) err('roadmap', 'no roadmap scene (template "roadmap") in the roadmap block');
  for (const s of scenes.filter((x) => x.block === 'topic' && x.tracker === false)) err('roadmap', `${s.id}: tracker disabled in a topic scene`);
  if (!scenes.some((s) => (s.block === 'full-picture' || s.block === 'takeaways') && s.template === 'recap')) err('roadmap', 'no recap strip (template "recap") in full-picture or takeaways');

  // 5. One recap line per topic, spoken and on screen
  for (const t of topics) {
    const rs = scenes.filter((s) => s.topic === t.id && s.part === 'recap');
    if (rs.length !== 1) { err('recap', `${t.id}: ${rs.length} recap scenes (need exactly 1)`); continue; }
    const r = rs[0];
    if (!norm(r.narration).includes(norm(t.recap))) err('recap', `${t.id}: recap line not spoken verbatim in ${r.id}`);
    if (norm(r.props?.text ?? r.props?.recap) !== norm(t.recap)) err('recap', `${t.id}: recap line not on screen in ${r.id} (props.text)`);
  }

  // 6. Glossary: no topic uses a term defined in a later topic; within a topic, not before its defining scene.
  const topicIndex = Object.fromEntries(topics.map((t, i) => [t.id, i]));
  const sceneIndex = Object.fromEntries(scenes.map((s, i) => [s.id, i]));
  const perTopic = {};
  for (const [term, g] of Object.entries(glossary)) {
    if (!(g.definedInTopic in topicIndex)) { err('glossary', `"${term}": definedInTopic ${g.definedInTopic} is not a roadmap topic`); continue; }
    if (!(g.definedInScene in sceneIndex)) { err('glossary', `"${term}": definedInScene ${g.definedInScene} not in storyboard`); continue; }
    perTopic[g.definedInTopic] = (perTopic[g.definedInTopic] || 0) + 1;
    const re = termRegex(term);
    const defScene = scenes[sceneIndex[g.definedInScene]];
    if (!re.test(defScene.narration || '')) err('glossary', `"${term}" is not said in its defining scene ${g.definedInScene}`);
    scenes.forEach((s, i) => {
      if (PREVIEW_BLOCKS.has(s.block) || !re.test(s.narration || '')) return;
      const early = s.block === 'topic' ? topicIndex[s.topic] < topicIndex[g.definedInTopic] || (s.topic === g.definedInTopic && i < sceneIndex[g.definedInScene]) : false;
      if (early) err('glossary', `"${term}" used in ${s.id} before it is introduced in ${g.definedInScene}`);
    });
  }
  for (const [t, n] of Object.entries(perTopic)) if (n > 3) err('glossary', `${t}: ${n} new terms (max 3)`);
  for (const t of topics) for (const term of t.glossaryIntroduced || []) if (glossary[term]?.definedInTopic !== t.id) err('glossary', `${t.id}.glossaryIntroduced "${term}" does not match glossary.json`);

  // 7. Every narration sentence has an article anchor ([#meta] only in channel/credit blocks)
  const blockOfScript = {};
  for (const s of scenes) if (s.say) blockOfScript[s.say.split(':')[0]] = s.block;
  for (const part of script.scenes) for (const sen of part.sentences) {
    if (sen.anchor === 'meta') { if (!META_OK.has(blockOfScript[part.id])) err('anchors', `${part.id}: [#meta] not allowed in a ${blockOfScript[part.id] || 'unused'} block: "${sen.text.slice(0, 40)}"`); continue; }
    if (sen.anchor === 'transition') continue;
    if (Object.keys(anchors).length && !anchors[sen.anchor]) err('anchors', `${part.id}: anchor #${sen.anchor} not in source/anchors.json`);
  }
  const unused = script.scenes.filter((p) => !blockOfScript[p.id]).map((p) => p.id);
  if (unused.length) warn('anchors', `script scenes not used by the storyboard: ${unused.join(', ')}`);

  // 8. Chapters
  const ch = buildChapters(board, roadmap);
  if (ch.length < CHAPTERS.minCount) err('chapters', `${ch.length} chapters (min ${CHAPTERS.minCount})`);
  if (ch[0]?.start !== 0) err('chapters', 'first chapter does not start at 00:00');
  for (const c of ch) if (c.end - c.start < CHAPTERS.minSeconds) err('chapters', `chapter "${c.name}" is ${(c.end - c.start).toFixed(1)} s (min ${CHAPTERS.minSeconds})`);

  return { errors, warnings, stats: { topics: topics.length, durations, mainSeconds: +main.toFixed(1), chapters: ch.length, terms: Object.keys(glossary).length } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slug = process.argv[2];
  const dir = (await import('../render.mjs')).resolveProject(slug);
  const r = lint(dir);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    for (const e of r.errors) console.log(`✗ [${e.rule}] ${e.msg}`);
    for (const w of r.warnings) console.log(`! [${w.rule}] ${w.msg}`);
    console.log(r.errors.length ? `\nBlueprint lint FAILED: ${r.errors.length} error(s).` : `✓ Blueprint lint passed${r.stats ? ` (${r.stats.topics} topics, main ${r.stats.mainSeconds} s, ${r.stats.chapters} chapters, ${r.stats.terms} terms)` : ''}.`);
  }
  process.exit(r.errors.length ? 1 : 0);
}
