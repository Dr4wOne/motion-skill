// Stages connected by arrows, revealed one per beat. Supports several rows with labels and cross-row links.
// props: { kicker?, heading?, rows: [{ label?, stages: [{ label, sub? }] }], links?: [[[r,i],[r2,j]]], beats?, note? }
import { beat, header, node, arrowBetween, cells, vertical } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const rows = p.rows;
    const order = rows.flatMap((row, r) => row.stages.map((_, i) => [r, i]));
    const n = order.length + (p.note ? 1 : 0);
    const bottom = safe.y + safe.h - (p.note ? 110 * k : 0);
    const v = vertical(api) && rows.length === 1;
    const rects = rows.map(() => []);
    const laneH = rows.some((r) => r.label) && !v ? 58 * k : 0; // lane label sits above its row
    if (v) {
      const cs = cells(top, bottom - top, rows[0].stages.length, s(4));
      cs.forEach((c, i) => { rects[0][i] = { x: safe.x + safe.w * 0.1, y: c.start, w: safe.w * 0.8, h: Math.min(c.size, 190 * k) }; });
    } else {
      const rowGap = s(4);
      const rh = Math.min((rows.length === 1 ? 330 : 200) * k, (bottom - top - rowGap * (rows.length - 1)) / rows.length - laneH);
      const totalH = rows.length * (rh + laneH) + (rows.length - 1) * rowGap;
      rows.forEach((row, r) => {
        const y = top + (bottom - top - totalH) / 2 + r * (rh + laneH + rowGap) + laneH;
        const maxStages = Math.max(...rows.map((x) => x.stages.length)); // one grid for all rows, so links land on boxes
        const cs = cells(safe.x, safe.w, maxStages, s(maxStages > 4 ? 4 : 5));
        cs.forEach((c, i) => { rects[r][i] = { x: c.start, y, w: c.size, h: rh }; });
      });
    }
    // One label size per diagram: the largest size at which every stage label fits its box.
    const labelRole = rows.length === 1 && !v ? 'heading' : 'label';
    const pad = api.s(1);
    const boxOf = (r, i, st) => ({ x: 0, y: 0, w: rects[r][i].w - 2 * pad, h: (rects[r][i].h - 2 * pad) * (st.sub ? 0.6 : 1), role: labelRole });
    let labelPx = Math.min(...rows.flatMap((row, r) => row.stages.map((st, i) => api.layoutText(st.label, boxOf(r, i, st)).px)));
    // At the shared size a label may orphan a word; step down until none does (never below the floor).
    const orphanAt = (px) => rows.some((row, r) => row.stages.some((st, i) => api.layoutText(st.label, { ...boxOf(r, i, st), px: px / api.k, fixed: true }).orphan));
    while (orphanAt(labelPx) && labelPx - 2 >= 36 * api.k) labelPx -= 2;
    const at = new Map(order.map(([r, i], j) => [`${r}:${i}`, beat(api, p, j, n)]));
    rows.forEach((row, r) => {
      if (row.label && !v) {
        const first = rects[r][0];
        const e = api.enter(at.get(`${r}:0`) - 0.2);
        api.text(row.label, { x: first.x, y: first.y - laneH, w: safe.w, role: 'label', color: 'muted', alpha: e.alpha });
      }
      row.stages.forEach((st, i) => {
        const b0 = at.get(`${r}:${i}`);
        const e = api.enter(b0);
        const latest = order.findLastIndex(([rr, ii]) => t >= at.get(`${rr}:${ii}`));
        const isActive = latest >= 0 && order[latest][0] === r && order[latest][1] === i;
        node(api, { ...rects[r][i], y: rects[r][i].y + e.dy, label: st.label, sub: st.sub, alpha: e.alpha, state: isActive ? 'active' : 'idle', labelRole, labelPx });
        if (i > 0) arrowBetween(api, rects[r][i - 1], rects[r][i], { progress: api.progress(b0 - 0.25, 0.35, api.ease.inOutCubic) });
      });
    });
    for (const [[r1, i1], [r2, i2]] of p.links || []) {
      const b0 = Math.max(at.get(`${r1}:${i1}`), at.get(`${r2}:${i2}`));
      arrowBetween(api, rects[r1][i1], rects[r2][i2], { progress: api.progress(b0 + 0.2, 0.5, api.ease.inOutCubic), stroke: 'accent', dash: [8, 8] });
    }
    if (p.note) {
      const e = api.enter(beat(api, p, n - 1, n));
      api.text(p.note, { x: safe.x, y: safe.y + safe.h - 90 * k + e.dy, w: safe.w, role: 'body', color: 'muted', align: 'center', alpha: e.alpha });
    }
  },
};
