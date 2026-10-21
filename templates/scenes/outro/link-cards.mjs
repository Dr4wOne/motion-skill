// Starter outro: Link Cards (calm and legible).
// Left column: small wordmark, "Thanks for watching", one hairline-divided row per link (platform + exact display text),
// subscribe + next-video prompts. Right side: YouTube end-screen slots, reserved every frame.
import { B, wordmark, endScreen, freeColumn, linkLabel } from '../lib/brand.mjs';

const T_HEAD = 0.4, T_CARDS = 1.1, STAGGER = 0.16;

export const meta = {
  duration: 18,
  sfx: [
    { at: 0.2, kind: 'swell', args: [1.6, -36, 3], gain: 0.6 },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: T_CARDS + i * STAGGER + 0.08, kind: 'tick', args: [1100 + i * 60, 0.07, -40], gain: 0.5, pan: -0.3 })),
  ],
};

export default {
  render(ctx, t, api, props) {
    const { k, s } = api;
    api.box({ x: 0, y: 0, w: api.W, h: api.H, fill: B('bg'), radius: 0, decor: true });
    const es = endScreen(api, { preview: props.preview });
    const col = freeColumn(api);

    // Small wordmark, top left (cap 48 = minimum; clear space 48 around it).
    const cap = 48;
    const wmIn = api.enter(0.15);
    const wmLay = api.layoutText(api.brand?.wordmark?.text || 'Your Channel', { x: 0, y: 0, w: api.W, role: 'title', font: 'brand', weight: 700, px: cap / 0.7 / k, fixed: true });
    const wm = wordmark(api, { cx: col.x, cy: col.y + wmLay.height / 2, cap, alpha: wmIn.alpha, align: 'left' });
    let y = wm.y + wm.h + cap + s(1);

    // Headline + one short accent rule (the only accent besides the 4 in the wordmark).
    const h = api.enter(T_HEAD);
    const head = api.text('Thanks for watching', { x: col.x, y: y + h.dy, w: col.w, role: 'heading', font: 'brand', weight: 700, color: B('ink'), alpha: h.alpha, fixed: true });
    y += head.height + s(1);
    api.line([[col.x, y], [col.x + s(5), y]], { stroke: B('accent'), lineWidth: 3 * k, progress: api.progress(T_HEAD + 0.3, 0.6, api.ease.inOutCubic) });
    y += s(2);

    // Link rows: platform name + exact display text, hairline divider under each; rows settle in with a stagger.
    const links = api.brand?.links || [];
    // Shared sizes: label column = widest platform name; display text 40 px, or 36 px if the longest won't fit.
    const rowH = 80 * k;
    const wOf = (str, o) => api.layoutText(str, { x: 0, y: 0, w: api.W, fixed: true, ...o }).width;
    const labelW = Math.max(...links.map((l) => wOf(linkLabel(l.platform), { role: 'small', font: 'brand', weight: 500 }))) + s(4);
    const dispW = col.w - labelW;
    const dispPx = Math.max(...links.map((l) => wOf(l.display, { role: 'label', font: 'serif' }))) <= dispW - s(3) ? 40 : 36;
    links.forEach((l, i) => {
      const at = T_CARDS + i * STAGGER;
      const p = api.progress(at, 0.7, api.ease.house);
      const dx = api.reducedMotion ? 0 : (1 - p) * 32 * k; // settles leftwards into the column
      const ry = y + i * rowH;
      const mid = ry + rowH / 2;
      api.text(linkLabel(l.platform), { x: col.x + dx, y: mid - (36 * 1.3 * k) / 2, w: labelW, role: 'small', font: 'brand', weight: 500, color: B('muted'), alpha: p, fixed: true });
      api.text(l.display, { x: col.x + labelW + dx, y: mid - (dispPx * 1.25 * k) / 2, w: dispW - s(3), role: 'label', font: 'serif', px: dispPx, color: B('ink'), alpha: p, fixed: true });
      api.line([[col.x, ry + rowH], [col.x + col.w - s(3), ry + rowH]], { stroke: B('line'), lineWidth: 1.5 * k, progress: api.progress(at, 0.8, api.ease.inOutCubic) });
    });
    y += links.length * rowH + s(3);

    // Prompts (plain text).
    const t0 = T_CARDS + links.length * STAGGER + 0.5;
    const e1 = api.enter(t0), e2 = api.enter(t0 + 0.3);
    const sub = api.text(props.subscribe || 'Subscribe for more.', { x: col.x, y: y + e1.dy, w: col.w, role: 'small', font: 'serif', color: B('ink'), alpha: e1.alpha, fixed: true });
    y += sub.height + s(0);
    // Without end-screen slots (9:16 Shorts have none) the prompt points to the channel instead.
    api.text(es ? 'Next video: pick one on the right →' : 'The full video is on the channel.', { x: col.x, y: y + e2.dy, w: col.w, role: 'small', font: 'serif', color: B('muted'), alpha: e2.alpha, fixed: true });
  },
};
