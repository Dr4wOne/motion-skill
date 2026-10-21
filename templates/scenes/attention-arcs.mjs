// One attention head. props: { kicker?, heading?, words: [...], focus: index, weights: { index: 0..1 }, labels?: [index], caption?, beats? }
// beats: [words, arcs, emphasis]
import { beat, header, vertical } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const b = [0, 1, 2].map((i) => beat(api, p, i, 3));
    const role = vertical(api) ? 'heading' : 'title';
    // Lay words on one line (or two in vertical), centred.
    const gap = s(3);
    const lays = p.words.map((w) => api.layoutText(w, { x: 0, y: 0, w: safe.w, role, fixed: true }));
    const lineH = lays[0].height;
    const rowsOf = [];
    let row = [], rowW = 0;
    lays.forEach((l, i) => { if (row.length && rowW + gap + l.width > safe.w) { rowsOf.push(row); row = []; rowW = 0; } row.push(i); rowW += (row.length > 1 ? gap : 0) + l.width; });
    rowsOf.push(row);
    const arcRoom = 240 * k;
    const baseY = top + arcRoom + (safe.y + safe.h - top - arcRoom - rowsOf.length * (lineH + s(4)) - (p.caption ? 110 * k : 0)) / 2;
    const pos = [];
    rowsOf.forEach((r, ri) => {
      const w = r.reduce((n, i) => n + lays[i].width, 0) + gap * (r.length - 1);
      let x = safe.x + (safe.w - w) / 2;
      for (const i of r) { pos[i] = { x, y: baseY + ri * (lineH + s(4)), w: lays[i].width, h: lineH }; x += lays[i].width + gap; }
    });
    const emph = api.progress(b[2], 0.6);
    p.words.forEach((w, i) => {
      const e = api.enter(b[0] + i * 0.08);
      const weight = p.weights[i] ?? 0;
      const isFocus = i === p.focus;
      const isTop = weight === Math.max(...Object.values(p.weights));
      const color = isFocus || (isTop && emph > 0.5) ? 'accent' : emph > 0 && !isFocus && !isTop ? 'muted' : 'ink';
      api.text(w, { x: pos[i].x, y: pos[i].y + e.dy, w: pos[i].w + 2, role, alpha: e.alpha, color, fixed: true });
    });
    // Arcs from the focus word to earlier words, thickness ∝ weight.
    const f = pos[p.focus];
    const fx = f.x + f.w / 2, fy = f.y - s(1);
    Object.entries(p.weights).forEach(([is, wgt], j) => {
      const i = Number(is);
      const q = pos[i];
      const qx = q.x + q.w / 2, qy = q.y - s(1);
      const h = Math.min(arcRoom - s(4), 60 * k + Math.abs(fx - qx) * 0.35);
      const prog = api.progress(b[1] + j * 0.12, 0.7, api.ease.inOutCubic);
      if (prog <= 0) return;
      const pts = [];
      for (let u = 0; u <= 1.0001; u += 1 / 40) {
        const x = api.lerp(fx, qx, u), y = Math.min(fy, qy) - Math.sin(Math.PI * u) * h;
        pts.push([x, y]);
      }
      const top2 = wgt >= 0.15;
      api.line(pts, { stroke: top2 ? 'accent' : 'lineStrong', lineWidth: Math.max(2, wgt * 22) * k, progress: prog, alpha: emph > 0 && !top2 ? 1 - 0.6 * emph : 1 });
      if ((p.labels || []).includes(i)) {
        const la = api.progress(b[1] + j * 0.12 + 0.6, 0.3);
        const lbl = `${Math.round(wgt * 100)}%`;
        const ll = api.layoutText(lbl, { x: 0, y: 0, w: 300 * k, role: 'label', fixed: true });
        api.text(lbl, { x: (fx + qx) / 2 - ll.width / 2, y: Math.min(fy, qy) - h - ll.height - s(1), w: ll.width + 4, role: 'label', color: 'accent', alpha: la, fixed: true });
      }
    });
    if (p.caption) {
      const e = api.enter(b[2] + 0.3);
      api.text(p.caption, { x: safe.x, y: safe.y + safe.h - 90 * k + e.dy, w: safe.w, role: 'body', color: 'muted', align: 'center', alpha: e.alpha });
    }
  },
};
