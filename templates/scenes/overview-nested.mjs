// Zoomed-out nested diagram (overview) and its rebuilt version (full picture).
// props: { kicker?, heading?, layers: [{ label, sub }] (inner → outer), feed?: { label, sub } (an input feeding the
//   outer layer, drawn to its left with an arrow — e.g. configuration feeds the harness), filled?: bool, beats? }
import { beat, header } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const n = p.layers.length;
    const feedW = p.feed ? Math.min(420 * k, safe.w * 0.26) : 0;
    const area = { x: safe.x + (feedW ? feedW + s(6) : 0), y: top, w: safe.w - (feedW ? feedW + s(6) : 0), h: safe.y + safe.h - top };
    const outerW = Math.min(area.w, area.h * 2.2), outerH = area.h;
    const step = Math.min((outerH - 150 * k) / (2 * n), (outerW - 360 * k) / (2 * n)); // inset per layer
    const labelH = 58 * k;
    for (let i = n - 1; i >= 0; i--) { // draw outer first
      const L = p.layers[i];
      const inset = (n - 1 - i) * step;
      const r = { x: area.x + (area.w - outerW) / 2 + inset, y: area.y + inset, w: outerW - 2 * inset, h: outerH - 2 * inset };
      const b0 = beat(api, p, i, n + (p.feed ? 1 : 0));
      const e = api.enter(b0);
      const isInner = i === 0;
      api.box({ ...r, y: r.y + e.dy, fill: isInner ? 'surface2' : i % 2 ? 'surface' : 'bg', stroke: isInner ? 'accent' : 'line', lineWidth: (isInner ? 4 : 2) * k, radius: 14 * k, alpha: e.alpha });
      const label = p.filled && L.sub ? `${L.label} · ${L.sub}` : L.label;
      const ly = isInner ? r.y + (r.h - labelH) / 2 : r.y + s(1);
      api.text(label, { x: r.x + s(2), y: ly + e.dy, w: r.w - s(4), h: labelH, valign: 'middle', role: 'label', align: isInner ? 'center' : 'left', color: isInner ? 'ink' : 'muted', on: isInner ? 'surface2' : i % 2 ? 'surface' : 'bg', alpha: e.alpha });
    }
    if (p.feed) {
      const e = api.enter(beat(api, p, n, n + 1));
      const fh = 280 * k, fy = area.y + (area.h - fh) / 2;
      const fr = { x: safe.x, y: fy + e.dy, w: feedW, h: fh };
      api.box({ ...fr, fill: 'surface', stroke: 'lineStrong', lineWidth: 2 * k, dash: [10, 8], alpha: e.alpha });
      api.text(p.feed.label, { x: fr.x + s(2), y: fr.y + s(2), w: fr.w - s(4), role: 'label', alpha: e.alpha, on: 'surface' });
      if (p.feed.sub) api.text(p.feed.sub, { x: fr.x + s(2), y: fr.y + fh / 2, w: fr.w - s(4), h: fh / 2 - s(2), role: 'small', color: 'muted', alpha: e.alpha, on: 'surface' });
      const outerX = area.x + (area.w - Math.min(area.w, area.h * 2.2)) / 2;
      api.line([[fr.x + fr.w + 10 * k, fy + fh / 2], [outerX - 10 * k, fy + fh / 2]], { stroke: 'accent', arrow: true, progress: api.progress(beat(api, p, n, n + 1) + 0.2, 0.5, api.ease.inOutCubic) });
    }
  },
};
