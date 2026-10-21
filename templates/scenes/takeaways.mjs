// ≤ 3 takeaways, one action, a tease. props: { heading?, items: [..], action, tease?, valign?: 'middle', beats? }
import { beat, header } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    let y = header(api, { ...p, heading: p.heading ?? 'Takeaways' });
    if (p.valign === 'middle') { // opt-in: centre the list + action + tease in the area under the heading
      const h = p.items.reduce((a, it) => a + api.layoutText(it, { x: 0, y: 0, w: safe.w - 44 * k, role: 'body' }).height + s(3), 0) + s(3)
        + api.layoutText(p.action, { x: 0, y: 0, w: safe.w, role: 'heading' }).height + (p.tease ? s(3) + api.layoutText(p.tease, { x: 0, y: 0, w: safe.w, role: 'label' }).height : 0);
      y += Math.max(0, (safe.y + safe.h - y - h) / 2);
    }
    const n = p.items.length + 1 + (p.tease ? 1 : 0);
    p.items.forEach((it, i) => {
      const e = api.enter(beat(api, p, i, n, { lead: 0.4, tail: 1.2 }));
      api.box({ x: safe.x, y: y + 18 * k + e.dy, w: 14 * k, h: 14 * k, fill: 'accent', radius: 3 * k, alpha: e.alpha });
      const l = api.text(it, { x: safe.x + 44 * k, y: y + e.dy, w: safe.w - 44 * k, role: 'body', alpha: e.alpha });
      y += l.height + s(3);
    });
    y += s(3);
    const ea = api.enter(beat(api, p, p.items.length, n, { lead: 0.4, tail: 1.2 }));
    const a = api.text(p.action, { x: safe.x, y: y + ea.dy, w: safe.w, role: 'heading', color: /\{\{/.test(p.action) ? 'ink' : 'accent', alpha: ea.alpha });
    y += a.height + s(3);
    if (p.tease) { const et = api.enter(beat(api, p, n - 1, n, { lead: 0.4, tail: 1.2 })); api.text(p.tease, { x: safe.x, y: y + et.dy, w: safe.w, role: 'label', color: 'muted', alpha: et.alpha }); }
  },
};
