// Channel brand helpers for intro/outro templates. Everything reads api.brand (brand/brand.json + links).
export const B = (k) => `brand.${k}`; // brand palette colour name for api.text/box/line

const LABEL = { youtube: 'YouTube', 'x/twitter': 'X', github: 'GitHub', linkedin: 'LinkedIn', blog: 'Blog', website: 'Web' };
export const linkLabel = (platform) => LABEL[platform] || platform;

// Wordmark from brand.json (Space Grotesk 700; characters wrapped in {{ }} take the accent). cap = cap height in px. Records clear space = cap.
// opts.chars (0..len) reveals characters progressively; opts.alpha fades.
export function wordmark(api, { cx, cy, cap = 120, alpha = 1, chars, color = B('ink'), accent = B('accent'), align = 'center' }) {
  const px = cap / 0.7; // Space Grotesk cap height ≈ 0.7 em
  const text = api.brand?.wordmark?.marked || api.brand?.wordmark?.text || 'Your Channel';
  const plain = text.replace(/\{\{|\}\}/g, '');
  const lay = api.layoutText(plain, { x: 0, y: 0, w: api.W, role: 'title', font: 'brand', weight: 700, px: px / api.k, fixed: true });
  const x = align === 'center' ? cx - lay.width / 2 : cx;
  const y = cy - lay.height / 2;
  const words = plain.split(' ').length;
  api.text(text, { x, y, w: lay.width + 4, role: 'title', font: 'brand', weight: 700, px: px / api.k, color, highlight: accent, alpha, fixed: true, revealWords: chars == null ? undefined : (chars / plain.length) * words });
  const box = { x, y, w: lay.width, h: lay.height };
  if (alpha > 0.05) api.mark(box, cap);
  return box;
}

// Link rows: label (muted) + display text (ink). at[i] = reveal time of row i (scene seconds).
export function linkRows(api, { x, y, w, rowGap = 18, at = [], font = 'serif', labelW = 200, size = 'label' }) {
  const rows = [];
  let yy = y;
  (api.brand?.links || []).forEach((l, i) => {
    const e = api.enter(at[i] ?? 0.3 + i * 0.15);
    const lab = api.text(linkLabel(l.platform), { x, y: yy + e.dy, w: labelW, role: size, font, color: B('muted'), alpha: e.alpha, fixed: true });
    const d = api.text(l.display, { x: x + labelW, y: yy + e.dy, w: w - labelW, role: size, font, color: B('ink'), alpha: e.alpha, fixed: true });
    rows.push({ x, y: yy, w, h: Math.max(lab.height, d.height) });
    yy += Math.max(lab.height, d.height) + rowGap * api.k;
  });
  return rows;
}

// Reserve the YouTube end-screen element regions (keep-out for QA). preview: dashed outlines only (no text).
export function endScreen(api, { preview = false, alpha = 1, from = 0 } = {}) {
  const es = api.brand?.endScreen?.[api.format];
  if (!es || api.t < from) return es;
  for (const v of es.videos) {
    api.keepout(v);
    if (preview) api.box({ ...v, stroke: B('lineStrong'), dash: [14, 10], lineWidth: 2 * api.k, alpha, decor: true });
  }
  if (es.subscribe) {
    const s = es.subscribe;
    api.keepout({ x: s.cx - s.r, y: s.cy - s.r, w: 2 * s.r, h: 2 * s.r });
    if (preview) { api.ctx.save(); api.ctx.globalAlpha *= alpha; api.ctx.setLineDash([12 * api.k, 10 * api.k]); api.circle({ x: s.cx, y: s.cy, r: s.r, stroke: B('lineStrong'), lineWidth: 2 * api.k }); api.ctx.restore(); }
  }
  return es;
}

// Left column free of end-screen slots (16:9): where outro text and links may go.
export function freeColumn(api) {
  const es = api.brand?.endScreen?.[api.format];
  const right = es ? Math.min(...es.videos.map((v) => v.x), es.subscribe ? es.subscribe.cx - es.subscribe.r : Infinity) - api.s(5) : api.safe.x + api.safe.w;
  return { x: api.safe.x, y: api.safe.y, w: right - api.safe.x, h: api.safe.h };
}
