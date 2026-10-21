// Draw an Archify layout natively (Archify as an offline layout engine; see references/archify.md).
// Boundaries fade in, nodes appear in reveal order (rank), each edge is drawn along its routed polyline
// after its source node, then a comet travels each edge on a loop and nodes pulse in a staggered wave.
// Everything is a pure function of t; all text goes through api.text; colours are palette names.
// props: {
//   layoutFile: 'examples/archify/x.layout.json'  (repo-relative; loaded at boot into props.layout)
//   heading?, kicker?,            optional header (lib/kit header)
//   focus?: [nodeId],             draw only these nodes (+ edges between them, boundaries re-fitted)
//   edgeLabels?: true, boundaryLabels?: true, sublabels?: false,
//   start?: 0.5,                  first node appears (s)
//   rankStep?: 0.45,              delay between ranks (s)
//   edgeDraw?: 0.6,               time to draw one edge (s)
//   comet?: { period: 1.75, tail: 0.24, step: 0.16 }, pulse?: { period: 2.6, step: 0.16 }
//   beats?                        optional per-rank reveal times (scene seconds) from the storyboard
// }
import { header } from './lib/kit.mjs';
import { focusLayout } from '../../engine/archify.mjs';

// Point at distance d along a polyline, and the sub-polyline between distances d0..d1.
function segs(points) {
  const out = [];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    out.push({ x0, y0, x1, y1, len, at: acc });
    acc += len;
  }
  return { list: out, total: acc };
}
function pointAt(S, d) {
  const dd = Math.max(0, Math.min(S.total, d));
  for (const s of S.list) if (dd <= s.at + s.len || s === S.list[S.list.length - 1]) {
    const f = s.len ? (dd - s.at) / s.len : 0;
    return [s.x0 + (s.x1 - s.x0) * f, s.y0 + (s.y1 - s.y0) * f];
  }
  return [S.list[0].x0, S.list[0].y0];
}
function subPolyline(S, d0, d1) {
  const a = Math.max(0, d0), b = Math.min(S.total, d1);
  if (b <= a) return null;
  const pts = [pointAt(S, a)];
  for (const s of S.list) if (s.at > a && s.at < b) pts.push([s.x0, s.y0]);
  pts.push(pointAt(S, b));
  return pts;
}

// Move a polyline's end (or start) out of a rect: drop points inside it, then cut the crossing segment at the border.
function trimEnd(points, r, gap) {
  const inside = ([x, y]) => x > r.x - gap && x < r.x + r.w + gap && y > r.y - gap && y < r.y + r.h + gap;
  const pts = points.slice();
  while (pts.length > 2 && inside(pts[pts.length - 1]) && inside(pts[pts.length - 2])) pts.pop();
  const p1 = pts[pts.length - 1], p0 = pts[pts.length - 2];
  if (!inside(p1) || inside(p0)) return pts;
  let lo = 0, hi = 1; // p0 outside, p1 inside: bisect the border crossing
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (inside([p0[0] + (p1[0] - p0[0]) * m, p0[1] + (p1[1] - p0[1]) * m])) hi = m; else lo = m; }
  pts[pts.length - 1] = [p0[0] + (p1[0] - p0[0]) * lo, p0[1] + (p1[1] - p0[1]) * lo];
  return pts;
}

export default {
  render(ctx, t, api, p) {
    if (!p.layout) throw new Error('archify-diagram: props.layoutFile (or props.layout) is required');
    const L = focusLayout(p.layout, p.focus);
    const { safe, k, s } = api;
    const top = header(api, p);
    const area = { x: safe.x, y: top, w: safe.w, h: safe.y + safe.h - top };

    // Boundary labels get a reserved strip at the top of their boundary (nested boundaries stack),
    // so a label never sits on a node. The strip height is in frame px, so solve for the scale twice.
    const lab = api.layoutText('Ag', { x: 0, y: 0, w: area.w, role: 'small', fixed: true });
    const strip = p.boundaryLabels === false ? 0 : lab.height + s(1);
    const fit = (bs) => {
      const items = [...L.nodes, ...bs];
      const x0 = Math.min(...items.map((n) => n.x)), y0 = Math.min(...items.map((n) => n.y));
      const x1 = Math.max(...items.map((n) => n.x + n.w)), y1 = Math.max(...items.map((n) => n.y + n.h));
      const sc = Math.min(area.w / (x1 - x0), area.h / (y1 - y0));
      return { sc, ox: area.x + (area.w - (x1 - x0) * sc) / 2 - x0 * sc, oy: area.y + (area.h - (y1 - y0) * sc) / 2 - y0 * sc };
    };
    const expand = (sc) => {
      const bySize = L.boundaries.map((b, i) => ({ b, i })).sort((a, c) => a.b.w * a.b.h - c.b.w * c.b.h);
      const top = new Map();
      for (const { b, i } of bySize) {
        const inner = bySize.filter(({ b: o, i: j }) => j !== i && top.has(j) && o.wraps.every((id) => b.wraps.includes(id)));
        const t0 = Math.min(b.y, ...inner.map(({ i: j }) => top.get(j) - s(1) / sc));
        top.set(i, t0 - strip / sc);
      }
      return L.boundaries.map((b, i) => ({ ...b, y: top.get(i), h: b.h + (b.y - top.get(i)) }));
    };
    let F = fit(L.boundaries);
    let bounds = expand(F.sc);
    F = fit(bounds);
    bounds = expand(F.sc);
    F = fit(bounds);
    const { sc, ox, oy } = F;
    const X = (x) => ox + x * sc, Y = (y) => oy + y * sc;
    const R = (n) => ({ x: X(n.x), y: Y(n.y), w: n.w * sc, h: n.h * sc });

    // Node boxes grow (around their centre) only as much as their label needs at the type floor.
    const pad = s(1);
    const labelRole = 'label';
    const need = (n) => api.layoutText(n.label, { x: 0, y: 0, w: Math.max(R(n).w - 2 * pad, 10), role: labelRole, px: 36, fixed: true });
    const rects = new Map(L.nodes.map((n) => {
      const r = R(n);
      const lay = need(n);
      const minW = Math.min(lay.width + 2 * pad, Math.max(r.w, 280 * k)), minH = lay.height + 2 * pad;
      const w = Math.max(r.w, minW), h = Math.max(r.h, minH);
      return [n.id, { x: r.x - (w - r.w) / 2, y: r.y - (h - r.h) / 2, w, h }];
    }));

    // Timing. Ranks are re-based so the first focused rank starts at `start`.
    const start = p.start ?? 0.5, rankStep = p.rankStep ?? 0.45, edgeDraw = p.edgeDraw ?? 0.6;
    const ranks = [...new Set(L.nodes.map((n) => n.rank))].sort((a, b) => a - b);
    const appear = (n) => { const i = ranks.indexOf(n.rank); return p.beats?.[i] ?? start + i * rankStep; };
    const node = new Map(L.nodes.map((n) => [n.id, n]));
    const comet = { period: 1.75, tail: 0.24, step: 0.16, ...(p.comet || {}) };
    const pulse = { period: 2.6, step: 0.16, ...(p.pulse || {}) };
    const lastAppear = Math.max(...L.nodes.map(appear));
    const settled = lastAppear + api.style.motion.enter.dur;

    // 1. Boundaries: dashed outlines, label inside the top-left corner.
    const bIn = api.enter(Math.max(0, start - 0.3));
    for (const b of bounds) {
      const r = R(b);
      for (const id of b.wraps) { // keep grown node boxes inside their boundary
        const n = rects.get(id);
        if (!n) continue;
        const x1 = Math.max(r.x + r.w, n.x + n.w + s(1)), y1 = Math.max(r.y + r.h, n.y + n.h + s(1));
        r.x = Math.min(r.x, n.x - s(1)); r.y = Math.min(r.y, n.y - strip - s(1)); r.w = x1 - r.x; r.h = y1 - r.y;
      }
      api.box({ ...r, stroke: 'line', lineWidth: 3 * k, dash: [10, 8], alpha: bIn.alpha, decor: true });
      if (p.boundaryLabels !== false && b.label) {
        api.text(b.label, { x: r.x + pad, y: r.y + pad * 0.5, w: Math.max(0, r.w - 2 * pad), role: 'small', color: 'muted', alpha: bIn.alpha, fixed: true, allowOverlap: true });
      }
    }

    // 2. Edges: drawn progressively along the routed polyline after the source node appears.
    const edgeGeom = L.edges.map((e) => {
      let pts = e.points.map(([x, y]) => [X(x), Y(y)]);
      pts = trimEnd(pts, rects.get(e.to), 6 * k);
      pts = trimEnd(pts.slice().reverse(), rects.get(e.from), 2 * k).reverse();
      const t0 = Math.max(appear(node.get(e.from)) + 0.25, appear(node.get(e.to)) - edgeDraw * 0.5);
      return { e, pts, S: segs(pts), t0 };
    });
    for (const g of edgeGeom) {
      const pr = api.progress(g.t0, edgeDraw, api.ease.inOutCubic);
      api.line(g.pts, { stroke: 'lineStrong', lineWidth: 3 * k, progress: pr, arrow: pr > 0.02, dash: g.e.variant === 'dashed' ? [10, 8] : undefined });
    }

    // 3. Comets: a short accent tail travelling along each edge, staggered by the edge's step. Loops after settle.
    if (!api.reducedMotion) {
      for (const g of edgeGeom) {
        const t1 = Math.max(settled, g.t0 + edgeDraw) + (g.e.step ?? 0) * comet.step;
        if (t < t1 || g.S.total <= 0) continue;
        const ph = (((t - t1) % comet.period) + comet.period) % comet.period / comet.period; // 0..1
        const head = ph * (1 + comet.tail) * g.S.total; // tail leaves the far end before restarting
        const tail = comet.tail * g.S.total;
        [[1, 0.66, 0.3], [0.66, 0.33, 0.6], [0.33, 0, 1]].forEach(([a0, a1, alpha]) => {
          const pts = subPolyline(g.S, head - tail * a0, head - tail * a1);
          if (pts) api.line(pts, { stroke: 'accent', lineWidth: 5 * k, alpha });
        });
      }
    }

    // 4. Nodes: surface boxes, revealed per rank; a gentle staggered stroke pulse once settled.
    const textPx = Math.min(...L.nodes.map((n) => {
      const r = rects.get(n.id);
      return api.layoutText(n.label, { x: 0, y: 0, w: r.w - 2 * pad, h: r.h - 2 * pad, role: labelRole }).px;
    }));
    for (const n of L.nodes) {
      const r = rects.get(n.id);
      const e = api.enter(appear(n));
      if (e.alpha <= 0) continue;
      let stroke = 'line';
      if (!api.reducedMotion && t > settled) {
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * (t - settled - n.rank * pulse.step)) / pulse.period);
        stroke = api.mixHex(api.palette.line, api.palette.lineStrong, w);
      }
      api.box({ ...r, y: r.y + e.dy, fill: 'surface', stroke, lineWidth: 3 * k, alpha: e.alpha });
      api.text(n.label, { x: r.x + pad, y: r.y + e.dy + pad, w: r.w - 2 * pad, h: r.h - 2 * pad, role: labelRole, px: textPx / k, align: 'center', valign: 'middle', color: 'ink', on: 'surface', alpha: e.alpha, allowOrphan: true });
    }

    // 5. Edge labels on a small plate at Archify's label anchor, after the edge is drawn.
    if (p.edgeLabels !== false) {
      for (const g of edgeGeom) {
        if (!g.e.label) continue;
        const at = g.e.labelAt ? [X(g.e.labelAt[0]), Y(g.e.labelAt[1])] : pointAt(g.S, g.S.total / 2);
        const a = api.progress(g.t0 + edgeDraw * 0.6, 0.4);
        if (a <= 0) continue;
        const lay = api.layoutText(g.e.label, { x: 0, y: 0, w: area.w, role: 'small', fixed: true });
        const bx = at[0] - lay.width / 2 - s(0), by = at[1] - lay.height / 2;
        const plate = { x: bx, y: by, w: lay.width + 2 * s(0), h: lay.height };
        // A label that would cover a node is left out (the edge still reads); see references/archify.md.
        if ([...rects.values()].some((r) => plate.x < r.x + r.w && plate.x + plate.w > r.x && plate.y < r.y + r.h && plate.y + plate.h > r.y)) continue;
        api.box({ x: bx, y: by, w: lay.width + 2 * s(0), h: lay.height, fill: 'bg', radius: 4 * k, alpha: a * 0.9, decor: true });
        api.text(g.e.label, { x: bx + s(0), y: by, w: lay.width + 2, role: 'small', color: 'muted', alpha: a, fixed: true });
      }
    }
  },
};
