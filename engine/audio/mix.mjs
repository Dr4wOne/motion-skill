#!/usr/bin/env node
// Final mix: narration clips at each scene's speech start + SFX (+ optional music, ducked under speech
// with sidechaincompress), then two-pass EBU R128 loudnorm to −14 LUFS / −1 dBTP.
//   npm run mix -- <slug> [--music assets/music/file.mp3] [--allow-no-narration]
// Output: projects/<slug>/audio/mix.wav (48 kHz stereo) and audio/mix-report.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, run, resolveProject } from '../render.mjs';
import { measure } from '../qa/loudness.mjs';
import { scenesFor, suffix } from '../../scripts/lib/cuts.mjs';
import { buildBrandAudio, ebur, summary } from './brand-audio.mjs';
import { measureDucking } from './duck.mjs';

export async function mix(dir, { music, allowNoNarration, cut = null } = {}) {
  // Silent / SFX-only videos: narration is optional unless project.json opts in with audio.narration = "elevenlabs".
  const project = existsSync(path.join(dir, 'project.json')) ? JSON.parse(readFileSync(path.join(dir, 'project.json'), 'utf8')) : {};
  allowNoNarration ??= project.audio?.narration !== 'elevenlabs';
  const full = JSON.parse(readFileSync(path.join(dir, 'storyboard.json'), 'utf8'));
  const board = { ...full, scenes: scenesFor(full, cut) };
  const sx = suffix(cut);
  const total = board.scenes.reduce((a, s) => a + s.duration, 0);
  const audio = path.join(dir, 'audio');
  const sfx = path.join(audio, `sfx${sx}.wav`);
  if (!existsSync(sfx)) throw new Error('audio/sfx.wav missing: run npm run sfx -- <slug> first');

  // 1. Narration stem
  const clips = [];
  let t = 0;
  for (const s of board.scenes) {
    const f = path.join(audio, 'clips', `${s.id}.mp3`);
    if (s.narration && existsSync(f)) clips.push({ file: f, at: t + (s.speechStart ?? s.lead ?? 0.6) });
    else if (s.narration && !allowNoNarration) throw new Error(`no narration clip for ${s.id}; run npm run narrate first`);
    t += s.duration;
  }
  const narr = path.join(audio, `narration${sx}.wav`);
  if (clips.length) {
    const inputs = clips.flatMap((c) => ['-i', c.file]);
    const delays = clips.map((c, i) => `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(c.at * 1000)}:all=1[c${i}]`).join(';');
    const graph = `${delays};${clips.map((_, i) => `[c${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=0:${total.toFixed(3)}[out]`;
    await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph, '-map', '[out]', '-ar', '48000', narr]);
  } else {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=stereo`, '-t', total.toFixed(3), narr]);
  }

  // 2. Pre-mix: narration + sfx (+ music ducked by narration)
  const pre = path.join(audio, `premix${sx}.wav`);
  const inputs = ['-i', narr, '-i', sfx];
  let graph = '[0:a]asplit=2[n][key];';
  if (music) {
    inputs.push('-stream_loop', '-1', '-i', music);
    graph += `[2:a]aresample=48000,aformat=channel_layouts=stereo,volume=-18dB,atrim=0:${total.toFixed(3)}[m];[m][key]sidechaincompress=threshold=0.02:ratio=10:attack=20:release=450:makeup=1[md];[n][1:a][md]amix=inputs=3:normalize=0[out]`;
  } else {
    graph += '[key]anullsink;[n][1:a]amix=inputs=2:normalize=0[out]';
  }
  await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph, '-map', '[out]', '-t', total.toFixed(3), '-ar', '48000', pre]);

  // 3. Two-pass loudnorm (EBU R128): measure, then apply with linear normalisation.
  const target = { I: -14, TP: -1.5, LRA: 11 }; // TP target leaves margin under the −1 dBTP limit
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', pre, '-af', `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}:print_format=json`, '-f', 'null', '-']);
  const m = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1));
  const bed = path.join(audio, `bed${sx}.wav`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', pre, '-af',
    `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo`,
    '-ar', '48000', bed]);

  // 4. Brand scenes (sting, outro): their own stem (SFX + music + sonic logo) at sting level (≤ −16 LUFS
  //    short-term), laid onto the normalised bed so normalisation never lifts them; true-peak limit the sum.
  const out = path.join(audio, `mix${sx}.wav`);
  const stems = [];
  let tb = 0;
  for (const s of board.scenes) { if (s.brand) stems.push({ ...(await buildBrandAudio(s, audio)), at: tb, id: s.id, duration: s.duration }); tb += s.duration; }
  const brandStem = path.join(audio, `brand${sx}.wav`);
  if (stems.length) {
    const g = stems.map((st, i) => `[${i}:a]adelay=${Math.round(st.at * 1000)}:all=1[b${i}]`).join(';') + `;${stems.map((_, i) => `[b${i}]`).join('')}amix=inputs=${stems.length}:normalize=0,apad,atrim=0:${total.toFixed(3)}[o]`;
    await run('ffmpeg', ['-y', '-loglevel', 'error', ...stems.flatMap((st) => ['-i', st.file]), '-filter_complex', g, '-map', '[o]', '-ar', '48000', brandStem]);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', bed, '-i', brandStem, '-filter_complex', `[0:a][1:a]amix=inputs=2:normalize=0,alimiter=limit=${10 ** (-1.5 / 20)}:level=false:attack=2:release=50,aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo[o]`, '-map', '[o]', '-t', total.toFixed(3), out]);
  } else {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', bed, '-c', 'copy', out]);
  }
  const ducking = stems.length ? await measureDucking(narr, brandStem) : null;
  const after = await measure(out);
  const stings = stems.map((st) => ({ id: st.id, music: st.music, integrated: st.integrated, shortTermMax: st.shortTermMax, truePeak: st.truePeak }));
  const report = { date: new Date().toISOString(), seconds: +total.toFixed(3), narrationClips: clips.length, stings, ducking, music: music ? path.relative(ROOT, music) : null, firstPass: { I: Number(m.input_i), TP: Number(m.input_tp), LRA: Number(m.input_lra) }, final: after, normalizationType: m.normalization_type };
  writeFileSync(path.join(audio, `mix-report${sx}.json`), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  const mi = args.indexOf('--music');
  const ci = args.indexOf('--cut');
  const r = await mix(resolveProject(slug), { music: mi >= 0 ? path.resolve(args[mi + 1]) : null, allowNoNarration: args.includes('--allow-no-narration') || undefined, cut: ci >= 0 ? args[ci + 1] : null });
  console.log(`✓ audio/mix${ci >= 0 ? '.' + args[ci + 1] : ''}.wav ${r.seconds}s · ${r.narrationClips} narration clips · integrated ${r.final.integrated} LUFS · true peak ${r.final.truePeak} dBTP (${r.normalizationType})`);
}
