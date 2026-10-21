// Shared QA helpers. Every check returns { name, pass, metrics, failures: [{frame?, t?, scene?, msg}] }.
import { readFileSync, existsSync } from 'node:fs';
import { run } from '../render.mjs';

export const result = (name, failures, metrics = {}, extra = {}) => ({ name, pass: failures.length === 0, metrics, failures: failures.slice(0, 50), failureCount: failures.length, ...extra });
export const skip = (name, why) => ({ name, pass: true, skipped: why, metrics: {}, failures: [], failureCount: 0 });

export function readManifests(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// WCAG 2.x relative luminance and contrast ratio.
export function luminance(hex) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
export const rgbHex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

export async function ffprobe(file) {
  const { out } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  return JSON.parse(out);
}

// Decode a PNG to raw RGB with ffmpeg (no npm image deps).
export async function decodeRGB(file) {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
    const chunks = [];
    p.stdout.on('data', (d) => chunks.push(d));
    p.on('close', (c) => (c === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error('decode failed ' + file))));
  });
}

// Group per-frame failures into runs so a 3-second problem is one finding, not 90.
export function runs(frames, fps, msgOf) {
  const out = [];
  let cur = null;
  for (const f of frames) {
    if (cur && f.frame === cur.last + 1 && f.key === cur.key) { cur.last = f.frame; continue; }
    if (cur) out.push(cur);
    cur = { first: f.frame, last: f.frame, key: f.key, scene: f.scene, sample: f };
  }
  if (cur) out.push(cur);
  return out.map((r) => ({ frame: r.first, frames: r.last - r.first + 1, t: +(r.first / fps).toFixed(2), scene: r.scene, msg: msgOf(r.sample) }));
}
