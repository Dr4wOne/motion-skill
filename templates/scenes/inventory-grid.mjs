// Inventory slots (the context window as a game inventory). A grid of slots on the left (always on: costs a slot
// every turn), a stash on the right (on demand), and an optional off-grid area (outside the model: no slots).
// Stash items can move into a slot at a beat (e.g. a skill's label, later its body).
// props: { kicker?, heading?, grid: { title, cols?: 4, rows?: 3 },
//   slots: [{ label, mono?, at?: beat index, dim?: bool, accent?: bool, span?: 1|2 }],          // fill slots 0.. in order
//   stash: { title, code?: mono line under the title, at?, items: [{ label, mono?, at?, moveTo?: slot index, moveAt?: beat index, span? }] },
//   outside?: { title, at?, items: [{ label }] }, note?: { code?, text, at }, beats }
// `at` values are beat indices; scene-local times come from props.beats.
import { beat, header, vertical } from './lib/kit.mjs';

export const meta = { name: 'inventory-grid', beats: 'referenced by index from slots/stash/outside/note' };

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const v = vertical(api);
    const nb = p.beats?.length || 4;
    const B = (i) => beat(api, p, i ?? 0, nb);
    const cols = p.grid.cols || 4, rows = p.grid.rows || 3;
    const noteH = p.note ? 90 * k : 0;
    const bottom = safe.y + safe.h - noteH;
    const H = bottom - top;
    const gridR = v ? { x: safe.x, y: top, w: safe.w, h: H * 0.5 } : { x: safe.x, y: top, w: safe.w * 0.56, h: H };
    const sideR = v ? { x: safe.x, y: top + H * 0.5 + s(4), w: safe.w, h: H * 0.5 - s(4) } : { x: safe.x + safe.w * 0.62, y: top, w: safe.w * 0.38, h: H };
    // Grid title
    const eg = api.enter(B(0));
    const gt = api.text(p.grid.title, { x: gridR.x, y: gridR.y + eg.dy, w: gridR.w, role: 'label', color: 'muted', alpha: eg.alpha, fixed: true });
    const gy = gridR.y + gt.height + s(2), gap = s(1);
    const cw = (gridR.w - gap * (cols - 1)) / cols;
    const ch = Math.min(200 * k, (gridR.y + gridR.h - gy - gap * (rows - 1)) / rows); // fill the area height
    const cell = (i, span = 1) => ({ x: gridR.x + (i % cols) * (cw + gap), y: gy + Math.floor(i / cols) * (ch + gap), w: cw * span + gap * (span - 1), h: ch });
    // Which slots are taken (by placed slots or by stash items that move in) — those are not drawn empty.
    const taken = new Set();
    p.slots.forEach((sl, i) => { for (let j = 0; j < (sl.span || 1); j++) taken.add(i + j); });
    const moving = (p.stash?.items || []).filter((it) => it.moveTo != null);
    for (const it of moving) if (t >= B(it.moveAt) + 0.9) for (let j = 0; j < (it.span || 1); j++) taken.add(it.moveTo + j);
    for (let i = 0; i < cols * rows; i++) {
      if (taken.has(i)) continue;
      const e = api.enter(B(0) + 0.1 + (i % cols) * 0.04, { rise: 0 });
      api.box({ ...cell(i), fill: 'surface', alpha: e.alpha, decor: true });
    }
    const chip = (r, label, { mono, state = 'idle', alpha = 1, moving: mv = false } = {}) => {
      const fill = state === 'dim' ? 'surface' : 'surface2';
      api.box({ ...r, fill, stroke: state === 'active' ? 'accent' : null, lineWidth: 4 * k, alpha, decor: mv });
      const pad = s(2); // 24 px: keeps text ≥ 8 px clear of the 4 px focus stroke
      api.text(label, { x: r.x + pad, y: r.y + pad, w: r.w - 2 * pad, h: r.h - 2 * pad, valign: 'middle', align: 'center', role: 'label', font: mono ? 'mono' : undefined, color: state === 'dim' ? 'muted' : 'ink', on: fill, alpha, allowOverlap: mv });
    };
    // Placed slots
    let latestMove = -1;
    moving.forEach((it, j) => { if (t >= B(it.moveAt)) latestMove = j; });
    p.slots.forEach((sl, i) => {
      const e = api.enter(B(sl.at ?? 1) + i * 0.1);
      const r = cell(i, sl.span || 1);
      chip({ ...r, y: r.y + e.dy }, sl.label, { mono: sl.mono, state: sl.dim ? 'dim' : sl.accent ? 'active' : 'idle', alpha: e.alpha });
    });
    // Stash (and outside) on the side
    const hasOut = !!p.outside;
    const stashR = hasOut && !v ? { ...sideR, h: sideR.h * 0.56 } : hasOut ? { ...sideR, w: sideR.w * 0.5 - s(1) } : sideR;
    const outR = hasOut ? (v ? { x: sideR.x + sideR.w * 0.5 + s(1), y: sideR.y, w: sideR.w * 0.5 - s(1), h: sideR.h } : { x: sideR.x, y: sideR.y + sideR.h * 0.56 + s(3), w: sideR.w, h: sideR.h * 0.44 - s(3) }) : null;
    const panel = (R, title, code, at, dashed) => {
      const e = api.enter(at);
      api.box({ ...R, y: R.y + e.dy, stroke: dashed ? 'lineStrong' : 'line', lineWidth: 4 * k, dash: dashed ? [14, 10] : null, alpha: e.alpha });
      const pad = s(3);
      let y = R.y + pad + e.dy;
      const tl = api.text(title, { x: R.x + pad, y, w: R.w - 2 * pad, role: 'label', color: 'muted', alpha: e.alpha });
      y += tl.height + s(1);
      if (code) { const cl = api.text(code, { x: R.x + pad, y, w: R.w - 2 * pad, role: 'mono', font: 'mono', alpha: e.alpha, fixed: true }); y += cl.height + s(1); }
      return { y: y + s(1) - e.dy, pad };
    };
    if (p.stash) {
      const at = B(p.stash.at ?? 2);
      const { y: sy, pad } = panel(stashR, p.stash.title, p.stash.code, at, false);
      const ih = Math.min(ch * 0.82, 100 * k);
      p.stash.items.forEach((it, j) => {
        const home = { x: stashR.x + pad, y: sy + j * (ih + s(1)), w: stashR.w - 2 * pad, h: ih };
        const e = api.enter(it.at != null ? B(it.at) : at + 0.2 + j * 0.1);
        if (it.moveTo == null) { chip({ ...home, y: home.y + e.dy }, it.label, { mono: it.mono, alpha: e.alpha }); return; }
        const m0 = B(it.moveAt);
        const u = api.progress(m0, 0.9, api.ease.inOutCubic);
        const dst = cell(it.moveTo, it.span || 1);
        const r = { x: api.lerp(home.x, dst.x, u), y: api.lerp(home.y + e.dy, dst.y, u), w: api.lerp(home.w, dst.w, u), h: api.lerp(home.h, dst.h, u) };
        const inTransit = u > 0 && u < 1;
        const isFocus = moving.indexOf(it) === latestMove && u >= 1;
        // Empty outline left behind in the stash once the item has moved out.
        if (u > 0) api.box({ ...home, stroke: 'line', lineWidth: 4 * k, dash: [10, 8], alpha: e.alpha * Math.min(1, u * 2), decor: true });
        chip(r, it.label, { mono: it.mono, alpha: e.alpha, state: isFocus ? 'active' : 'idle', moving: inTransit });
      });
    }
    if (hasOut) {
      const at = B(p.outside.at ?? 3);
      const { y: oy, pad } = panel(outR, p.outside.title, null, at, true);
      // Items as one line of words, separated by middots (no cards: they cost no slots).
      const e = api.enter(at + 0.25);
      api.text(p.outside.items.map((x) => x.label).join(' · '), { x: outR.x + pad, y: oy + e.dy, w: outR.w - 2 * pad, h: outR.y + outR.h - pad - oy, role: 'body', alpha: e.alpha });
    }
    if (p.note) {
      const e = api.enter(B(p.note.at));
      const y = bottom + s(3) + e.dy;
      let x = safe.x;
      if (p.note.code) { const cl = api.text(p.note.code, { x, y: y + 6 * k, w: safe.w * 0.5, role: 'mono', font: 'mono', alpha: e.alpha, fixed: true }); x += cl.width + s(2); }
      api.text(p.note.text, { x, y, w: safe.x + safe.w - x, role: 'body', alpha: e.alpha, fixed: true });
    }
  },
};
