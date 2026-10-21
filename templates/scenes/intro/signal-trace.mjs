// Starter intro: Signal Trace. A thin oscilloscope pulse (accent) travels left to right across the centre line;
// the wordmark is written into view behind the pulse head, then the pulse leaves and the wordmark holds.
// Palette and type only (accent colour for the trace). Pure f(t).
import { wordmark, B } from '../lib/brand.mjs';

export const meta = {
  duration: 5,
  sfx: [
    { at: 0.15, kind: 'sweep', args: [160, 880, 2.9, -32], gain: 0.8 },
    { at: 3.0, kind: 'swell', args: [1.2, -36, 4], gain: 0.6 },
  ],
};

const CAP = 120;
const T0 = 0.15, T1 = 3.0; // pulse head travel window (s)

export default {
  render(ctx, t, api) {
    const { W, H, k } = api;
    api.box({ x: 0, y: 0, w: W, h: H, fill: B('bg'), radius: 0, decor: true });
    const cx = W / 2, cy = H / 2;
    // Faint signal baseline from frame 0 so the opening is never an empty frame (blank-frames QA).
    api.line([[W * 0.08, cy], [W * 0.92, cy]], { stroke: B('line'), lineWidth: 2 * k, alpha: 1 - api.progress(3.2, 0.8) });

    // Wordmark geometry (same measurement as lib/brand.mjs wordmark()).
    const plain = (api.brand?.wordmark?.text) || 'Your Channel';
    const lay = api.layoutText(plain, { x: 0, y: 0, w: W, role: 'title', font: 'brand', weight: 700, px: CAP / 0.7 / k, fixed: true });
    const wx0 = cx - lay.width / 2, wx1 = cx + lay.width / 2;

    // Pulse head: on-screen travel, ease-in-out, from just off the left edge to just off the right edge.
    const xs = W * 0.16, xe = W * 1.04; // starts on the baseline, near the first glyph
    const p = api.progress(T0, T1 - T0, api.ease.inOutSine);
    const head = api.lerp(xs, xe, p);

    // Wordmark revealed behind the head (continuous wipe, so glyphs appear one by one as it passes).
    const chars = plain.length * Math.max(0, Math.min(1, (head - wx0) / (wx1 - wx0)));
    if (api.reducedMotion) {
      const a = api.progress(0.6, 1.2, api.ease.outCubic);
      if (a > 0) wordmark(api, { cx, cy, cap: CAP, alpha: a });
    } else if (chars > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, Math.min(W, head - 6 * k), H);
      ctx.clip();
      wordmark(api, { cx, cy, cap: CAP, chars: Math.min(plain.length, chars * 1.08) });
      ctx.restore();
    }

    // The trace: a short wave packet behind the head. Amplitude rises toward the head; inside the
    // wordmark span the tail collapses faster, so the signal "resolves" into the letters.
    if (api.reducedMotion || t < T0 || t > T1 + 0.05) return;
    const L = 360 * k, A = 46 * k, lambda = 64 * k;
    const phase = t * 9;
    const y = (x) => {
      const d = head - x; // distance behind head
      const env = Math.exp(-d / (x > wx0 && x < wx1 ? 110 * k : 200 * k)) * Math.min(1, d / (24 * k));
      return cy + A * env * Math.sin((x / lambda) * Math.PI * 2 - phase) * Math.cos((d / L) * Math.PI * 0.5);
    };
    // Draw the packet in 3 chunks, fading toward the tail.
    const chunks = [[1, 0.66, 0.35], [0.66, 0.33, 0.7], [0.33, 0, 1]];
    for (const [a0, a1, alpha] of chunks) {
      const xa = head - L * a0, xb = head - L * a1;
      const pts = [];
      for (let x = xa; x <= xb + 0.1; x += 5 * k) pts.push([x, y(x)]);
      if (pts.length > 1) api.line(pts, { stroke: B('accent'), lineWidth: 4 * k, alpha });
    }
    // Bright head point.
    api.circle({ x: head, y: y(head), r: 6 * k, fill: B('accent') });
  },
};
