// The agenda: numbered topics, each a ≤ 3-word title + ≤ 12-word promise. props: { heading?, topics: [{ title, promise }], beats? }
import { beat, header } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, { ...p, heading: p.heading ?? 'The roadmap' });
    const n = p.topics.length;
    const rowH = Math.min(150 * k, (safe.y + safe.h - top) / n);
    const numW = 90 * k;
    p.topics.forEach((tp, i) => {
      const e = api.enter(beat(api, p, i, n, { lead: 0.4, tail: 1.2 }));
      const y = top + i * rowH + e.dy;
      api.text(String(i + 1), { x: safe.x, y, w: numW, role: 'heading', color: 'accent', alpha: e.alpha, fixed: true });
      const tl = api.text(tp.title, { x: safe.x + numW, y, w: safe.w * 0.34, role: 'heading', alpha: e.alpha, fixed: true });
      api.text(tp.promise, { x: safe.x + numW + safe.w * 0.36, y: y + (tl.height - 50 * k) / 2, w: safe.w - numW - safe.w * 0.36, h: rowH, role: 'label', color: 'muted', alpha: e.alpha });
    });
  },
};
