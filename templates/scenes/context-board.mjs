// What fills a context window, as one board of stacked bands. props: { kicker?, heading?, title?: board label,
//   rows: [{ label, sub?, size, accent?, dashed? }], aside?: text beside the board, beats? }
import { beat, header, vertical } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const v = vertical(api);
    const bw = v ? safe.w : safe.w * 0.56;
    const bx = v ? safe.x : safe.x + safe.w - bw;
    const bh = safe.y + safe.h - top;
    const e0 = api.enter(0.2);
    api.box({ x: bx, y: top, w: bw, h: bh, stroke: 'lineStrong', lineWidth: 3 * k, alpha: e0.alpha });
    const total = p.rows.reduce((n, r) => n + r.size, 0);
    const pad = s(1);
    let y = top + pad;
    const n = p.rows.length + (p.aside ? 1 : 0);
    // Proportional bands, but never thinner than one label line (+ padding).
    const avail = bh - pad * (p.rows.length + 1), minH = 64 * k; // ≥ 8 px around a 47 px label line (pixel-contrast ring clearance)
    let hs = p.rows.map((r) => (avail * r.size) / total);
    const shortfall = hs.reduce((a, h) => a + Math.max(0, minH - h), 0);
    const flexible = hs.reduce((a, h) => a + (h > minH ? h - minH : 0), 0);
    hs = hs.map((h) => (h < minH ? minH : h - (flexible ? ((h - minH) / flexible) * Math.min(shortfall, flexible) : 0)));
    p.rows.forEach((r, i) => {
      const h = hs[i];
      const e = api.enter(beat(api, p, i, n));
      const fill = r.dashed ? null : r.accent ? 'surface2' : 'surface';
      api.box({ x: bx + pad, y, w: bw - 2 * pad, h, fill, stroke: r.dashed ? 'accent' : r.accent ? 'accent' : null, dash: r.dashed ? [10, 8] : null, lineWidth: 2 * k, alpha: e.alpha });
      const label = r.sub && h > 110 * k ? `${r.label} · ${r.sub}` : r.label;
      api.text(label, { x: bx + pad * 3, y: y, w: bw - pad * 6, h, valign: 'middle', role: 'small', alpha: e.alpha, color: r.dashed ? 'accent' : 'ink', on: fill || 'bg' });
      y += h + pad;
    });
    if (p.aside && !v) {
      const e = api.enter(beat(api, p, n - 1, n));
      api.text(p.aside, { x: safe.x, y: top + e.dy, w: safe.w - bw - s(6), h: bh, valign: 'middle', role: 'title', alpha: e.alpha });
    }
  },
};
