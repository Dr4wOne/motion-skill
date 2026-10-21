// Meaning as position. props: { kicker?, heading?, viewBox: [w,h], clusters: [{cx,cy,rx,ry,accent?}],
//   points: [{ label, x, y, accent?, group }], caption?, beats? } — one beat per group, then the caption.
import { beat, header, vertical } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    // Caption band + room for cluster outlines (they extend past the dots by label height + padding).
    const capH = p.caption ? 110 * k + s(3) + 30 * k + s(4) : 0;
    const [vw, vh] = p.viewBox;
    const areaW = vertical(api) ? safe.w : safe.w * 0.78, areaH = safe.y + safe.h - top - capH;
    // Positions are illustrative (the article says so), so the map stretches to fill the area
    // instead of keeping the figure's aspect ratio; labels keep their size.
    const scx = p.keepAspect ? Math.min(areaW / vw, areaH / vh) : areaW / vw, scy = p.keepAspect ? scx : areaH / vh;
    const sc = Math.min(scx, scy);
    const ox = safe.x + (safe.w - vw * scx) / 2, oy = top + (areaH - vh * scy) / 2;
    const X = (x) => ox + x * scx, Y = (y) => oy + y * scy;
    const groups = [...new Set(p.points.map((q) => q.group))];
    const n = groups.length + (p.caption ? 1 : 0);
    for (const c of p.clusters || []) {
      const g = groups.indexOf(c.group);
      const a = api.progress(beat(api, p, g, n) + 0.3, 0.6);
      if (a <= 0) continue;
      // Fit the ellipse around the members' dots and labels (the figure's radii were for 14 px labels).
      const boxes = p.points.filter((q) => q.group === c.group).map((q) => {
        const lw = api.layoutText(q.label, { x: 0, y: 0, w: safe.w, role: 'label', fixed: true }).width;
        return [X(q.x) - 12 * k, Y(q.y) - 30 * k, X(q.x) + 22 * k + lw + 8 * k, Y(q.y) + 30 * k];
      });
      const x0 = Math.min(...boxes.map((b) => b[0])), y0 = Math.min(...boxes.map((b) => b[1])), x1 = Math.max(...boxes.map((b) => b[2])), y1 = Math.max(...boxes.map((b) => b[3]));
      // Dashed rounded rectangle around the members: never cuts through a dot or a label.
      const pad = s(3);
      api.box({ x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad, stroke: c.accent ? 'accent' : 'lineStrong', lineWidth: 3 * k, dash: [12, 10], radius: 28 * k, alpha: a * 0.9 });
    }
    p.points.forEach((q, j) => {
      const g = groups.indexOf(q.group);
      const e = api.enter(beat(api, p, g, n) + (j % 4) * 0.1);
      if (e.alpha <= 0) return;
      api.circle({ x: X(q.x), y: Y(q.y) + e.dy, r: 9 * k, fill: q.accent ? 'accent' : 'ink', alpha: e.alpha });
      const lay = api.layoutText(q.label, { x: 0, y: 0, w: safe.w, role: q.accent ? 'label' : 'label', fixed: true });
      api.text(q.label, { x: X(q.x) + 22 * k, y: Y(q.y) - lay.height / 2 + e.dy, w: lay.width + 4, role: 'label', color: q.accent ? 'accent' : 'ink', alpha: e.alpha, fixed: true });
    });
    if (p.caption) {
      const e = api.enter(beat(api, p, n - 1, n));
      api.text(p.caption, { x: safe.x, y: safe.y + safe.h - 90 * k + e.dy, w: safe.w, role: 'body', color: 'muted', align: 'center', alpha: e.alpha });
    }
  },
};
