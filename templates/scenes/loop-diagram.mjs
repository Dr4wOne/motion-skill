// A loop of steps (e.g. reason → act → observe), with an entry and exits.
// props: { kicker?, heading?, nodes: [{ label, sub? }], entry?: { label }, exits?: [text], center?: text, beats? }
// strokePx? (opt-in): loop arc width in px with a larger arrowhead.
// beats: one per node, then exits. A marker travels around the loop once all nodes are in.
import { beat, header, node, edgePoint, vertical } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const v = vertical(api);
    const m = p.nodes.length;
    const n = m + (p.exits ? 1 : 0);
    const exitW = p.exits && !v ? safe.w * 0.26 : 0;
    const entryW = p.entry && !v ? safe.w * 0.16 : 0;
    const area = { x: safe.x + entryW, y: top, w: safe.w - entryW - exitW, h: safe.y + safe.h - top - (v && p.exits ? 420 * k : 0) - (p.center ? (v ? 170 : 90) * k : 0) };
    const cx = area.x + area.w / 2, cy = area.y + area.h / 2;
    const rx = v ? area.w * 0.3 : Math.min(area.w * 0.34, 420 * k), ry = v ? Math.min(area.h * 0.3, 380 * k) : Math.min(area.h * 0.36, 300 * k);
    const nw = (v ? 340 : 380) * k, nh = (v ? 210 : 190) * k;
    const rects = p.nodes.map((_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / m;
      return { x: cx + rx * Math.cos(a) - nw / 2, y: cy + ry * Math.sin(a) - nh / 2, w: nw, h: nh, a };
    });
    const allIn = beat(api, p, m - 1, n) + 0.8;
    const cyc = Math.max(0, t - allIn) / 2.4; // loops per second
    const activeIdx = t >= allIn ? Math.floor(cyc * m) % m : -1;
    // arcs between consecutive nodes
    p.nodes.forEach((_, i) => {
      const a0 = rects[i].a, a1 = rects[(i + 1) % m].a + (i === m - 1 ? 2 * Math.PI : 0);
      const pts = [];
      for (let u = 0.18; u <= 0.82; u += 0.02) { const a = api.lerp(a0, a1, u); pts.push([cx + rx * Math.cos(a) * 1.08, cy + ry * Math.sin(a) * 1.12]); }
      const b0 = beat(api, p, (i + 1) % m === 0 ? m - 1 : i + 1, n);
      api.line(pts, { stroke: 'lineStrong', arrow: true, progress: api.progress(b0 - 0.3, 0.5, api.ease.inOutCubic), ...(p.strokePx ? { lineWidth: p.strokePx * k, head: 22 * k } : {}) });
    });
    p.nodes.forEach((nd, i) => {
      const e = api.enter(beat(api, p, i, n));
      node(api, { ...rects[i], y: rects[i].y + e.dy, label: nd.label, sub: nd.sub, alpha: e.alpha, state: i === activeIdx ? 'active' : 'idle' });
    });
    if (p.center) {
      const e = api.enter(allIn - 0.4);
      // Centre of the loop, between the nodes; one sentence per line (use \n in props).
      // Below the loop (the space inside it is too tight once captions reserve their band).
      const below = Math.max(...rects.map((r) => r.y + r.h), cy + ry * 1.12) + s(4); // clear of nodes and the loop arc
      const ct = { x: area.x, y: below, w: area.w, h: (v ? 130 : 60) * k };
      api.text(v ? p.center : p.center.replace(/\n/g, ' '), { ...ct, valign: 'top', role: 'label', color: 'muted', align: 'center', alpha: e.alpha, balance: false });
    }
    if (p.entry && !v) {
      const e = api.enter(beat(api, p, 0, n) - 0.3);
      const ry0 = rects[0].y + rects[0].h / 2;
      const r = { x: safe.x, y: ry0 - nh / 2, w: entryW - s(5), h: nh };
      node(api, { ...r, label: p.entry.label, alpha: e.alpha });
      api.line([[r.x + r.w + 10 * k, ry0], [rects[0].x - 12 * k, ry0]], { arrow: true, progress: api.progress(beat(api, p, 0, n), 0.5) * e.alpha });
    }
    if (p.exits) {
      const b0 = beat(api, p, n - 1, n);
      const ex = v ? safe.x : safe.x + safe.w - exitW + s(3);
      let y = v ? area.y + area.h + s(3) : cy - (p.exits.length * 110 * k) / 2;
      const e = api.enter(b0);
      const hl = api.text(p.exitsTitle || 'Stops when', { x: ex, y: y + e.dy, w: v ? safe.w : exitW - s(3), role: 'label', color: 'accent', alpha: e.alpha });
      y += hl.height + s(2);
      p.exits.forEach((x, j) => {
        const ee = api.enter(b0 + 0.2 + j * 0.15);
        const lay = api.text(x, { x: ex, y: y + ee.dy, w: v ? safe.w : exitW - s(3), role: 'label', alpha: ee.alpha });
        y += lay.height + s(2);
      });
    }
  },
};
