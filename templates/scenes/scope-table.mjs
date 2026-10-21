// A small table (e.g. which settings file a hook lives in, and where it runs), with an optional rewrite strip above
// (a command going through a hook and coming out rewritten). One row or column can light up at a beat.
// props: { kicker?, heading?, rewrite?: { from, to, via }, columns: [..], rows: [[..]], mono?: [col index],
//   highlight?: { row?: index, col?: index }, size?: 'body' (52 px cells), beats? }
// beats with rewrite: [from, to, table, highlight]; without: [table, highlight]. A highlighted column appears at its beat.
import { beat, header, vertical } from './lib/kit.mjs';

export const meta = { name: 'scope-table', beats: ['from?', 'to?', 'table', 'highlight'] };

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    let y = header(api, p);
    const v = vertical(api);
    const rw = !!p.rewrite;
    const n = (rw ? 2 : 0) + 2;
    const bt = beat(api, p, rw ? 2 : 0, n), bh = beat(api, p, rw ? 3 : 1, n);
    const big = p.size === 'body'; // opt-in: 52 px cells
    const rowH = (big ? 112 : 92) * k, headH = 70 * k;
    // Centre the whole group (rewrite strip + table) in the area under the heading.
    {
      const monoH = api.layoutText('x', { x: 0, y: 0, w: safe.w, role: 'mono', font: 'mono', px: v ? 64 : 52, fixed: true }).height;
      const rwH = rw ? (v ? 2 * (monoH + 2 * s(2)) + 60 * k + s(2) + s(4) : 60 * k + monoH + 2 * s(2) + s(6)) : 0;
      const tabH = v ? p.rows.length * (2 * 50 * k + 3 * s(1) + s(2)) : headH + p.rows.length * rowH;
      y += Math.max(0, (safe.y + safe.h - y - rwH - tabH) / 2);
    }
    if (rw) {
      const { from, to, via } = p.rewrite;
      const e1 = api.enter(beat(api, p, 0, n)), e2 = api.enter(beat(api, p, 1, n));
      const pad = s(3), px = v ? 64 : 52;
      const fl = api.layoutText(from, { x: 0, y: 0, w: safe.w, role: 'mono', font: 'mono', px, fixed: true });
      const tl = api.layoutText(to, { x: 0, y: 0, w: safe.w, role: 'mono', font: 'mono', px, fixed: true });
      const bhh = fl.height + 2 * s(2);
      const viaH = via ? 60 * k : 0;
      const by = y + (v ? 0 : viaH); // 9:16: the via label sits between the two boxes
      const fr = { x: safe.x, y: by, w: fl.width + 2 * pad, h: bhh };
      const gapW = v ? 0 : Math.max(380 * k, api.layoutText(via || '', { x: 0, y: 0, w: safe.w, role: 'label', fixed: true }).width + s(4));
      const tr = v ? { x: safe.x, y: by + bhh + viaH + s(2), w: tl.width + 2 * pad, h: bhh } : { x: fr.x + fr.w + gapW, y: by, w: tl.width + 2 * pad, h: bhh };
      api.box({ ...fr, y: fr.y + e1.dy, fill: 'surface', alpha: e1.alpha });
      api.text(from, { x: fr.x + pad, y: fr.y + s(2) + e1.dy, w: fl.width + 4, role: 'mono', font: 'mono', px, on: 'surface', alpha: e1.alpha, fixed: true });
      const ap = api.progress(beat(api, p, 1, n) - 0.5, 0.5, api.ease.inOutCubic);
      if (!v) api.line([[fr.x + fr.w + 16 * k, by + bhh / 2], [tr.x - 16 * k, by + bhh / 2]], { stroke: 'lineStrong', lineWidth: 5 * k, head: 20 * k, arrow: true, progress: ap, alpha: e1.alpha });
      if (v) api.line([[fr.x + 40 * k, fr.y + fr.h + 10 * k + e1.dy], [fr.x + 40 * k, tr.y - 10 * k + e1.dy]], { stroke: 'lineStrong', lineWidth: 4 * k, arrow: true, progress: ap, alpha: e1.alpha });
      if (via && v) api.text(via, { x: safe.x + pad + 60 * k, y: by + bhh + s(1) + e1.dy, w: safe.w - pad, role: 'label', color: 'muted', alpha: e1.alpha * ap, fixed: true });
      else if (via) api.text(via, { x: fr.x + fr.w, y: y + e1.dy, w: gapW, role: 'label', color: 'muted', align: 'center', alpha: e1.alpha * ap, fixed: true });
      api.box({ ...tr, y: tr.y + e2.dy, fill: 'surface2', stroke: 'accent', lineWidth: 4 * k, alpha: e2.alpha });
      api.text(to, { x: tr.x + pad, y: tr.y + s(2) + e2.dy, w: tl.width + 4, role: 'mono', font: 'mono', px, on: 'surface2', alpha: e2.alpha, fixed: true });
      y = tr.y + tr.h + (v ? s(4) : s(6));
    }
    // 9:16: no columns; each row is its first cell (mono) over the other cells joined by middots.
    if (v) {
      const hl = api.enter(bh, { rise: 0 });
      p.rows.forEach((r, i) => {
        const e = api.enter(bt + 0.2 + i * 0.1);
        const l1 = api.layoutText(r[0], { x: 0, y: 0, w: safe.w - s(4), role: isMonoV(p, 0) ? 'mono' : 'label', font: isMonoV(p, 0) ? 'mono' : undefined });
        const rest = r.slice(1).join(' · ');
        const l2 = api.layoutText(rest, { x: 0, y: 0, w: safe.w - s(4), role: 'label' });
        const h = l1.height + l2.height + s(1) + 2 * s(1);
        const lit = p.highlight?.row === i && t >= bh;
        if (lit) api.box({ x: safe.x, y: y + e.dy, w: safe.w, h, fill: 'surface2', stroke: 'accent', lineWidth: 4 * k, alpha: e.alpha * hl.alpha });
        api.text(r[0], { x: safe.x + s(2), y: y + s(1) + e.dy, w: safe.w - s(4), role: isMonoV(p, 0) ? 'mono' : 'label', font: isMonoV(p, 0) ? 'mono' : undefined, on: lit ? 'surface2' : 'bg', alpha: e.alpha });
        api.text(rest, { x: safe.x + s(2), y: y + s(1) + l1.height + s(1) + e.dy, w: safe.w - s(4), role: 'label', color: 'muted', on: lit ? 'surface2' : 'bg', alpha: e.alpha });
        y += h + s(2);
      });
      return;
    }
    // Table: column widths from content, scaled to the safe width.
    const cols = p.columns.length;
    const isMono = (c) => (p.mono || []).includes(c);
    const cellW = (str, c) => api.layoutText(str, { x: 0, y: 0, w: safe.w, role: isMono(c) ? 'mono' : big ? 'body' : 'label', font: isMono(c) ? 'mono' : undefined, fixed: true }).width;
    const headW = (str) => api.layoutText(str, { x: 0, y: 0, w: safe.w, role: 'label', fixed: true }).width;
    const nat = p.columns.map((h, c) => Math.max(headW(h), ...p.rows.map((r) => cellW(r[c], c))) + s(5));
    const scale = safe.w / nat.reduce((a, b) => a + b, 0);
    const ws = nat.map((w) => w * scale);
    const xs = ws.map((_, i) => safe.x + ws.slice(0, i).reduce((a, b) => a + b, 0));
    const et = api.enter(bt);
    p.columns.forEach((h, c) => {
      if (p.highlight?.col === c && t < bh) return;
      api.text(h, { x: xs[c] + s(2), y: y + et.dy, w: ws[c] - s(3), h: headH, valign: 'middle', role: 'label', color: 'muted', alpha: et.alpha });
    });
    y += headH;
    api.line([[safe.x, y + et.dy], [safe.x + safe.w, y + et.dy]], { stroke: 'lineStrong', lineWidth: 4 * k, alpha: et.alpha, progress: api.progress(bt, 0.6, api.ease.inOutCubic) });
    const hl = api.enter(bh, { rise: 0 });
    p.rows.forEach((r, i) => {
      const e = api.enter(bt + 0.2 + i * 0.1);
      const ry = y + i * rowH + e.dy;
      const lit = p.highlight?.row === i && t >= bh;
      if (lit) api.box({ x: safe.x, y: ry + 6 * k, w: safe.w, h: rowH - 12 * k, fill: 'surface2', stroke: 'accent', lineWidth: 4 * k, alpha: e.alpha * hl.alpha });
      r.forEach((cellText, c) => {
        const colLit = p.highlight?.col === c;
        if (colLit && t < bh) return;
        const a = colLit ? hl.alpha : 1;
        api.text(cellText, { x: xs[c] + s(2), y: ry + 12 * k, w: ws[c] - s(3), h: rowH - 24 * k, valign: 'middle', role: isMono(c) ? 'mono' : big ? 'body' : 'label', font: isMono(c) ? 'mono' : undefined, color: colLit ? 'accent' : 'ink', on: lit ? 'surface2' : 'bg', alpha: e.alpha * a });
      });
      if (i < p.rows.length - 1) api.line([[safe.x, ry + rowH], [safe.x + safe.w, ry + rowH]], { stroke: 'line', lineWidth: 4 * k, alpha: e.alpha });
    });
  },
};

const isMonoV = (p, c) => (p.mono || []).includes(c);
