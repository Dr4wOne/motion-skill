// Container/codec/duration checks with ffprobe against the storyboard (and narration, if present).
import { existsSync } from 'node:fs';
import { result, skip, ffprobe } from './util.mjs';

export async function check({ videoFile, finalFile, info, audioFile, expect = {} }) {
  const file = finalFile || videoFile;
  if (!file) return skip('duration-sync', 'no current picture track or MP4 (run npm run render, then npm run encode)');
  const p = await ffprobe(file);
  const v = p.streams.find((s) => s.codec_type === 'video');
  const a = p.streams.find((s) => s.codec_type === 'audio');
  const dur = Number(p.format.duration);
  const fails = [];
  const [num, den] = v.r_frame_rate.split('/').map(Number);
  if (v.codec_name !== 'h264') fails.push({ msg: `video codec ${v.codec_name}, want h264` });
  if (v.pix_fmt !== 'yuv420p') fails.push({ msg: `pix_fmt ${v.pix_fmt}, want yuv420p` });
  if (v.width !== info.outW || v.height !== info.outH) fails.push({ msg: `size ${v.width}×${v.height}, want ${info.outW}×${info.outH}` });
  if (Math.abs(num / den - info.fps) > 0.01) fails.push({ msg: `fps ${num / den}, want ${info.fps}` });
  if (Math.abs(dur - info.duration) > 1.5 / info.fps + (a ? 0.05 : 0)) fails.push({ msg: `duration ${dur.toFixed(3)} s vs storyboard ${info.duration.toFixed(3)} s` });
  if (finalFile) {
    if (!a) fails.push({ msg: 'no audio stream' });
    else if (a.codec_name !== 'aac') fails.push({ msg: `audio codec ${a.codec_name}, want aac` });
    const { readFileSync } = await import('node:fs');
    const head = readFileSync(finalFile).subarray(0, 64 * 1024).toString('latin1');
    const moov = head.indexOf('moov'), mdat = head.indexOf('mdat');
    if (moov < 0 || (mdat >= 0 && moov > mdat)) fails.push({ msg: 'moov atom not before mdat (+faststart missing)' });
  }
  if (expect.minSeconds && dur < expect.minSeconds) fails.push({ msg: `duration ${dur.toFixed(1)} s < ${expect.minSeconds} s` });
  if (expect.maxSeconds && dur > expect.maxSeconds) fails.push({ msg: `duration ${dur.toFixed(1)} s > ${expect.maxSeconds} s` });
  if (audioFile && existsSync(audioFile)) {
    const ap = await ffprobe(audioFile);
    const ad = Number(ap.format.duration);
    if (ad > dur + 0.1) fails.push({ msg: `narration ${ad.toFixed(2)} s is longer than picture ${dur.toFixed(2)} s` });
  }
  return result('duration-sync', fails, { file: file.split('/').pop(), seconds: +dur.toFixed(3), codec: v.codec_name, pix_fmt: v.pix_fmt, size: `${v.width}x${v.height}`, fps: num / den, audio: a?.codec_name ?? null });
}
