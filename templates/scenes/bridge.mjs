// Bridge-out: "Next: …" on the left, with the next topic's real command typing into a terminal panel below it.
// props: { text, code, prompt?: '$', at?: 0.5 (typing start, s), cps?: 16 }
import { vertical } from './lib/kit.mjs';

export const meta = { name: 'bridge', beats: [] };

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const v = vertical(api);
    const w = v ? safe.w : safe.w * 0.7;
    const e1 = api.enter(0.05);
    const tl = api.layoutText(p.text, { x: safe.x, y: 0, w, role: 'title' });
    const px = 52;
    const line = `${p.prompt ?? '$'} ${p.code}`;
    const cl = api.layoutText(line, { x: 0, y: 0, w: safe.w, role: 'mono', font: 'mono', px, fixed: true });
    const pad = s(4);
    const panelH = cl.height + 2 * pad;
    const panelW = Math.min(safe.w, Math.max(w * 0.8, cl.width + 2 * pad + 60 * k));
    const top = safe.y + 90 * k; // clear of the tracker line
    const total = tl.height + s(6) + panelH;
    let y = top + (safe.y + safe.h - top - total) / 2;
    api.text(p.text, { x: safe.x, y: y + e1.dy, w, role: 'title', alpha: e1.alpha });
    y += tl.height + s(6);
    const e2 = api.enter(0.2);
    api.box({ x: safe.x, y: y + e2.dy, w: panelW, h: panelH, fill: 'surface', alpha: e2.alpha });
    const prefix = `${p.prompt ?? '$'} `;
    const nChars = Math.max(0, Math.min(p.code.length, Math.floor((t - (p.at ?? 0.5)) * (p.cps ?? 16))));
    const shown = prefix + p.code.slice(0, nChars);
    const lay = api.text(shown, { x: safe.x + pad, y: y + pad + e2.dy, w: panelW - 2 * pad, role: 'mono', font: 'mono', px, color: 'ink', on: 'surface', alpha: e2.alpha, fixed: true, balance: false, allowOrphan: true });
    const cw = api.measure(shown, { role: 'mono', font: 'mono', px });
    api.box({ x: safe.x + pad + cw + 4 * k, y: y + pad + 10 * k + e2.dy, w: 26 * k, h: lay.height - 20 * k, fill: 'accent', radius: 2 * k, alpha: e2.alpha, decor: true });
  },
};
