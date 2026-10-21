// An agent working, step by step. props: { kicker?, heading?, steps: [{ kind, label, text, code? }], visible?: 4, beats? }
// Shows the latest `visible` steps; older ones scroll up and fade.
import { beat, header } from './lib/kit.mjs';

const KIND = { goal: 'accent', reason: 'ink', act: 'accent', approve: 'ink', observe: 'ink', done: 'accent' };

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const n = p.steps.length;
    const panel = { x: safe.x, y: top, w: safe.w, h: safe.y + safe.h - top };
    const e0 = api.enter(0.2);
    api.box({ ...panel, fill: 'surface', alpha: e0.alpha });
    const pad = s(4);
    const labelW = 250 * k;
    // Heights of each step block
    const blocks = p.steps.map((st) => {
      const tl = api.layoutText(st.text, { x: 0, y: 0, w: panel.w - 3 * pad - labelW, role: 'body' });
      const cl = st.code ? api.layoutText(st.code, { x: 0, y: 0, w: panel.w - 3 * pad - labelW - s(4), role: 'mono', font: 'mono', balance: false }) : null;
      return { h: tl.height + (cl ? cl.height + s(5) : 0) + s(4), tl, cl };
    });
    const shownIdx = p.steps.map((_, i) => i).filter((i) => t >= beat(api, p, i, n) - 0.05);
    // Scroll so the newest step fits at the bottom.
    let used = 0, firstVisible = shownIdx.length;
    for (let i = shownIdx.length - 1; i >= 0; i--) { if (used + blocks[shownIdx[i]].h > panel.h - 2 * pad) break; used += blocks[shownIdx[i]].h; firstVisible = i; }
    let y = panel.y + pad;
    for (const i of shownIdx.slice(firstVisible)) {
      const st = p.steps[i];
      const e = api.enter(beat(api, p, i, n));
      const yy = y + e.dy;
      api.text(st.label, { x: panel.x + pad, y: yy, w: labelW, role: 'label', color: KIND[st.kind] || 'ink', on: 'surface', alpha: e.alpha, fixed: true });
      api.text(st.text, { x: panel.x + 2 * pad + labelW, y: yy, w: panel.w - 3 * pad - labelW, role: 'body', on: 'surface', alpha: e.alpha, fixed: true });
      if (st.code) {
        const cy = yy + blocks[i].tl.height + s(2);
        api.box({ x: panel.x + 2 * pad + labelW, y: cy, w: blocks[i].cl.width + s(4), h: blocks[i].cl.height + s(2), fill: 'surface2', alpha: e.alpha });
        api.text(st.code, { x: panel.x + 2 * pad + labelW + s(2), y: cy + s(1), w: panel.w - 3 * pad - labelW - s(4), role: 'mono', font: 'mono', on: 'surface2', alpha: e.alpha, balance: false, fixed: true, allowOrphan: true });
      }
      y += blocks[i].h;
    }
  },
};
