// Next-token probabilities at different temperatures. props: { kicker?, heading?, prompt, logits: { token: logit },
//   temps: [t0, t1, ...] (one per beat; the bars glide between them), note?, beats? }
import { beat, header, vertical } from './lib/kit.mjs';

function softmax(logits, T) {
  const xs = logits.map((l) => l / Math.max(0.05, T));
  const m = Math.max(...xs);
  const ex = xs.map((x) => Math.exp(x - m));
  const sum = ex.reduce((a, b) => a + b, 0);
  return ex.map((e) => e / sum);
}

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const toks = Object.keys(p.logits), logits = Object.values(p.logits);
    const n = p.temps.length;
    let T = p.temps[0];
    for (let i = 1; i < n; i++) T = api.lerp(T, p.temps[i], api.progress(beat(api, p, i, n), 0.9, api.ease.inOutCubic));
    const probs = softmax(logits, T);
    const e = api.enter(0.3);
    const pr = api.text(`${p.prompt} …`, { x: safe.x, y: top + e.dy, w: safe.w, role: 'body', font: 'mono', alpha: e.alpha });
    const tl = `temperature ${T.toFixed(1)}`;
    api.text(tl, { x: safe.x, y: top + e.dy, w: safe.w, role: 'label', color: 'accent', align: 'right', alpha: e.alpha });
    const y0 = top + pr.height + s(5);
    const noteH = p.note ? 110 * k : 0;
    const rowH = Math.min(84 * k, (safe.y + safe.h - y0 - noteH) / toks.length);
    const labelW = (vertical(api) ? 250 : 300) * k;
    const barMax = safe.w - labelW - 180 * k;
    toks.forEach((tok, i) => {
      const y = y0 + i * rowH;
      const a = api.enter(0.5 + i * 0.07);
      api.text(tok, { x: safe.x, y, w: labelW - s(2), h: rowH, valign: 'middle', role: 'mono', font: 'mono', px: 36, align: 'right', alpha: a.alpha, fixed: true });
      const w = Math.max(2 * k, barMax * probs[i] * a.alpha);
      api.box({ x: safe.x + labelW, y: y + rowH * 0.2, w, h: rowH * 0.6, fill: i === 0 ? 'accent' : 'lineStrong', radius: 3 * k, alpha: a.alpha });
      api.text(`${Math.round(probs[i] * 100)}%`, { x: safe.x + labelW + w + s(2), y, w: 170 * k, h: rowH, valign: 'middle', role: 'small', color: 'muted', alpha: a.alpha, fixed: true });
    });
    if (p.note) {
      const ne = api.enter(beat(api, p, n - 1, n) + 0.8);
      api.text(p.note, { x: safe.x, y: safe.y + safe.h - 90 * k + ne.dy, w: safe.w, role: 'body', color: 'muted', align: 'center', alpha: ne.alpha });
    }
  },
};
