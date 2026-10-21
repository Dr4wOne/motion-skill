// A short list of names, each with a status mark (?, tick, dash) and an optional note. Optional prompt panel on the
// left (a typed prompt that mentions the names), which hands over to a footer command at the last beat.
// props: { kicker?, heading?, prompt?: text (mono, in a panel), footer?: command (mono, replaces the prompt),
//   rows: [{ name, code?: bool (mono), mark: 'unknown' | 'yes' | 'no', note?, accent?: bool }], beats? }
// beats: [rows, marks, footer?] — rows enter staggered at beat 0, marks at beat 1, footer at beat 2.
import { beat, header, vertical } from './lib/kit.mjs';

export const meta = { name: 'status-list', beats: ['rows', 'marks', 'footer?'] };

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const v = vertical(api);
    const n = 2 + (p.footer ? 1 : 0);
    const b0 = beat(api, p, 0, n), b1 = beat(api, p, 1, n), b2 = p.footer ? beat(api, p, 2, n) : Infinity;
    const bottom = safe.y + safe.h;
    let list = { x: safe.x, y: top, w: safe.w, h: bottom - top };
    if (p.prompt) {
      // Prompt panel: left 52% (16:9) or top half (9:16).
      const promptH = api.layoutText(p.prompt, { x: 0, y: 0, w: safe.w - 2 * s(4), role: 'mono', font: 'mono', balance: false }).height;
      const panel = v ? { x: safe.x, y: top, w: safe.w, h: Math.min((bottom - top) * 0.45, promptH + 2 * s(4)) } : { x: safe.x, y: top, w: safe.w * 0.52, h: bottom - top };
      if (v) { // centre panel + list (rows at 1.5 leading) in the area under the heading
        const rowsH = Math.min(p.rows.length * 76 * k, bottom - top - panel.h - s(5)); // 1.5 leading when it fits
        panel.y += Math.max(0, (bottom - top - panel.h - s(5) - rowsH) / 2);
      }
      list = v ? { x: safe.x, y: panel.y + panel.h + s(5), w: safe.w, h: Math.min(p.rows.length * 76 * k, bottom - panel.y - panel.h - s(5)) } : { x: panel.x + panel.w + s(6), y: top, w: safe.x + safe.w - panel.x - panel.w - s(6), h: bottom - top };
      const e = api.enter(0.15);
      api.box({ ...panel, fill: 'surface', alpha: e.alpha });
      const pad = s(4);
      const fade = p.footer ? 1 - api.progress(b2, 0.25) : 1;
      if (fade > 0.01) api.text(p.prompt, { x: panel.x + pad, y: panel.y + pad, w: panel.w - 2 * pad, h: panel.h - 2 * pad - (p.footer && !v ? 80 * k : 0), role: 'mono', font: 'mono', on: 'surface', alpha: e.alpha * fade, balance: false, allowOrphan: true });
      if (p.footer) {
        const ef = api.enter(b2 + 0.3);
        const fy = v ? panel.y + pad : panel.y + panel.h - pad - 60 * k; // 9:16: replaces the prompt in place
        const lay = api.text(p.footer, { x: panel.x + pad, y: fy + ef.dy, w: panel.w - 2 * pad, role: 'mono', font: 'mono', px: 52, on: 'surface', alpha: ef.alpha, fixed: true });
        // Block cursor after the command (steady, no blinking loop).
        api.box({ x: panel.x + pad + lay.width + 10 * k, y: fy + ef.dy + 8 * k, w: 26 * k, h: lay.height - 16 * k, fill: 'accent', radius: 2 * k, alpha: ef.alpha, decor: true });
      }
    }
    // Rows: name | mark | note. One row height for all.
    const m = p.rows.length;
    const nameRole = p.prompt ? 'label' : 'heading';
    const rowH = Math.min((p.prompt ? 104 : 130) * k, list.h / m);
    const nameW = p.prompt || v ? list.w * 0.62 : list.w * 0.3;
    const markW = 90 * k;
    let y = list.y + Math.max(0, (list.h - m * rowH) / 2);
    p.rows.forEach((r, i) => {
      const e = api.enter(b0 + i * 0.09);
      const yy = y + e.dy;
      const font = r.code ? 'mono' : undefined;
      const lay = api.text(r.name, { x: list.x, y: yy, w: nameW, role: nameRole, font, color: 'ink', alpha: e.alpha, fixed: true });
      const cy = yy + lay.height / 2;
      const em = api.enter(b1 + i * 0.09, { rise: 0 });
      const mx = v ? list.x + lay.width + 24 * k + markW / 2 : list.x + nameW + markW / 2; // 9:16: mark right after its name
      const col = r.accent || r.mark === 'unknown' || r.mark === 'yes' ? 'accent' : 'lineStrong';
      if (r.mark === 'unknown') {
        const q = api.layoutText('?', { x: 0, y: 0, w: markW, role: nameRole, fixed: true });
        api.text('?', { x: mx - markW / 2, y: cy - q.height / 2, w: markW, role: nameRole, weight: 700, color: 'accent', align: 'center', alpha: em.alpha, fixed: true });
      } else if (r.mark === 'yes') {
        const tick = api.progress(b1 + i * 0.09, 0.35, api.ease.inOutCubic);
        api.line([[mx - 20 * k, cy + 2 * k], [mx - 6 * k, cy + 16 * k], [mx + 22 * k, cy - 16 * k]], { stroke: col, lineWidth: 6 * k, progress: tick, alpha: em.alpha });
      } else if (r.mark === 'no') {
        api.line([[mx - 20 * k, cy], [mx + 20 * k, cy]], { stroke: col, lineWidth: 6 * k, progress: api.progress(b1 + i * 0.09, 0.3), alpha: em.alpha });
      }
      if (r.note && !(p.prompt || v)) {
        api.text(r.note, { x: list.x + nameW + markW + s(3), y: cy - 34 * k, w: list.w - nameW - markW - s(3), h: 68 * k, valign: 'middle', role: 'body', color: r.mark === 'no' ? 'muted' : 'ink', alpha: em.alpha });
      }
      y += rowH;
    });
  },
};
