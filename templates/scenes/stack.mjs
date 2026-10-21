// A statement built line by line (the climax). props: { kicker?, lines: [..] (use {{word}} for accent), beats? }
// Earlier lines step back to muted as each new line arrives; at the end all return to ink.
import { beat } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const n = p.lines.length;
    const w = Math.min(safe.w, api.W * (api.format === '9:16' ? 0.88 : 0.8));
    const x = (api.W - w) / 2;
    const gap = s(4);
    const measureAll = (role) => { const ls = p.lines.map((l) => api.layoutText(l, { x, y: 0, w, role })); return { ls, total: ls.reduce((a, l) => a + l.height, 0) + gap * (n - 1) }; };
    let role = 'heading', m = measureAll(role);
    if (m.total > safe.h) { role = 'body'; m = measureAll(role); }
    const lays = m.ls, total = m.total;
    let y = safe.y + (safe.h - total) / 2;
    const endAll = beat(api, p, n - 1, n) + 2.2;
    p.lines.forEach((line, i) => {
      const b0 = i === 0 ? Math.min(beat(api, p, 0, n), 0.25) : beat(api, p, i, n); // never open on an empty frame
      const e = api.enter(b0);
      const newer = i < n - 1 ? api.progress(beat(api, p, i + 1, n), 0.5) : 0;
      const back = api.progress(endAll, 0.8);
      const dim = newer * (1 - back);
      api.text(line, { x, y: y + e.dy, w, role, alpha: e.alpha, color: dim > 0.5 ? 'muted' : 'ink' });
      y += lays[i].height + gap;
    });
  },
};
