// A pile that grows: tool blocks stack up on the right while a statement and then a question sit on the left.
// Blocks are all the same size on purpose (no data is implied).
// props: { kicker?, heading?, statement, items: [names], question, saved?: { label, pileLabel, units }, note?, beats? }
// saved: a dashed reference column (what the tools saved); blocks above its line are the overflow (accent at the question). — beats: [statement, pile, question]
import { beat, header, vertical } from './lib/kit.mjs';

export const meta = { name: 'tool-pile', beats: ['statement', 'pile', 'question'] };

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const v = vertical(api);
    const n = 3;
    const b0 = beat(api, p, 0, n), b1 = beat(api, p, 1, n), b2 = beat(api, p, 2, n);
    const bottom = safe.y + safe.h;
    const textR = v ? { x: safe.x, y: top, w: safe.w, h: (bottom - top) * 0.4 } : { x: safe.x, y: top, w: safe.w * 0.5, h: bottom - top };
    const pileR = v ? { x: safe.x, y: top + (bottom - top) * 0.4 + s(4), w: safe.w, h: (bottom - top) * 0.6 - s(4) } : { x: safe.x + safe.w * 0.58, y: top, w: safe.w * 0.42, h: bottom - top };
    // Left: statement, then the question below it.
    const e0 = api.enter(b0);
    const st = api.layoutText(p.statement, { x: textR.x, y: 0, w: textR.w, role: 'heading' });
    const q = api.layoutText(p.question, { x: textR.x, y: 0, w: textR.w, role: 'display' });
    let y = textR.y + Math.max(0, (textR.h - st.height - s(6) - q.height) / 2);
    const dimSt = api.progress(b2, 0.5);
    api.text(p.statement, { x: textR.x, y: y + e0.dy, w: textR.w, role: 'heading', color: dimSt > 0.5 ? 'muted' : 'ink', alpha: e0.alpha });
    y += st.height + s(6);
    const e2 = api.enter(b2);
    api.text(p.question, { x: textR.x, y: y + e2.dy, w: textR.w, role: 'display', alpha: e2.alpha });
    // Right: a 'saved' reference column beside the pile; blocks above the saved line light up at the question.
    const m = p.items.length;
    const sv = p.saved; // { label, pileLabel, units }
    const labH = sv ? 110 * k : 0;
    const base = bottom - labH;
    const bh = Math.min(96 * k, (pileR.h - labH - s(1) * (m - 1)) / m);
    const refW = sv ? pileR.w * 0.3 : 0;
    const colX = pileR.x + (sv ? refW + s(4) : 0), colW = pileR.x + pileR.w - colX;
    const bw = Math.min(colW, 520 * k);
    if (sv) {
      const er = api.enter(b0 + 0.3);
      const rh = sv.units * bh;
      api.box({ x: pileR.x, y: base - rh + er.dy, w: refW, h: rh, fill: 'surface', stroke: 'lineStrong', lineWidth: 4 * k, dash: [12, 10], alpha: er.alpha, decor: true });
      api.text(sv.label, { x: pileR.x - s(1), y: base + s(1), w: refW + s(2), h: labH, role: 'label', align: 'center', color: 'muted', alpha: er.alpha });
      const ep = api.enter(b1);
      api.text(sv.pileLabel, { x: colX, y: base + s(1), w: bw, h: labH, role: 'label', align: 'center', color: 'muted', alpha: ep.alpha });
      const lineA = api.progress(b1 + (sv.units - 0.5) * 0.45, 0.5);
      api.line([[pileR.x, base - rh], [colX + bw + s(1), base - rh]], { stroke: 'lineStrong', lineWidth: 4 * k, dash: [12, 10], alpha: lineA * er.alpha });
    }
    p.items.forEach((name, i) => {
      const at = b1 + i * 0.45;
      const e = api.enter(at, { rise: 48 });
      if (e.alpha <= 0) return;
      const x = colX + (colW - bw) / 2 * 0;
      const yb = base - (i + 1) * bh - e.dy * 2;
      const over = sv && i >= sv.units && t >= b2;
      const fill = 'surface2';
      api.box({ x, y: yb + 4 * k, w: bw, h: bh - 8 * k, fill, stroke: over ? 'accent' : null, lineWidth: 4 * k, alpha: e.alpha });
      api.text(name, { x: x + s(2), y: yb + 4 * k, w: bw - s(4), h: bh - 8 * k, valign: 'middle', role: 'label', align: 'center', on: fill, alpha: e.alpha });
    });
    if (p.note) {
      const en = api.enter(b2 + 0.4);
      api.text(p.note, { x: textR.x, y: base + s(1), w: textR.w, h: labH, role: 'label', color: 'muted', alpha: en.alpha });
    }
  },
};
