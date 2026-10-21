// The next-token loop. props: { kicker?, heading?, rounds: [{ input, output }], model?: 'Model', caption?, beats? }
// Each round: text goes in → the model predicts one token → the token is appended → repeat.
import { beat, header, node, arrowBetween, vertical } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const n = p.rounds.length;
    const v = vertical(api);
    const areaH = safe.y + safe.h - top - (p.caption ? 120 * k : 0);
    const inW = v ? safe.w : safe.w * 0.5, mW = v ? safe.w * 0.5 : safe.w * 0.2, oW = v ? safe.w * 0.5 : safe.w * 0.18;
    const boxH = (v ? 170 : 230) * k;
    const gap = v ? s(4) : s(5);
    const rects = v
      ? (() => { const y0 = top + (areaH - 3 * boxH - 2 * gap) / 2; return [{ x: safe.x, y: y0, w: inW, h: boxH }, { x: safe.x + (safe.w - mW) / 2, y: y0 + boxH + gap, w: mW, h: boxH }, { x: safe.x + (safe.w - oW) / 2, y: y0 + 2 * (boxH + gap), w: oW, h: boxH }]; })()
      : (() => { const y0 = top + (areaH - boxH) / 2; const total = inW + mW + oW + 2 * gap; const x0 = safe.x + (safe.w - total) / 2; return [{ x: x0, y: y0, w: inW, h: boxH }, { x: x0 + inW + gap, y: y0, w: mW, h: boxH }, { x: x0 + inW + mW + 2 * gap, y: y0, w: oW, h: boxH }]; })();
    const [rIn, rModel, rOut] = rects;
    // Which round are we in?
    let r = 0;
    for (let i = 0; i < n; i++) if (t >= beat(api, p, i, n, { tail: 2.4 })) r = i;
    const b = beat(api, p, r, n, { tail: 2.4 });
    const lt = t - b; // time within round
    const e = api.enter(0.3);
    const input = p.rounds[r].input;
    const out = p.rounds[r].output;
    // Input box with the current text; after the fly-in the output is appended in accent.
    const appended = lt >= 1.7;
    const last = r === n - 1; // final round: the prediction stays in the output slot only, not appended to the input
    node(api, { ...rIn, label: appended && !last ? `${input} {{${out}}}` : input, alpha: e.alpha, font: 'mono', labelRole: 'heading' });
    const active = lt > 0.45 && lt < 1.1;
    node(api, { ...rModel, label: p.model || 'Model', alpha: e.alpha, state: active ? 'active' : 'idle', labelRole: 'heading' });
    // Output slot: empty frame until the prediction lands (then the chip flies back from here).
    api.box({ ...rOut, stroke: 'line', dash: [10, 8], lineWidth: 2 * k, alpha: e.alpha });
    // Once the chip has landed, the prediction stays in the output slot too, so the slot never reads as empty.
    if (appended || (last && lt > 1.0)) api.text(out, { x: rOut.x + s(1), y: rOut.y, w: rOut.w - s(2), h: rOut.h, valign: 'middle', role: 'heading', font: 'mono', align: 'center', color: 'accent', alpha: last ? api.progress(b + 1.0, 0.25) : api.progress(b + 1.7, 0.25) });
    arrowBetween(api, rIn, rModel, { progress: api.progress(b + 0.05, 0.4, api.ease.inOutCubic) * e.alpha });
    arrowBetween(api, rModel, rOut, { progress: api.progress(b + 0.9, 0.3, api.ease.inOutCubic) * e.alpha });
    // Output chip: appears in the output slot, then flies back to the end of the input text.
    if (lt > 1.0 && lt < 1.7 && !last) {
      const fly = api.progress(b + 1.25, 0.45, api.ease.inOutCubic);
      const lay = api.layoutText(input, { x: rIn.x + s(1), y: 0, w: rIn.w - s(2), h: rIn.h - s(2), role: 'heading', font: 'mono' });
      const endX = rIn.x + (rIn.w + lay.width) / 2 + s(1), endY = rIn.y + rIn.h / 2;
      const cx = api.lerp(rOut.x + rOut.w / 2, endX, fly), cy = api.lerp(rOut.y + rOut.h / 2, endY, fly);
      const chip = api.layoutText(out, { x: 0, y: 0, w: rOut.w, role: 'heading', font: 'mono', fixed: true });
      const cw = chip.width + s(3), ch = chip.height + s(2);
      const a = api.progress(b + 1.0, 0.2);
      api.box({ x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch, fill: 'accent', alpha: a, decor: true }); // in motion: may cross boxes
      api.text(out, { x: cx - cw / 2, y: cy - ch / 2 + s(1), w: cw, role: 'heading', font: 'mono', align: 'center', color: 'accentInk', on: 'accent', alpha: a, fixed: true, allowOverlap: true });
    }
    if (p.caption) {
      const c = api.enter(beat(api, p, n - 1, n, { tail: 2.4 }) + 1.9);
      api.text(p.caption, { x: safe.x, y: safe.y + safe.h - 100 * k + c.dy, w: safe.w, role: 'body', color: 'muted', align: 'center', alpha: c.alpha });
    }
  },
};
