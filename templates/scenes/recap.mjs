// Recap. mode 'line' (one topic): props.text (the recap line, ≤ 12 words) under a small "Recap" label.
// props.align: 'left' (opt-in) left-aligns the line mode; with align 'left', props.echo ('buckets' | 'homes' | 'slot'
// | 'gear' | 'bar') draws a small wordless echo of the topic's diagram on the right; props.labelColor overrides the label colour.
// mode 'strip' (end of video): every roadmap topic with its recap line, ticked off one by one (opt-in valign: 'middle').
import { beat, header } from './lib/kit.mjs';

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    if ((p.mode || 'line') === 'line') {
      // Opt-in align: 'left' → the label and line sit on the safe-area left edge (same vertical centring).
      const left = p.align === 'left';
      const echo = left && p.echo && api.format !== '9:16';
      const w = echo ? safe.w * 0.56 : left ? Math.min(safe.w, api.format === '9:16' ? safe.w : safe.w * 0.78) : Math.min(safe.w, api.W * 0.74), x = left ? safe.x : (api.W - w) / 2;
      if (echo) drawEcho(api, p.echo, { x: safe.x + safe.w * 0.64, y: safe.y + 90 * api.k, w: safe.w * 0.36, h: safe.h - 90 * api.k });
      const al = left ? 'left' : 'center';
      const e1 = api.enter(0.1), e2 = api.enter(0.35);
      const lab = api.layoutText(p.label || 'Recap', { x, y: 0, w, role: 'label' });
      const tx = api.layoutText(p.text, { x, y: 0, w, h: safe.h * 0.5, role: 'title' });
      let y = safe.y + (safe.h - lab.height - s(4) - tx.height) / 2;
      const vEcho = left && p.echo && api.format === '9:16'; // 9:16: text and echo stacked, centred as one group
      if (vEcho) {
        const eh = 300 * k, blockH = lab.height + s(4) + tx.height + s(6) + eh;
        y = safe.y + (safe.h - blockH) / 2;
        drawEcho(api, p.echo, { x: safe.x, y: y + lab.height + s(4) + tx.height + s(6), w: safe.w * 0.8, h: eh });
      }
      api.text(p.label || 'Recap', { x, y: y + e1.dy, w, role: 'label', color: p.labelColor || 'accent', align: al, alpha: e1.alpha });
      api.text(p.text, { x, y: y + lab.height + s(4) + e2.dy, w, h: safe.h * 0.5, role: 'title', align: al, alpha: e2.alpha });
      return;
    }
    const top = header(api, p);
    const n = p.topics.length;
    const rowH = Math.min(140 * k, (safe.y + safe.h - top) / n);
    p.topics.forEach((tp, i) => {
      const b0 = beat(api, p, i, n, { lead: 0.4, tail: 1.5 });
      const e = api.enter(b0);
      const y = top + (p.valign === 'middle' ? Math.max(0, (safe.y + safe.h - top - n * rowH) / 2) : 0) + i * rowH + e.dy;
      const tick = api.progress(b0 + 0.3, 0.35, api.ease.inOutCubic);
      api.circle({ x: safe.x + 24 * k, y: y + 26 * k, r: 20 * k, stroke: 'accent', lineWidth: 3 * k, alpha: e.alpha });
      api.line([[safe.x + 14 * k, y + 27 * k], [safe.x + 22 * k, y + 35 * k], [safe.x + 35 * k, y + 17 * k]], { stroke: 'accent', lineWidth: 4 * k, progress: tick, alpha: e.alpha });
      const tl = api.text(tp.title, { x: safe.x + 70 * k, y, w: safe.w * 0.3, role: 'label', alpha: e.alpha, fixed: true });
      api.text(tp.recap, { x: safe.x + 70 * k + safe.w * 0.31, y, w: safe.w - 70 * k - safe.w * 0.31, h: rowH - s(1), role: 'label', color: 'muted', alpha: e.alpha });
    });
  },
};

// A wordless thumbnail of a topic's diagram (graphic only, one accent element), centred in rect r.
function drawEcho(api, kind, r) {
  const { k } = api;
  const e = api.enter(0.5);
  const a = e.alpha;
  const W = Math.min(r.w, 560 * k), H = Math.min(r.h, 340 * k);
  const x0 = r.x + (r.w - W) / 2, y0 = r.y + (r.h - H) / 2 + e.dy;
  const lw = 5 * k;
  if (kind === 'buckets') {
    const bw = (W - 2 * 32 * k) / 3;
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * (bw + 32 * k);
      api.line([[x, y0], [x, y0 + H], [x + bw, y0 + H], [x + bw, y0]], { stroke: 'lineStrong', lineWidth: lw, alpha: a, dash: i === 2 ? [14, 10] : undefined });
      api.box({ x: x + 16 * k, y: y0 + H - 16 * k - 70 * k, w: bw - 32 * k, h: 70 * k, fill: i === 0 ? 'accent' : 'surface2', alpha: a, decor: true });
    }
  } else if (kind === 'homes') {
    const fw = (W - 2 * 32 * k) / 3, fh = H * 0.6, y = y0 + (H - fh) / 2;
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * (fw + 32 * k), lit = i === 2;
      api.line([[x, y + 24 * k], [x, y], [x + fw * 0.4, y], [x + fw * 0.4 + 18 * k, y + 24 * k]], { stroke: lit ? 'accent' : 'lineStrong', lineWidth: lw, alpha: a });
      api.box({ x, y: y + 24 * k, w: fw, h: fh - 24 * k, fill: lit ? 'surface2' : 'surface', stroke: lit ? 'accent' : 'lineStrong', lineWidth: lw, alpha: a, decor: true });
    }
  } else if (kind === 'slot') {
    const g = 16 * k, cw = (W - 2 * g) / 3, ch = (H - 2 * g) / 3;
    for (let i = 0; i < 9; i++) {
      const x = x0 + (i % 3) * (cw + g), y = y0 + Math.floor(i / 3) * (ch + g);
      api.box({ x, y, w: cw, h: ch, fill: i === 2 ? 'surface2' : 'surface', stroke: i === 2 ? 'accent' : null, lineWidth: lw, alpha: a, decor: true });
    }
  } else if (kind === 'gear') {
    const cy = y0 + H * 0.62, gx = x0 + W * 0.38;
    api.line([[x0, cy], [x0 + W, cy]], { stroke: 'lineStrong', lineWidth: lw, alpha: a });
    for (let i = 0; i < 4; i++) api.circle({ x: x0 + W * ((i + 0.5) / 4), y: cy, r: 14 * k, fill: 'bg', stroke: 'lineStrong', lineWidth: lw, alpha: a });
    const gy = cy - 110 * k, R = 42 * k;
    const { ctx } = api;
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = api.color('accent'); ctx.lineWidth = 6 * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(gx, gy, R, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) { const an = (i * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(gx + Math.cos(an) * R, gy + Math.sin(an) * R); ctx.lineTo(gx + Math.cos(an) * (R + 14 * k), gy + Math.sin(an) * (R + 14 * k)); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(gx, gy, R * 0.38, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    api.line([[gx, gy + R + 16 * k], [gx, cy - 20 * k]], { stroke: 'accent', lineWidth: lw, alpha: a });
  } else if (kind === 'bar') {
    const bh = 56 * k, y = y0 + (H - 2 * bh - 48 * k) / 2;
    for (let j = 0; j < 2; j++) {
      const yy = y + j * (bh + 48 * k);
      api.box({ x: x0, y: yy, w: W, h: bh, fill: 'surface', radius: 4 * k, alpha: a, decor: true });
      api.box({ x: x0, y: yy, w: W * 0.42, h: bh, fill: 'lineStrong', radius: 4 * k, alpha: a, decor: true });
      if (j === 1) api.box({ x: x0 + W * 0.42, y: yy, w: W * 0.08, h: bh, fill: 'accent', radius: 2 * k, alpha: a, decor: true });
    }
    api.line([[x0 + W * 0.42, y - 18 * k], [x0 + W * 0.42, y + 2 * bh + 48 * k + 18 * k]], { stroke: 'ink', lineWidth: lw, alpha: a });
  }
}
