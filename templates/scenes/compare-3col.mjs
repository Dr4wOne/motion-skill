// Up to three columns compared side by side (stacked in 9:16).
// props: { kicker?, heading?, cols: [{ title, lines: [..], accent? }], note?, beats? }
import { beat, header, cells, vertical } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const v = vertical(api);
    const m = p.cols.length;
    const n = m + (p.note ? 1 : 0);
    const bottom = safe.y + safe.h - (p.note ? 130 * k : 0);
    const cs = cells(v ? top : safe.x, v ? bottom - top : safe.w, m, s(4));
    // One line size for all columns: body if every column fits at body size, else label.
    const pad = s(3);
    const colH = (r, role) => (c) => api.layoutText(c.title, { x: 0, y: 0, w: r.w - 2 * pad, role: 'heading' }).height + s(3) + c.lines.reduce((n, l) => n + api.layoutText(l, { x: 0, y: 0, w: r.w - 2 * pad, role }).height + s(1), 0) + 2 * pad;
    const probe = v ? { w: safe.w, h: cs[0].size } : { w: cs[0].size, h: bottom - top };
    const lineRole = p.cols.every((c) => colH(probe, 'body')(c) <= probe.h) ? 'body' : 'label';
    p.cols.forEach((c, i) => {
      const r = v ? { x: safe.x, y: cs[i].start, w: safe.w, h: cs[i].size } : { x: cs[i].start, y: top, w: cs[i].size, h: bottom - top };
      const e = api.enter(beat(api, p, i, n));
      const fill = c.accent ? 'surface2' : 'surface';
      api.box({ ...r, y: r.y + e.dy, fill, stroke: c.accent ? 'accent' : null, lineWidth: 3 * k, alpha: e.alpha });
      let y = r.y + pad + e.dy;
      const tl = api.text(c.title, { x: r.x + pad, y, w: r.w - 2 * pad, role: 'heading', color: 'ink', on: fill, alpha: e.alpha });
      y += tl.height + s(3);
      for (const line of c.lines) {
        const ll = api.text(line, { x: r.x + pad, y, w: r.w - 2 * pad, h: r.y + e.dy + r.h - pad - y, role: lineRole, color: 'ink', on: fill, alpha: e.alpha });
        y += ll.height + s(1);
      }
    });
    if (p.note) {
      const e = api.enter(beat(api, p, n - 1, n));
      api.text(p.note, { x: safe.x, y: safe.y + safe.h - 100 * k + e.dy, w: safe.w, role: 'body', color: 'muted', align: 'center', alpha: e.alpha });
    }
  },
};
