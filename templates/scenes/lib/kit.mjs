// Shared building blocks for scene templates.

// Reveal time of beat i of n. Storyboard/sync may set props.beats (seconds, scene-local);
// otherwise beats are spread evenly between `lead` and `duration - tail`.
export function beat(api, p, i, n, { lead = 0.6, tail = 1.6 } = {}) {
  if (p.beats && p.beats[i] != null) return p.beats[i];
  const span = Math.max(0.4, api.duration - lead - tail);
  return lead + (n <= 1 ? 0 : (i * span) / (n - 1));
}

// Kicker + heading at the top of the safe area. Returns the y below the header.
export function header(api, p, { at = 0.15, align = 'left' } = {}) {
  const { safe, s } = api;
  let y = safe.y;
  if (!p.kicker && !p.heading) return y;
  const e = api.enter(at);
  const kickH = api.layoutText('Kicker', { x: 0, y: 0, w: safe.w, role: 'label', fixed: true }).height;
  if (p.kicker) api.text(p.kicker, { x: safe.x, y: y + e.dy, w: safe.w, role: 'label', color: 'muted', alpha: e.alpha, align });
  y += kickH + s(1); // reserved even without a kicker, so headings line up across scenes
  if (p.heading) {
    const e2 = api.enter(at + 0.15);
    const lay = api.text(p.heading, { x: safe.x, y: y + e2.dy, w: safe.w, h: api.format === '9:16' ? 260 * api.k : 180 * api.k, role: 'heading', alpha: e2.alpha, align });
    y += lay.height;
  }
  return y + s(4);
}

// A labelled box. Returns its rect. state: 'idle' | 'active' | 'dim'
export function node(api, { x, y, w, h, label, sub, alpha = 1, state = 'idle', font, align = 'center', labelRole = 'label', labelPx }) {
  if (alpha <= 0) return { x, y, w, h };
  const active = state === 'active';
  api.box({ x, y, w, h, fill: active ? 'surface2' : 'surface', stroke: active ? 'accent' : 'line', alpha, lineWidth: (active ? 4 : 2) * api.k });
  const pad = api.s(1);
  const inner = { x: x + pad, w: w - 2 * pad };
  const avail = h - 2 * pad;
  const px = labelPx ? labelPx / api.k : undefined; // shared size across sibling nodes
  const labLay = api.layoutText(label, { ...inner, y: 0, h: sub ? avail * 0.6 : avail, role: labelRole, font, px });
  const subH = sub ? avail - labLay.height - api.s(0) : 0;
  const subLay = sub ? api.layoutText(sub, { ...inner, y: 0, h: subH, role: 'small' }) : null;
  const total = labLay.height + (subLay ? subLay.height + api.s(0) : 0);
  const ty = y + (h - total) / 2;
  const on = active ? 'surface2' : 'surface';
  api.text(label, { ...inner, y: ty, h: sub ? avail * 0.6 : avail, role: labelRole, font, px, align, alpha, color: state === 'dim' ? 'muted' : 'ink', on });
  if (sub) api.text(sub, { ...inner, y: ty + labLay.height + api.s(0), h: subH, role: 'small', align, alpha, color: 'muted', on });
  return { x, y, w, h };
}

// Arrow from the edge of rect a to the edge of rect b (along the centre line).
export function arrowBetween(api, a, b, { progress = 1, stroke = 'lineStrong', gap = 10, alpha = 1, dash } = {}) {
  const ca = [a.x + a.w / 2, a.y + a.h / 2], cb = [b.x + b.w / 2, b.y + b.h / 2];
  const pa = edgePoint(a, cb, gap * api.k), pb = edgePoint(b, ca, gap * api.k);
  api.line([pa, pb], { stroke, progress, arrow: true, alpha, dash });
  return [pa, pb];
}

export function edgePoint(r, toward, gap = 0) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const dx = toward[0] - cx, dy = toward[1] - cy;
  if (!dx && !dy) return [cx, cy];
  const sx = dx ? (r.w / 2) / Math.abs(dx) : Infinity, sy = dy ? (r.h / 2) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  const len = Math.hypot(dx, dy);
  return [cx + dx * s + (dx / len) * gap, cy + dy * s + (dy / len) * gap];
}

// Even split of `total` into n cells with `gap` between: returns [{start, size}]
export function cells(start, total, n, gap) {
  const size = (total - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ start: start + i * (size + gap), size }));
}

export const vertical = (api) => api.format === '9:16';
