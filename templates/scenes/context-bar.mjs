// The /context budget: one bar for the whole window (used share filled), a "baseline" pin, one row per category
// with its tokens, and an addition (e.g. a tool's rules) that toggles on and grows the bar.
// props: { kicker?, heading?, window: tokens, rows: [{ label, tokens }], add?: { label, tokens }, pin?: 'Baseline',
//   usedLabel?: 'Used {used} of {window} tokens', note?, beats? } — beats: [rows, pin, add]
import { beat, header, vertical } from './lib/kit.mjs';

export const meta = { name: 'context-bar', beats: ['rows', 'pin', 'add'] };

const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); // 27500 → 27,500 (locale-free)

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top0 = header(api, p);
    const rowsN = p.rows.length + (p.add ? 1 : 0), noteH0 = p.note ? 64 * k : 0;
    const fixedH = 50 * k + s(1) + 44 * k + s(5) + s(2) + noteH0;
    const rowH = Math.min(70 * k, (safe.y + safe.h - top0 - fixedH) / rowsN); // never past the caption band
    const groupH = fixedH + rowsN * rowH;
    const top = top0 + Math.max(0, (safe.y + safe.h - top0 - groupH) / 2); // centre the group under the heading
    const v = vertical(api);
    const n = 3;
    const b0 = beat(api, p, 0, n), b1 = beat(api, p, 1, n), b2 = p.add ? beat(api, p, 2, n) : Infinity;
    const base = p.rows.reduce((a, r) => a + r.tokens, 0);
    const addOn = p.add ? api.progress(b2, 0.8, api.ease.inOutCubic) : 0;
    const count = api.progress(b0, 1.2, api.ease.inOutCubic);
    const used = base * count + (p.add ? p.add.tokens * addOn : 0);
    // Summary (right-aligned) above the window bar; pin label on the left of the same line.
    const e0 = api.enter(b0 - 0.2);
    const sumTxt = (p.usedLabel || 'Used {used} of {window} tokens').replace('{used}', fmt(used)).replace('{window}', fmt(p.window));
    const sl = api.text(sumTxt, { x: safe.x, y: top + e0.dy, w: safe.w, role: 'label', align: 'right', color: 'ink', alpha: e0.alpha, fixed: true });
    const barY = top + sl.height + s(1), barH = 44 * k;
    api.box({ x: safe.x, y: barY, w: safe.w, h: barH, fill: 'surface', radius: 4 * k, alpha: e0.alpha, decor: true });
    const fw = (safe.w * base * count) / p.window;
    if (fw > 1) api.box({ x: safe.x, y: barY, w: fw, h: barH, fill: 'muted', radius: 4 * k, alpha: e0.alpha, decor: true });
    if (addOn > 0) api.box({ x: safe.x + fw, y: barY, w: Math.max(4 * k, (safe.w * p.add.tokens * addOn) / p.window), h: barH, fill: 'accent', radius: 2 * k, decor: true });
    if (p.pin) {
      const ep = api.enter(b1, { rise: 0 });
      const px = safe.x + (safe.w * base) / p.window;
      api.line([[px, barY - 14 * k], [px, barY + barH + 14 * k]], { stroke: 'accent', lineWidth: 6 * k, alpha: ep.alpha });
      api.text(p.pin, { x: safe.x, y: top + ep.dy, w: Math.max(240 * k, px - safe.x + 120 * k), role: 'label', color: 'accent', alpha: ep.alpha, fixed: true });
    }
    // Category rows
    const rows = p.add ? [...p.rows, { ...p.add, added: true }] : p.rows;
    const labelW = (v ? 0.5 : 0.24) * safe.w, valW = (v ? 0.3 : 0.14) * safe.w;
    const barX = safe.x + labelW, barW = safe.w - labelW - valW - s(3);
    const max = Math.max(...rows.map((r) => r.tokens));
    const noteH = p.note ? 64 * k : 0;
    const ry0 = barY + barH + s(5);
    rows.forEach((r, i) => {
      const at = r.added ? b2 : b0 + 0.1 + i * 0.08;
      const e = api.enter(at);
      if (e.alpha <= 0) return;
      const y = ry0 + i * rowH + e.dy;
      api.text(r.label, { x: safe.x, y, w: labelW - s(2), h: rowH, valign: 'middle', role: 'label', color: r.added ? 'ink' : 'ink', alpha: e.alpha, fixed: true });
      const grow = api.progress(at + 0.1, 0.7, api.ease.inOutCubic);
      api.box({ x: barX, y: y + rowH * 0.28, w: Math.max(6 * k, (barW * r.tokens * grow) / max), h: rowH * 0.44, fill: r.added ? 'accent' : 'lineStrong', radius: 3 * k, alpha: e.alpha, decor: true });
      api.text(fmt(r.tokens * Math.min(1, grow * 1.1)), { x: safe.x + safe.w - valW, y, w: valW, h: rowH, valign: 'middle', role: 'label', font: 'mono', align: 'right', color: r.added ? 'accent' : 'ink', alpha: e.alpha, fixed: true });
    });
    if (p.note) {
      const en = api.enter(b0 + 0.8);
      api.text(p.note, { x: safe.x, y: ry0 + rows.length * rowH + s(2) + en.dy, w: safe.w, h: noteH - s(1), role: 'label', color: 'muted', alpha: en.alpha });
    }
  },
};
