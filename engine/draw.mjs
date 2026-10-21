// Drawing API handed to scenes as `api`. Every text draw goes through api.text(), which
// fits it with text-layout.mjs and records it in the frame manifest (QA reads manifests).
import { fitText, layoutAt, REF_PX } from './text-layout.mjs';
import * as ease from './ease.mjs';
import { progress, tween, inOut, lerp, mixHex } from './tween.mjs';
import { hashRandom, mulberry32, seedFrom } from './prng.mjs';

export function makeApi({ ctx, style, palette, format, W, H, safe, minPx, scene, t, reducedMotion, manifest, brand = null }) {
  const k = Math.min(W, H) / 1080; // type scale factor
  const fontCss = (role, o = {}) => {
    const r = style.type[role] || style.type.body;
    const fam = style.fonts[o.font || r.font].family;
    return { family: fam, weight: o.weight ?? r.weight, italic: !!o.italic, lh: o.lineHeight ?? r.lineHeight, px: Math.round((o.px ?? r.px) * k) };
  };
  const cssFont = (f, px) => `${f.italic ? 'italic ' : ''}${f.weight} ${px}px "${f.family}"`;
  const measurer = (f) => {
    ctx.save();
    ctx.font = cssFont(f, REF_PX);
    const cache = new Map();
    const m = (s) => { if (!cache.has(s)) cache.set(s, ctx.measureText(s).width); return cache.get(s); };
    ctx.restore();
    return (s) => { ctx.save(); ctx.font = cssFont(f, REF_PX); const w = m(s); ctx.restore(); return w; };
  };
  // Colour names: style palette keys, or "brand.<key>" for the channel palette. Every colour used is recorded.
  const resolve = (c) => (typeof c === 'string' && c.startsWith('brand.') ? brand?.palette?.[c.slice(6)] : (c && palette[c]) || c) || palette.ink;
  const color = (c) => { const v = resolve(c); if (typeof v === 'string' && v.startsWith('#')) { manifest.colors ||= []; if (!manifest.colors.includes(v)) manifest.colors.push(v); } return v; };
  const dials = { ...(style.dials || {}), ...(scene.dials || {}) }; // per-scene taste dials override the project's
  const intensity = (dials.MOTION_INTENSITY ?? 4) / 4;

  // Fit text in a box without drawing. Highlight markers {{like this}} are stripped.
  function layoutText(str, o = {}) {
    const f = fontCss(o.role || 'body', o);
    const plain = String(str).replace(/\{\{|\}\}/g, '');
    const measure = measurer(f);
    const floor = Math.max(minPx, Math.round((o.minPx ?? 0) * k));
    const lay = o.fixed
      ? { ...layoutAt(plain, f.px, { maxWidth: o.w, lineHeight: f.lh, measure, balance: o.balance !== false }), fits: true }
      : fitText(plain, { maxWidth: o.w, maxHeight: o.h ?? Infinity, maxPx: Math.max(f.px, floor), minPx: floor, lineHeight: f.lh, measure, balance: o.balance !== false });
    if (o.fixed) lay.fits = lay.width <= o.w + 0.5 && lay.height <= (o.h ?? Infinity) + 0.5;
    const h = o.h ?? lay.height;
    const top = o.y + (o.valign === 'middle' ? (h - lay.height) / 2 : o.valign === 'bottom' ? h - lay.height : 0);
    const left = o.x + (o.align === 'center' ? (o.w - lay.width) / 2 : o.align === 'right' ? o.w - lay.width : 0);
    return { ...lay, f, measure, box: { x: left, y: top, w: lay.width, h: lay.height }, plain };
  }

  // Draw text. o: {x,y,w,h, role, align, valign, color, on, alpha, font, weight, italic, px, minPx,
  //               highlight (colour for {{marked}} words), revealWords (number of words shown)}
  function text(str, o = {}) {
    const lay = layoutText(str, o);
    const alpha = (o.alpha ?? 1) * ctx.globalAlpha;
    const fg = color(o.color);
    // Per-character highlight map ({{…}} may mark part of a word, e.g. the 4 in "Dr{{4}}w").
    const { chars: hl } = markedChars(String(str));
    const flat = lay.plain.replace(/\s+/g, ' ').trim();
    const words = flat.split(' ').filter(Boolean);
    const shown = o.revealWords ?? Infinity;
    const anyMark = hl.some(Boolean);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textBaseline = 'middle';
    let cursor = 0, wi = 0; // position in `flat` (lines are its space-separated slices, in order)
    lay.lines.forEach((line, i) => {
      const lx = o.x + (o.align === 'center' ? (o.w - line.width) / 2 : o.align === 'right' ? o.w - line.width : 0);
      const ly = lay.box.y + i * lay.lineHeight + lay.lineHeight / 2;
      ctx.font = cssFont(lay.f, lay.px);
      const start = flat.indexOf(line.text, cursor);
      const base = start < 0 ? cursor : start;
      cursor = base + line.text.length;
      if (!anyMark && shown >= words.length) { ctx.fillStyle = fg; ctx.fillText(line.text, lx, ly); wi += line.text.split(' ').length; return; }
      // Runs of characters sharing (highlight, word index); x advances by the measured prefix width.
      let x = lx, run = '', runKey = null;
      const flush = () => {
        if (!run) return;
        const [m, w] = runKey;
        const vis = Math.max(0, Math.min(1, shown - w));
        if (vis > 0 && run.trim()) { ctx.globalAlpha = alpha * vis; ctx.fillStyle = m ? color(o.highlight || 'accent') : fg; ctx.fillText(run, x, ly); }
        x += (lay.measure(run) * lay.px) / REF_PX;
        run = '';
      };
      for (let c = 0; c < line.text.length; c++) {
        const ch = line.text[c];
        if (ch === ' ' && c > 0 && line.text[c - 1] !== ' ') wi++;
        const key = [!!hl[base + c], wi];
        if (runKey && (key[0] !== runKey[0] || key[1] !== runKey[1])) flush();
        runKey = key;
        run += ch;
      }
      flush();
      wi++;
    });
    ctx.restore();
    manifest.texts.push({
      text: lay.plain, role: o.role || 'body', ...round(lay.box), px: lay.px, minPx: Math.max(minPx, Math.round((o.minPx ?? 0) * k)),
      fg, on: color(o.on || 'bg'), alpha: +alpha.toFixed(3), fits: lay.fits, orphan: lay.orphan && !o.allowOrphan,
      lines: lay.lines.length, allowOutsideSafe: !!o.allowOutsideSafe, allowOverlap: !!o.allowOverlap,
    });
    return lay;
  }

  function box({ x, y, w, h, fill, stroke, lineWidth = style.stroke.base * k, radius = style.radius * k, alpha = 1, dash, decor = false }) {
    if (!decor && ctx.globalAlpha * alpha > 0.05) (manifest.shapes ||= []).push(round({ x, y, w, h }));
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    if (fill) { ctx.fillStyle = color(fill); ctx.fill(); }
    if (stroke) { ctx.strokeStyle = color(stroke); ctx.lineWidth = lineWidth; if (dash) ctx.setLineDash(dash.map((d) => d * k)); ctx.stroke(); }
    ctx.restore();
  }

  function circle({ x, y, r, fill, stroke, lineWidth = style.stroke.base * k, alpha = 1 }) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = color(fill); ctx.fill(); }
    if (stroke) { ctx.strokeStyle = color(stroke); ctx.lineWidth = lineWidth; ctx.stroke(); }
    ctx.restore();
  }

  // Polyline drawn up to `progress` (0..1) of its length; optional arrowhead at the end.
  function line(points, { stroke = 'lineStrong', lineWidth = style.stroke.base * k, progress: p = 1, alpha = 1, arrow = false, dash, head = 14 * k } = {}) {
    if (p <= 0) return;
    const segs = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1], [x1, y1] = points[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      segs.push({ x0, y0, x1, y1, len });
      total += len;
    }
    let remaining = total * Math.min(1, p);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color(stroke);
    ctx.fillStyle = color(stroke);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash.map((d) => d * k));
    ctx.beginPath();
    ctx.moveTo(segs[0].x0, segs[0].y0);
    let end = [segs[0].x0, segs[0].y0], dir = [1, 0];
    for (const s of segs) {
      if (remaining <= 0) break;
      const f = Math.min(1, remaining / s.len);
      end = [lerp(s.x0, s.x1, f), lerp(s.y0, s.y1, f)];
      dir = [(s.x1 - s.x0) / s.len, (s.y1 - s.y0) / s.len];
      ctx.lineTo(end[0], end[1]);
      remaining -= s.len;
    }
    ctx.stroke();
    if (arrow) {
      ctx.setLineDash([]);
      const [ex, ey] = end, [dx, dy] = dir;
      ctx.beginPath();
      ctx.moveTo(ex + dx * 2 * k, ey + dy * 2 * k);
      ctx.lineTo(ex - dx * head - dy * head * 0.55, ey - dy * head + dx * head * 0.55);
      ctx.lineTo(ex - dx * head + dy * head * 0.55, ey - dy * head - dx * head * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Standard entrance: fade + small rise, scaled by MOTION_INTENSITY; fade only when reducedMotion.
  function enter(start, { dur = style.motion.enter.dur, rise = style.motion.enter.rise } = {}) {
    const p = progress(t, start, dur, ease[style.motion.enter.ease] || ease.house);
    return { alpha: p, dy: reducedMotion ? 0 : (1 - p) * rise * k * intensity };
  }

  const rng = mulberry32(seedFrom(scene.id));
  return {
    ctx, W, H, k, t, format, safe, palette, style, scene, duration: scene.duration, reducedMotion, manifest, brand, dials,
    keepout: (b) => (manifest.keepout ||= []).push(round(b)), // regions reserved for YouTube end-screen elements
    mark: (b, clear) => (manifest.marks ||= []).push({ ...round(b), clear: Math.round(clear) }), // wordmark + clear space
    text, layoutText, box, circle, line, enter, color,
    // Raw width in px of a string at a role/font size, trailing spaces included (layoutText trims them).
    measure: (str, o = {}) => { const f = fontCss(o.role || 'body', o); return (measurer(f)(String(str)) * f.px) / REF_PX; },
    ease, progress: (a, d, e) => progress(t, a, d, e), tween: (a, d, from, to, e) => tween(t, a, d, from, to, e),
    inOut: (a, b, d, e) => inOut(t, a, b, d, e), lerp, mixHex,
    random: (i) => hashRandom(seedFrom(scene.id), i), rng,
    s: (i) => style.space[i] * k, // spacing token
  };
}

// {{marked}} spans → boolean per character of the whitespace-normalised plain text.
export function markedChars(str) {
  const chars = [];
  let inMark = false, prevSpace = true;
  for (const tok of String(str).split(/(\{\{|\}\})/)) {
    if (tok === '{{') { inMark = true; continue; }
    if (tok === '}}') { inMark = false; continue; }
    for (const ch of tok) {
      if (/\s/.test(ch)) { if (!prevSpace) { chars.push(false); prevSpace = true; } continue; }
      chars.push(inMark); prevSpace = false;
    }
  }
  if (chars.length && prevSpace) chars.pop();
  return { chars };
}

const round = (b) => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) });
