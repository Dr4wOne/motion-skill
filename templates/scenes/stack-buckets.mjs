// Three layers stacked (model, harness, context window) beside three buckets (always on, on demand, outside the
// model). Overview: zoomed out, labels only. Full picture (filled: true): each bucket holds its examples and an
// optional closing statement builds in two halves underneath.
// props: { kicker?, heading?, layers: [{ label, sub? }] (top → bottom), buckets: [{ label, sub?, items?: [text],
//   dashed?: bool }], filled?: bool, closing?: [line, line], beats? }
// beats (overview): one per layer, then the buckets. beats (filled): diagram, items, closing[0], closing[1].
import { beat, header, node, vertical } from './lib/kit.mjs';

export const meta = { name: 'stack-buckets', beats: ['layer…', 'buckets', 'closing…'] };

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const v = vertical(api);
    const L = p.layers.length, B = p.buckets.length;
    const nc = p.closing ? p.closing.length : 0;
    const n = p.filled ? 2 + nc : L + 1 + nc;
    const closingH = nc ? 200 * k : 0;
    const bottom = safe.y + safe.h - closingH;
    const H = bottom - top;
    // Geometry: stack left 40%, buckets right 52% (16:9); stack top, buckets below (9:16).
    const stackR = v ? { x: safe.x, y: top, w: safe.w, h: H * 0.42 } : { x: safe.x, y: top, w: safe.w * 0.4, h: H };
    const buckR = v ? { x: safe.x, y: top + H * 0.42 + s(5), w: safe.w, h: H * 0.58 - s(5) } : { x: safe.x + safe.w * 0.48, y: top, w: safe.w * 0.52, h: H };
    const gap = s(1);
    const lh = (stackR.h - gap * (L - 1)) / L;
    const layerAt = (i) => (p.filled ? beat(api, p, 0, n) + i * 0.08 : beat(api, p, i, n));
    p.layers.forEach((ly, i) => {
      const e = api.enter(layerAt(i));
      const r = { x: stackR.x, y: stackR.y + i * (lh + gap) + e.dy, w: stackR.w, h: lh };
      node(api, { ...r, label: ly.label, sub: ly.sub, alpha: e.alpha, align: 'left', labelRole: 'label' });
    });
    // Buckets: open-top containers (left, bottom, right strokes), label underneath.
    const bAt = p.filled ? beat(api, p, 0, n) + 0.25 : beat(api, p, L, n);
    const bg = s(4);
    const bw = (buckR.w - bg * (B - 1)) / B;
    const labH = 110 * k; // two label lines
    const bh = Math.min(buckR.h - labH - s(2), (v ? 420 : 470) * k);
    const by = buckR.y + (buckR.h - bh - labH - s(2)) / 2;
    p.buckets.forEach((b, i) => {
      const at = bAt + i * 0.12;
      const e = api.enter(at);
      const x = buckR.x + i * (bw + bg);
      const draw = api.progress(at, 0.6, api.ease.inOutCubic);
      api.line([[x, by + e.dy], [x, by + bh + e.dy], [x + bw, by + bh + e.dy], [x + bw, by + e.dy]], { stroke: 'lineStrong', lineWidth: 5 * k, progress: draw, alpha: e.alpha, dash: b.dashed ? [14, 10] : undefined });
      api.text(b.label, { x, y: by + bh + s(2) + e.dy, w: bw, h: labH, role: 'label', align: 'center', alpha: e.alpha });
      if (p.filled && b.items) {
        const iAt = beat(api, p, 1, n);
        const ih = 86 * k, ig = s(1), pad = s(1);
        b.items.forEach((it, j) => {
          const ei = api.enter(iAt + i * 0.15 + j * 0.08, { rise: 48 });
          const ry = by + bh - pad - (j + 1) * ih - j * ig + e.dy - ei.dy; // drops in from above
          const fill = 'surface2';
          api.box({ x: x + pad + 4 * k, y: ry, w: bw - 2 * pad - 8 * k, h: ih, fill, alpha: ei.alpha });
          api.text(it, { x: x + pad + 4 * k + s(1), y: ry, w: bw - 2 * pad - 8 * k - s(2), h: ih, valign: 'middle', role: 'small', font: /\.|\//.test(it) ? 'mono' : undefined, align: 'center', on: fill, alpha: ei.alpha });
        });
      } else if (b.sub && !p.filled) {
        const es = api.enter(at + 0.3);
        api.text(b.sub, { x: x + s(2), y: by + s(3) + es.dy, w: bw - s(4), h: bh - s(5), role: 'small', color: 'muted', align: 'center', alpha: es.alpha });
      }
    });
    // Closing statement: two halves, left-aligned under the diagram.
    if (nc) {
      let y = bottom + s(4);
      p.closing.forEach((line, j) => {
        const e = api.enter(beat(api, p, n - nc + j, n));
        const lay = api.text(line, { x: safe.x, y: y + e.dy, w: safe.w, role: 'body', color: 'ink', alpha: e.alpha });
        y += lay.height + s(0);
      });
    }
  },
};
