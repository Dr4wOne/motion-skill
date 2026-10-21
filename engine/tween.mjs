// Time helpers. All take the scene-local time t (seconds).
import { clamp01, linear } from './ease.mjs';

export const lerp = (a, b, p) => a + (b - a) * p;

// 0 → 1 over [start, start + dur], eased.
export function progress(t, start, dur, ease = linear) {
  return dur <= 0 ? (t >= start ? 1 : 0) : ease(clamp01((t - start) / dur));
}

export function tween(t, start, dur, from, to, ease = linear) {
  return lerp(from, to, progress(t, start, dur, ease));
}

// Fade in at `start`, fade out ending at `end` (both over `dur`).
export function inOut(t, start, end, dur, ease = linear) {
  return Math.min(progress(t, start, dur, ease), 1 - progress(t, end - dur, dur, ease));
}

// Hex colour interpolation: '#rrggbb' → '#rrggbb'.
export function mixHex(a, b, p) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, clamp01(p)));
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
