// The full picture rebuilt in one compact band (three homes → the stack → three buckets, with the /context bar
// measuring the stack), then the closing statement as the dominant element, built in two halves.
// props: { homes: [label], layers: [label], buckets: [{ label, item, dashed? }], measure?: { code, used },
//   closing: [line, line], beats? } — beats: [diagram, items + bar, closing[0], closing[1]]
import { beat, node, vertical } from './lib/kit.mjs';

export const meta = { name: 'full-picture', beats: ['diagram', 'items', 'closing0', 'closing1'] };

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const v = vertical(api);
    const n = 4;
    const b0 = beat(api, p, 0, n), b1 = beat(api, p, 1, n);
    const margin = 96 * k - safe.y + safe.y; // taste margin: 96 px from the frame edge
    const X = Math.max(safe.x, margin), W = api.W - 2 * X;
    const y0 = Math.max(safe.y, margin);
    // Closing lines measured first: they take the lower part of the content area.
    const bottom = safe.y + safe.h;
    const lays = p.closing.map((l) => api.layoutText(l, { x: X, y: 0, w: W, role: 'title' }));
    const closeH = lays.reduce((a, l) => a + l.height, 0) + s(2);
    const diagH = Math.min(380 * k, bottom - y0 - closeH - s(6));
    // Columns: homes | stack | buckets
    const homesW = W * 0.16, stackW = W * 0.24, gapA = W * 0.05;
    const hx = X, sx = hx + homesW + gapA, bx = sx + stackW + gapA, bw = X + W - bx;
    const e0 = api.enter(b0);
    // Homes: three short labelled rows with arrows into the stack.
    const hh = (diagH - 2 * s(1)) / 3;
    const stackH = diagH - (p.measure ? 90 * k : 0);
    const lh = (stackH - 2 * s(0)) / p.layers.length;
    p.homes.forEach((h, i) => {
      const e = api.enter(b0 + i * 0.08);
      const r = { x: hx, y: y0 + i * (hh + s(1)), w: homesW, h: hh };
      node(api, { ...r, y: r.y + e.dy, label: h, alpha: e.alpha, labelRole: 'label' });
      api.line([[r.x + r.w + 10 * k, r.y + r.h / 2], [sx - 12 * k, y0 + stackH / 2]], { stroke: 'lineStrong', lineWidth: 4 * k, arrow: true, alpha: e.alpha, progress: api.progress(b0 + 0.3 + i * 0.08, 0.5, api.ease.inOutCubic) });
    });
    p.layers.forEach((L, i) => {
      const e = api.enter(b0 + 0.15 + i * 0.08);
      node(api, { x: sx, y: y0 + i * (lh + s(0)) + e.dy, w: stackW, h: lh, label: L, alpha: e.alpha, labelRole: 'label' });
    });
    if (p.measure) {
      const e = api.enter(b1);
      const my = y0 + stackH + s(2);
      const cl = api.text(p.measure.code, { x: sx, y: my + e.dy, w: stackW, role: 'mono', font: 'mono', alpha: e.alpha, fixed: true });
      const barX = sx + cl.width + s(2), barW = sx + stackW - barX, barY = my + e.dy + cl.height / 2 - 14 * k;
      api.box({ x: barX, y: barY, w: barW, h: 28 * k, fill: 'surface', radius: 4 * k, alpha: e.alpha, decor: true });
      api.box({ x: barX, y: barY, w: barW * (p.measure.used ?? 0.14) * api.progress(b1, 0.9, api.ease.inOutCubic), h: 28 * k, fill: 'accent', radius: 4 * k, alpha: e.alpha, decor: true });
    }
    // Buckets with one item each
    const B = p.buckets.length, bg = s(3);
    const w1 = (bw - bg * (B - 1)) / B;
    const labH = 110 * k, bh = diagH - labH - s(1); // two label lines
    p.buckets.forEach((b, i) => {
      const at = b0 + 0.3 + i * 0.1;
      const e = api.enter(at);
      const x = bx + i * (w1 + bg);
      api.line([[x, y0 + e.dy], [x, y0 + bh + e.dy], [x + w1, y0 + bh + e.dy], [x + w1, y0 + e.dy]], { stroke: 'lineStrong', lineWidth: 5 * k, alpha: e.alpha, dash: b.dashed ? [14, 10] : undefined, progress: api.progress(at, 0.6, api.ease.inOutCubic) });
      api.text(b.label, { x, y: y0 + bh + s(1) + e.dy, w: w1, h: labH, role: 'label', align: 'center', alpha: e.alpha });
      if (b.item) {
        const ei = api.enter(b1 + i * 0.15, { rise: 48 });
        const ih = 80 * k, pad = 8 * k;
        const ry = y0 + bh - pad - ih - ei.dy;
        api.box({ x: x + pad + 4 * k, y: ry, w: w1 - 2 * pad - 8 * k, h: ih, fill: 'surface2', alpha: ei.alpha });
        api.text(b.item, { x: x + pad + 4 * k + 12 * k, y: ry, w: w1 - 2 * pad - 8 * k - 24 * k, h: ih, valign: 'middle', align: 'center', role: 'small', font: /\.|\//.test(b.item) ? 'mono' : undefined, on: 'surface2', alpha: ei.alpha });
      }
    });
    // Closing statement, the dominant element: two halves at title size.
    let y = bottom - closeH;
    p.closing.forEach((line, j) => {
      const e = api.enter(beat(api, p, 2 + j, n));
      api.text(line, { x: X, y: y + e.dy, w: W, role: 'title', alpha: e.alpha });
      y += lays[j].height + s(2);
    });
  },
};
