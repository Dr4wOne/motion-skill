// The events of one turn on a timeline; a hook (gear) sits on one event and fires each time a turn passes it.
// Optional comparison underneath (e.g. CLAUDE.md is advice | a hook always runs).
// props: { kicker?, heading?, events: [{ label }], fire: event index, hook?: label, passes?: 2,
//   compare?: [{ title, mono?, sub, accent? }, …], beats? }
// beats: [timeline, first fire, compare[0], compare[1], …]
import { beat, header, vertical } from './lib/kit.mjs';

export const meta = { name: 'event-timeline', beats: ['timeline', 'fire', 'compare…'] };

function gear(api, cx, cy, r, { alpha = 1, stroke = 'accent', turn = 0 } = {}) {
  const { ctx, k } = api;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = api.color(stroke);
  ctx.lineWidth = 6 * k;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = turn + (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * (r + 12 * k), cy + Math.sin(a) * (r + 12 * k));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const v = vertical(api);
    const nc = p.compare ? p.compare.length : 0;
    const n = 2 + nc;
    const b0 = beat(api, p, 0, n), b1 = beat(api, p, 1, n);
    const m = p.events.length;
    const compH = nc ? 260 * k : 0;
    // 9:16: centre the group (gear + line + labels + comparison) in the area under the heading.
    const groupH = 140 * k + 170 * k + (nc ? s(5) + compH : 0);
    const off = v ? Math.max(0, (safe.y + safe.h - top - groupH) / 2) : 0;
    const zone = { x: safe.x, y: top + off, w: safe.w, h: safe.y + safe.h - top - off - compH - (nc ? s(5) : 0) };
    const lineY = v ? zone.y + 140 * k : zone.y + Math.min(zone.h * 0.42, 190 * k);
    const xs = p.events.map((_, i) => zone.x + zone.w * ((i + 0.5) / m));
    const e0 = api.enter(b0);
    api.line([[zone.x, lineY], [zone.x + zone.w, lineY]], { stroke: 'lineStrong', lineWidth: 4 * k, progress: api.progress(b0, 0.8, api.ease.inOutCubic), alpha: e0.alpha });
    const labW = zone.w / m - s(3);
    p.events.forEach((ev, i) => {
      const e = api.enter(b0 + 0.2 + i * 0.08);
      api.circle({ x: xs[i], y: lineY, r: 14 * k, fill: 'bg', stroke: i === p.fire ? 'accent' : 'lineStrong', lineWidth: 4 * k, alpha: e.alpha });
      api.text(ev.label, { x: xs[i] - labW / 2, y: lineY + 40 * k + e.dy, w: labW, h: (v ? 130 : 110) * k, role: 'label', align: 'center', color: i === p.fire ? 'ink' : 'muted', alpha: e.alpha });
    });
    // Turns travel along the line; the first reaches the hook at b1, the next ones follow.
    const travel = 2.6, every = 3.0;
    const fx = xs[p.fire];
    const uFire = (fx - zone.x) / zone.w;
    const passes = p.passes ?? 2;
    let lastFire = -Infinity;
    for (let j = 0; j < passes; j++) {
      const start = b1 - uFire * travel + j * every;
      const u = (t - start) / travel;
      if (u >= uFire) lastFire = start + uFire * travel;
      if (u > 0 && u < 1) {
        const a = Math.min(1, u * 8, (1 - u) * 8);
        api.circle({ x: zone.x + zone.w * u, y: lineY, r: 11 * k, fill: 'ink', alpha: a });
      }
    }
    // Gear above the hooked event: appears just before the first turn arrives, turns a notch per fire.
    const eg = api.enter(b1 - 1.0);
    const gy = lineY - 92 * k;
    const fires = passes ? Array.from({ length: passes }, (_, j) => b1 + j * every).filter((x) => t >= x).length : 0;
    const notch = fires * (Math.PI / 8); // one notch per fire
    gear(api, fx, gy + eg.dy, 34 * k, { alpha: eg.alpha, turn: notch });
    api.line([[fx, gy + 46 * k + eg.dy], [fx, lineY - 18 * k]], { stroke: 'accent', lineWidth: 4 * k, alpha: eg.alpha });
    if (lastFire > -Infinity) {
      const ring = Math.min(1, (t - lastFire) / 0.6);
      if (ring < 1) api.circle({ x: fx, y: lineY, r: (16 + 40 * ring) * k, stroke: 'accent', lineWidth: 4 * k, alpha: 1 - ring });
    }
    if (p.hook) {
      const lay = api.layoutText(p.hook, { x: 0, y: 0, w: labW, role: 'label', fixed: true });
      api.text(p.hook, { x: fx + 64 * k, y: gy - lay.height / 2 + eg.dy, w: labW, role: 'label', color: 'ink', alpha: eg.alpha, fixed: true });
    }
    // Comparison boxes
    if (nc) {
      const cy0 = v ? lineY + 170 * k + s(5) : safe.y + safe.h - compH;
      const gap = s(4);
      const cw = (safe.w - gap * (nc - 1)) / nc;
      const chh = compH;
      p.compare.forEach((c, i) => {
        const e = api.enter(beat(api, p, 2 + i, n));
        const r = { x: safe.x + i * (cw + gap), y: cy0, w: cw, h: chh };
        const fill = c.accent ? 'surface2' : 'surface';
        api.box({ ...r, y: r.y + e.dy, fill, stroke: c.accent ? 'accent' : null, lineWidth: 4 * k, alpha: e.alpha });
        const pad = s(3);
        const tl = api.text(c.title, { x: r.x + pad, y: r.y + pad + e.dy, w: r.w - 2 * pad, role: 'heading', font: c.mono ? 'mono' : undefined, on: fill, alpha: e.alpha, fixed: true });
        api.text(c.sub, { x: r.x + pad, y: r.y + pad + tl.height + s(1) + e.dy, w: r.w - 2 * pad, h: r.h - 2 * pad - tl.height - s(1), role: 'label', color: c.accent ? 'ink' : 'muted', on: fill, alpha: e.alpha });
      });
    }
  },
};
