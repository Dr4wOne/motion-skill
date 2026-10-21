#!/usr/bin/env node
// Measure a voice sample before uploading it for cloning.   npm run voice-check -- <file>
// Targets (ElevenLabs Instant Voice Cloning guidance, checked 2026-10): 1–3 min of clean speech,
// no music/reverb, consistent level, no clipping, low background noise.
import { existsSync } from 'node:fs';
import { run } from '../engine/render.mjs';

const file = process.argv[2];
if (!file || !existsSync(file)) { console.error('usage: npm run voice-check -- <audio file>'); process.exit(1); }

const probe = JSON.parse((await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file])).out);
const a = probe.streams.find((s) => s.codec_type === 'audio');
const dur = Number(probe.format.duration);
const { err: r128 } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-']);
const sum = r128.slice(r128.lastIndexOf('Summary:'));
const I = Number(sum.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
const TP = Number(sum.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
// Noise floor: RMS level of the quietest 10% of 50 ms windows.
const { out } = await run('ffmpeg', ['-v', 'error', '-i', file, '-af', 'aresample=16000,asetnsamples=800,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-', '-f', 'null', '-']);
const rms = [...out.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === '-inf' ? -120 : Number(m[1]))).sort((x, y) => x - y);
const floor = rms.length ? rms[Math.floor(rms.length * 0.1)] : NaN;
const speechLvl = rms.length ? rms[Math.floor(rms.length * 0.7)] : NaN;
const { err: sil } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'silencedetect=noise=-45dB:d=2.5', '-f', 'null', '-']);
const longSilences = (sil.match(/silence_end/g) || []).length;

const checks = [
  ['duration', dur >= 60 && dur <= 300, `${dur.toFixed(0)} s (want 60–180 s; up to 300 s is fine)`],
  ['sample rate', Number(a.sample_rate) >= 44100, `${a.sample_rate} Hz (want ≥ 44.1 kHz)`],
  ['clipping', TP <= -1, `true peak ${TP} dBTP (want ≤ −1; lower your input gain if not)`],
  ['level', I >= -26 && I <= -12, `${I} LUFS integrated (want −26 to −12)`],
  ['noise floor', floor <= -55, `${floor.toFixed(1)} dBFS in pauses (want ≤ −55; quieter room or closer mic if not)`],
  ['signal-to-noise', speechLvl - floor >= 30, `${(speechLvl - floor).toFixed(1)} dB (want ≥ 30)`],
  ['long pauses', longSilences <= 3, `${longSilences} pauses over 2.5 s (trim them)`],
];
for (const [name, ok, detail] of checks) console.log(`${ok ? '✓' : '✗'} ${name.padEnd(16)} ${detail}`);
const fails = checks.filter((c) => !c[1]).length;
console.log(fails ? `\n${fails} issue(s). Re-record or fix before uploading.` : '\nGood to upload for Instant Voice Cloning.');
process.exit(fails ? 1 : 0);
