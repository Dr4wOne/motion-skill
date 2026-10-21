// Several inputs feeding a hub, which feeds a target. props: { kicker?, heading?, inputs: [{ label, sub? }],
//   hub: { label, sub? }, target?: { label, sub? }, note?, strokePx? (opt-in input-arrow width), beats? } — beats: hub, each input, target.
import { beat, header, node, arrowBetween, cells, vertical } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const v = vertical(api);
    const m = p.inputs.length;
    const n = 1 + m + (p.target ? 1 : 0) + (p.note ? 1 : 0);
    const bottom = safe.y + safe.h - (p.note ? 110 * k : 0);
    const H = bottom - top;
    let ins, hub, tgt;
    if (v) {
      const cs = cells(safe.x, safe.w, m, s(2));
      ins = cs.map((c) => ({ x: c.start, y: top, w: c.size, h: 230 * k }));
      hub = { x: safe.x + safe.w * 0.15, y: top + H * 0.45, w: safe.w * 0.7, h: 180 * k };
      tgt = p.target ? { x: safe.x + safe.w * 0.25, y: bottom - 170 * k, w: safe.w * 0.5, h: 170 * k } : null;
    } else {
      // Inputs stacked in one column on the left so every arrow reaches the hub without crossing a neighbour.
      const cols = m > 4 ? 2 : 1, rowsN = Math.ceil(m / cols);
      const cx = cells(safe.x, safe.w * 0.36, cols, s(2)), cy = cells(top, H, rowsN, s(2));
      ins = Array.from({ length: m }, (_, i) => ({ x: cx[i % cols].start, y: cy[Math.floor(i / cols)].start, w: cx[i % cols].size, h: cy[Math.floor(i / cols)].size }));
      hub = { x: safe.x + safe.w * 0.43, y: top + H / 2 - 120 * k, w: safe.w * 0.24, h: 240 * k };
      tgt = p.target ? { x: safe.x + safe.w * 0.8, y: top + H / 2 - 100 * k, w: safe.w * 0.2, h: 200 * k } : null;
    }
    const bh = beat(api, p, 0, n);
    const eh = api.enter(bh);
    node(api, { ...hub, y: hub.y + eh.dy, label: p.hub.label, sub: p.hub.sub, alpha: eh.alpha, state: 'active', labelRole: 'heading' });
    p.inputs.forEach((inp, i) => {
      const b0 = beat(api, p, 1 + i, n);
      const e = api.enter(b0);
      node(api, { ...ins[i], y: ins[i].y + e.dy, label: inp.label, sub: inp.sub, alpha: e.alpha });
      const prog = api.progress(b0 + 0.2, 0.45, api.ease.inOutCubic);
      if (v) arrowBetween(api, ins[i], hub, { progress: prog });
      else { // right edge of the input → left edge of the hub, so no arrow runs behind a neighbouring box
        const gap = 10 * k, ya = ins[i].y + ins[i].h / 2;
        const yb = Math.min(hub.y + hub.h - s(2), Math.max(hub.y + s(2), hub.y + hub.h * ((i + 1) / (m + 1))));
        api.line([[ins[i].x + ins[i].w + gap, ya], [hub.x - gap, yb]], { stroke: 'lineStrong', progress: prog, arrow: true, ...(p.strokePx ? { lineWidth: p.strokePx * k, head: 20 * k } : {}) });
      }
    });
    if (tgt) {
      const b0 = beat(api, p, 1 + m, n);
      const e = api.enter(b0);
      node(api, { ...tgt, y: tgt.y + e.dy, label: p.target.label, sub: p.target.sub, alpha: e.alpha });
      arrowBetween(api, hub, tgt, { progress: api.progress(b0 - 0.2, 0.45, api.ease.inOutCubic) });
    }
    if (p.note) {
      const e = api.enter(beat(api, p, n - 1, n));
      api.text(p.note, { x: safe.x, y: safe.y + safe.h - 90 * k + e.dy, w: safe.w, role: 'body', color: 'muted', align: 'center', alpha: e.alpha });
    }
  },
};
