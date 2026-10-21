// Text split into tokens. props: { kicker?, heading?, examples: [{ text, tokens: [..] , note? }], beats? }
// A leading "·" marks a space, as in the article's figure.
import { beat, header } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    let y = header(api, p);
    const n = p.examples.length;
    for (const [i, ex] of p.examples.entries()) {
      const b0 = beat(api, p, i, n);
      const e = api.enter(b0);
      if (e.alpha <= 0) break;
      const src = api.text(`“${ex.text}”`, { x: safe.x, y: y + e.dy, w: safe.w, role: 'body', alpha: e.alpha, color: 'muted' });
      y += src.height + s(2);
      // chips, wrapped
      let x = safe.x;
      const chipH = 76 * k;
      ex.tokens.forEach((tok, j) => {
        const lay = api.layoutText(tok, { x: 0, y: 0, w: safe.w, role: 'mono', font: 'mono', px: 36, fixed: true });
        const w = lay.width + s(3);
        if (x + w > safe.x + safe.w) { x = safe.x; y += chipH + s(1); }
        const a = api.progress(b0 + 0.5 + j * 0.12, 0.25);
        api.box({ x, y, w, h: chipH, fill: j % 2 ? 'surface2' : 'surface', stroke: ex.accent ? 'accent' : null, lineWidth: 2 * k, alpha: a });
        api.text(tok, { x: x + s(1), y: y + (chipH - lay.height) / 2, w: w - s(2), role: 'mono', font: 'mono', px: 36, align: 'center', alpha: a, on: j % 2 ? 'surface2' : 'surface', fixed: true });
        x += w + s(1);
      });
      const cntA = api.progress(b0 + 0.6 + ex.tokens.length * 0.12, 0.3);
      const note = ex.note ?? `${ex.tokens.length} token${ex.tokens.length === 1 ? '' : 's'}`;
      const nl = api.layoutText(note, { x: 0, y: 0, w: safe.w, role: 'label', fixed: true });
      if (x + s(3) + nl.width <= safe.x + safe.w) api.text(note, { x: x + s(2), y: y + (chipH - nl.height) / 2, w: nl.width + 4, role: 'label', color: 'accent', alpha: cntA, fixed: true });
      else { y += chipH + s(1); api.text(note, { x: safe.x, y, w: safe.w, role: 'label', color: 'accent', alpha: cntA }); }
      y += chipH + s(5);
    }
  },
};
