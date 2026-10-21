// Normalise Archify layout JSON (`archify inspect architecture x.json` or
// `archify validate workflow x.json --layout-json`) into the layout the `archify-diagram`
// template draws. Pure and dependency-free: same input → same output (tested).
//
// Output (layout units = Archify's viewBox units; the template scales them to the frame):
// { version: 1, source: { tool: 'archify', type, spec? },
//   viewBox: { w, h },
//   nodes:      [{ id, label, sublabel?, type?, lane?, x, y, w, h, rank }],
//   boundaries: [{ id, kind, label, x, y, w, h, wraps: [nodeId] }],
//   edges:      [{ id, from, to, label?, variant, points: [[x, y], …], labelAt?: [x, y], length, step }],
//   labels:     [{ text, x, y, w, h }] }
// rank = breadth-first depth from the nodes with no incoming edge (reveal order);
// step = the edge's position in reveal order (sorted by source rank, then input order).

const r2 = (v) => Math.round(v * 100) / 100;
const num = (v, what) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`archify layout: ${what} is not a finite number`);
  return v;
};

function viewBoxOf(vb) {
  if (Array.isArray(vb) && vb.length === 2) return { w: num(vb[0], 'viewBox w'), h: num(vb[1], 'viewBox h') };
  if (Array.isArray(vb) && vb.length === 4) return { w: num(vb[2], 'viewBox w'), h: num(vb[3], 'viewBox h') };
  if (vb && typeof vb === 'object') return { w: num(vb.w ?? vb.width, 'viewBox w'), h: num(vb.h ?? vb.height, 'viewBox h') };
  throw new Error('archify layout: missing viewBox');
}

export function polylineLength(points) {
  let n = 0;
  for (let i = 1; i < points.length; i++) n += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return n;
}

// raw: Archify's JSON. spec (optional): the Archify input spec, used for labels Archify's
// layout report leaves out (workflow node labels, sublabels, lane names, edge labels).
export function normalizeArchify(raw, spec = null, { specName } = {}) {
  if (!raw || typeof raw !== 'object') throw new Error('archify layout: not an object');
  if (raw.ok === false) throw new Error(`archify layout: archify reported ok:false${raw.error ? ` (${String(raw.error.message || raw.error).slice(0, 200)})` : ''}`);
  const type = raw.diagram_type || spec?.diagram_type || (raw.contract ? 'workflow' : 'architecture');
  const specNodes = new Map([...(spec?.components || []), ...(spec?.nodes || [])].map((n) => [n.id, n]));
  const specEdges = spec?.connections || spec?.edges || [];

  const rawNodes = raw.components || raw.nodes;
  if (!Array.isArray(rawNodes) || !rawNodes.length) throw new Error('archify layout: no components/nodes');
  const nodes = rawNodes.map((n, i) => {
    if (!n.id) throw new Error(`archify layout: node ${i} has no id`);
    const s = specNodes.get(n.id) || {};
    const out = {
      id: String(n.id),
      label: String(n.label ?? s.label ?? n.id),
      x: r2(num(n.x, `${n.id}.x`)), y: r2(num(n.y, `${n.id}.y`)),
      w: r2(num(n.width ?? n.w, `${n.id}.width`)), h: r2(num(n.height ?? n.h, `${n.id}.height`)),
    };
    if (s.sublabel) out.sublabel = String(s.sublabel);
    if (n.type ?? s.type) out.type = String(n.type ?? s.type);
    if (n.lane ?? s.lane) out.lane = String(n.lane ?? s.lane);
    return out;
  });
  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length) throw new Error('archify layout: duplicate node ids');
  const byId = new Map(nodes.map((n) => [n.id, n]));

  let boundaries = (raw.boundaries || []).map((b, i) => ({
    id: b.id ? String(b.id) : `b${i + 1}`, kind: String(b.kind || 'group'), label: String(b.label || ''),
    x: r2(num(b.x, `boundary ${i}.x`)), y: r2(num(b.y, `boundary ${i}.y`)),
    w: r2(num(b.width ?? b.w, `boundary ${i}.width`)), h: r2(num(b.height ?? b.h, `boundary ${i}.height`)),
    wraps: (b.wraps || []).map(String).filter((id) => ids.has(id)),
  }));
  // Workflow layouts carry lanes only by id: draw each lane as a boundary around its nodes.
  if (!boundaries.length && Array.isArray(spec?.lanes)) {
    boundaries = spec.lanes.map((lane) => {
      const ns = nodes.filter((n) => n.lane === lane.id);
      if (!ns.length) return null;
      const pad = 14;
      const x0 = Math.min(...ns.map((n) => n.x)) - pad, y0 = Math.min(...ns.map((n) => n.y)) - pad;
      const x1 = Math.max(...ns.map((n) => n.x + n.w)) + pad, y1 = Math.max(...ns.map((n) => n.y + n.h)) + pad;
      return { id: `lane-${lane.id}`, kind: 'lane', label: String(lane.label || lane.id), x: r2(x0), y: r2(y0), w: r2(x1 - x0), h: r2(y1 - y0), wraps: ns.map((n) => n.id) };
    }).filter(Boolean);
  }

  const rawEdges = raw.connections || raw.edges || [];
  const edges = rawEdges.map((e, i) => {
    const from = String(e.from), to = String(e.to);
    if (!byId.has(from) || !byId.has(to)) throw new Error(`archify layout: edge ${i} (${from} → ${to}) references an unknown node`);
    if (!Array.isArray(e.points) || e.points.length < 2) throw new Error(`archify layout: edge ${i} (${from} → ${to}) has fewer than 2 points`);
    const points = e.points.map(([x, y], j) => [r2(num(x, `edge ${i} point ${j} x`)), r2(num(y, `edge ${i} point ${j} y`))]);
    const s = specEdges[i] && specEdges[i].from === e.from && specEdges[i].to === e.to ? specEdges[i] : {};
    const out = { id: e.id ? String(e.id) : `${from}->${to}#${i}`, from, to, variant: String(e.variant || s.variant || 'default'), points, length: r2(polylineLength(points)) };
    const label = e.label ?? s.label;
    if (label) out.label = String(label);
    if (Array.isArray(e.labelAt)) out.labelAt = [r2(num(e.labelAt[0], `edge ${i} labelAt`)), r2(num(e.labelAt[1], `edge ${i} labelAt`))];
    return out;
  });

  // Reveal order: BFS depth from roots (no incoming edge). Unreached nodes (pure cycles) go last.
  const incoming = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) if (e.from !== e.to) incoming.set(e.to, incoming.get(e.to) + 1);
  const rank = new Map();
  let frontier = nodes.filter((n) => incoming.get(n.id) === 0).map((n) => n.id);
  if (!frontier.length) frontier = [nodes[0].id];
  for (let d = 0; frontier.length; d++) {
    const next = [];
    for (const id of frontier) {
      if (rank.has(id)) continue;
      rank.set(id, d);
      for (const e of edges) if (e.from === id && !rank.has(e.to)) next.push(e.to);
    }
    frontier = next;
  }
  const maxRank = Math.max(0, ...rank.values());
  for (const n of nodes) n.rank = rank.has(n.id) ? rank.get(n.id) : maxRank + 1;
  edges.map((e, i) => ({ e, i, r: byId.get(e.from).rank }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .forEach(({ e }, step) => { e.step = step; });

  const labels = (raw.labels || []).map((l) => ({
    text: String(l.text ?? l.label ?? ''), x: r2(num(l.x, 'label x')), y: r2(num(l.y, 'label y')), w: r2(num(l.width ?? l.w, 'label width')), h: r2(num(l.height ?? l.h, 'label height')),
  })).filter((l) => l.text);

  const source = { tool: 'archify', type };
  if (specName) source.spec = specName;
  return { version: 1, source, viewBox: viewBoxOf(raw.viewBox), nodes, boundaries, edges, labels };
}

// Keep only `focus` nodes (ids), the edges between them, and boundaries re-fitted around the
// focused nodes they wrap (same padding per side as in the original). Returns a new layout.
export function focusLayout(layout, focus) {
  if (!focus || !focus.length) return layout;
  const keep = new Set(focus);
  const nodes = layout.nodes.filter((n) => keep.has(n.id));
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const bbox = (ns) => ({ x0: Math.min(...ns.map((n) => n.x)), y0: Math.min(...ns.map((n) => n.y)), x1: Math.max(...ns.map((n) => n.x + n.w)), y1: Math.max(...ns.map((n) => n.y + n.h)) });
  const boundaries = layout.boundaries.map((b) => {
    const all = b.wraps.map((id) => byId.get(id)).filter(Boolean);
    const kept = all.filter((n) => keep.has(n.id));
    if (!kept.length) return null;
    const o = bbox(all), k = bbox(kept);
    const pad = { l: o.x0 - b.x, t: o.y0 - b.y, r: b.x + b.w - o.x1, b: b.y + b.h - o.y1 };
    return { ...b, x: k.x0 - pad.l, y: k.y0 - pad.t, w: k.x1 - k.x0 + pad.l + pad.r, h: k.y1 - k.y0 + pad.t + pad.b, wraps: kept.map((n) => n.id) };
  }).filter(Boolean);
  const edges = layout.edges.filter((e) => keep.has(e.from) && keep.has(e.to));
  return { ...layout, nodes, boundaries, edges, labels: [] };
}
