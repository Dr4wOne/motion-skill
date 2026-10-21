#!/usr/bin/env node
// Layer B (optional, paid): narration with an ElevenLabs voice (your own clone or a library voice), one clip per scene with word timestamps.
//   npm run narrate -- <slug> --estimate            cost estimate only (free)
//   npm run narrate -- <slug> --preview --yes       ~10 s preview of the first scene (a few cents)
//   npm run narrate -- <slug> --generate --approved full narration (only after the G3 gate)
// Clips are cached by text + voice + model: re-running regenerates only changed scenes.
// API: POST /v1/text-to-speech/{voice_id}/with-timestamps (docs checked 2026-10-18).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './env.mjs';
import { ROOT, run, resolveProject } from '../render.mjs';

const API = 'https://api.elevenlabs.io/v1';
// USD per credit by plan (monthly price / included credits), checked 2026-10-18 from third-party summaries
// of the ElevenLabs pricing page. Confirm on the live page; the estimate prints the plan it assumed.
const PLAN_USD_PER_CREDIT = { free: 0, starter: 6 / 40000, // Starter: 40,000 credits for US$6 (check the live pricing page)
  creator: 22 / 121000, pro: 99 / 600000, scale: 299 / 1800000, business: 990 / 6000000 };
// Credits per character by model family (Flash/Turbo are half price).
const creditsPerChar = (model) => (/flash|turbo/.test(model) ? 0.5 : 1);

export function scenesToSay(dir) {
  const board = JSON.parse(readFileSync(path.join(dir, 'storyboard.json'), 'utf8'));
  return board.scenes.filter((s) => s.narration).map((s, i, arr) => ({ id: s.id, text: speakable(s.narration), prev: arr[i - 1]?.narration, next: arr[i + 1]?.narration, voice: s.voice || {} }));
}

// Spoken form: the script is already written for the ear; only strip on-screen-only symbols.
const speakable = (t) => t.replace(/\{\{|\}\}/g, '').replace(/\s+/g, ' ').trim();

async function api(env, p, init = {}) {
  const res = await fetch(`${API}${p}`, { ...init, headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`ElevenLabs ${p.split('?')[0]} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

export async function estimate(dir, env) {
  const model = env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const items = scenesToSay(dir);
  const cached = items.filter((it) => existsSync(clipPaths(dir, it.id).json) && JSON.parse(readFileSync(clipPaths(dir, it.id).json, 'utf8')).key === keyOf(it, env, model));
  const todo = items.filter((it) => !cached.includes(it));
  const chars = todo.reduce((n, it) => n + it.text.length, 0);
  let plan = null, remaining = null;
  if (env.ELEVENLABS_API_KEY) {
    try {
      const sub = await (await api(env, '/user/subscription')).json();
      plan = sub.tier;
      remaining = sub.character_limit - sub.character_count;
    } catch (e) { plan = `unknown (${e.message.slice(0, 80)})`; }
  }
  const credits = chars * creditsPerChar(model);
  const rate = PLAN_USD_PER_CREDIT[String(plan).toLowerCase()] ?? PLAN_USD_PER_CREDIT.starter;
  return { model, scenes: items.length, toGenerate: todo.length, cachedScenes: cached.length, chars, credits, plan: plan ?? 'not checked (no API key)', remainingCredits: remaining, usd: +(credits * rate).toFixed(2), rateAssumed: `${PLAN_USD_PER_CREDIT[String(plan).toLowerCase()] ? plan : 'starter'} $${(rate * 1000).toFixed(3)}/1k credits` };
}

const keyOf = (it, env, model) => createHash('sha256').update(JSON.stringify([it.text, env.ELEVENLABS_VOICE_ID, model, it.prev ?? '', it.next ?? '', ...(Object.keys(it.voice || {}).length ? [it.voice] : [])])).digest('hex').slice(0, 16);
const clipPaths = (dir, id) => ({ mp3: path.join(dir, 'audio/clips', `${id}.mp3`), json: path.join(dir, 'audio/clips', `${id}.json`) });

// Character alignment → words with start/end (seconds).
export function wordsFromAlignment(al) {
  const words = [];
  let cur = null;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
    if (!cur) cur = { text: '', start: al.character_start_times_seconds[i], end: al.character_end_times_seconds[i] };
    cur.text += ch;
    cur.end = al.character_end_times_seconds[i];
  });
  if (cur) words.push(cur);
  return words.map((w) => ({ text: w.text, start: +w.start.toFixed(3), end: +w.end.toFixed(3) }));
}

async function synth(env, model, text, { prev, next, voice: settings = {} } = {}) {
  const voice = env.ELEVENLABS_VOICE_ID;
  const res = await api(env, `/text-to-speech/${encodeURIComponent(voice)}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    body: JSON.stringify({ text, model_id: model, previous_text: prev, next_text: next, voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0, use_speaker_boost: true, ...settings }, seed: 1 }), // per-scene overrides, e.g. { speed: 0.95 }
  });
  const body = await res.json();
  const headers = Object.fromEntries([...res.headers].filter(([k]) => /character|request-id|cost/i.test(k)));
  return { audio: Buffer.from(body.audio_base64, 'base64'), alignment: body.alignment || body.normalized_alignment, headers };
}

async function duration(file) {
  const { out } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(out.trim());
}

export async function generate(dir, env, { onlyFirstWords = 0 } = {}) {
  const model = env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const items = scenesToSay(dir);
  mkdirSync(path.join(dir, 'audio/clips'), { recursive: true });
  const costLog = path.join(dir, 'audio/cost.json');
  const log = existsSync(costLog) ? JSON.parse(readFileSync(costLog, 'utf8')) : { runs: [] };
  const run_ = { date: new Date().toISOString(), model, voice: '(from .env)', calls: [] };
  if (onlyFirstWords) {
    const it = items[0];
    const text = it.text.split(' ').slice(0, onlyFirstWords).join(' ').replace(/[,;:]?$/, '.');
    const r = await synth(env, model, text);
    const file = path.join(dir, 'audio/preview.mp3');
    writeFileSync(file, r.audio);
    run_.calls.push({ id: 'preview', chars: text.length, headers: r.headers });
    log.runs.push(run_);
    writeFileSync(costLog, JSON.stringify(log, null, 2) + '\n');
    return { preview: file, seconds: await duration(file), chars: text.length };
  }
  let made = 0;
  for (const it of items) {
    const { mp3, json } = clipPaths(dir, it.id);
    const key = keyOf(it, env, model);
    if (existsSync(json) && JSON.parse(readFileSync(json, 'utf8')).key === key) continue;
    const r = await synth(env, model, it.text, it);
    writeFileSync(mp3, r.audio);
    const words = wordsFromAlignment(r.alignment);
    writeFileSync(json, JSON.stringify({ key, scene: it.id, text: it.text, duration: await duration(mp3), words }, null, 1) + '\n');
    run_.calls.push({ id: it.id, chars: it.text.length, headers: r.headers });
    made++;
  }
  run_.chars = run_.calls.reduce((n, c) => n + c.chars, 0);
  log.runs.push(run_);
  writeFileSync(costLog, JSON.stringify(log, null, 2) + '\n');
  return { made, chars: run_.chars };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  const dir = resolveProject(slug);
  const env = loadEnv(ROOT);
  const est = await estimate(dir, env);
  console.log(`Narration estimate: ${est.toGenerate}/${est.scenes} scenes to generate (${est.cachedScenes} cached), ${est.chars} characters, ${est.credits} credits with ${est.model}.`);
  console.log(`Plan: ${est.plan}${est.remainingCredits != null ? `, ${est.remainingCredits} credits left this month` : ''}. Estimated cost: US$${est.usd} (${est.rateAssumed}).`);
  const max = Number(env.ELEVENLABS_MAX_USD || 1);
  if (args.includes('--estimate')) process.exit(0);
  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_VOICE_ID) { console.error('✗ .env needs ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (see .env.example).'); process.exit(1); }
  if (args.includes('--preview')) {
    if (!args.includes('--yes')) { console.error('A preview is a paid call (~150 characters). Re-run with --yes to confirm.'); process.exit(1); }
    const r = await generate(dir, env, { onlyFirstWords: 28 });
    console.log(`✓ preview ${path.relative(ROOT, r.preview)} (${r.seconds.toFixed(1)} s, ${r.chars} characters)`);
    process.exit(0);
  }
  if (args.includes('--generate')) {
    if (!args.includes('--approved')) { console.error('Full narration needs the G3 approval. Re-run with --approved once the human has approved cost and preview.'); process.exit(1); }
    if (est.usd > max) { console.error(`✗ Estimated US$${est.usd} exceeds ELEVENLABS_MAX_USD=${max}. Use a cheaper model (ELEVENLABS_MODEL_ID) or raise the cap.`); process.exit(1); }
    if (est.remainingCredits != null && est.credits > est.remainingCredits) { console.error(`✗ Needs ${est.credits} credits; only ${est.remainingCredits} left this month.`); process.exit(1); }
    const r = await generate(dir, env);
    console.log(`✓ generated ${r.made} clip(s), ${r.chars} characters. Next: npm run board -- ${slug} (re-times scenes to the voice).`);
  }
}
