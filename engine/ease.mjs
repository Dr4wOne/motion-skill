// Easing functions: f(p) with p in [0,1] → [0,1] (outBack may overshoot slightly).
export const clamp01 = (p) => (p < 0 ? 0 : p > 1 ? 1 : p);
export const linear = (p) => p;
export const inQuad = (p) => p * p;
export const outQuad = (p) => 1 - (1 - p) * (1 - p);
export const inOutQuad = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
export const outCubic = (p) => 1 - (1 - p) ** 3;
export const inOutCubic = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
export const inOutSine = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
export const outExpo = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
export const outBack = (p, s = 1.2) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2;

// CSS-style cubic-bezier(x1, y1, x2, y2), solved by Newton + bisection.
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (p) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - p;
      if (Math.abs(err) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0, hi = 1;
    t = p;
    while (hi - lo > 1e-6) { if (sx(t) < p) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}

// Default entrance curve (cubic-bezier(0.2, 0.7, 0.2, 1)): fast start, long soft settle.
export const house = cubicBezier(0.2, 0.7, 0.2, 1);
