// Title card. props: { kicker?, title, subtitle? }
export default {
  render(ctx, t, api, p) {
    const { safe, s } = api;
    const w = Math.min(safe.w, api.W * 0.78);
    const x = (api.W - w) / 2;
    const k1 = api.enter(0.2), k2 = api.enter(0.45), k3 = api.enter(0.9);
    let y = safe.y + safe.h * (api.format === '9:16' ? 0.18 : 0.26);
    if (p.kicker) {
      const lay = api.text(p.kicker, { x, y: y + k1.dy, w, role: 'label', color: 'accent', align: 'center', alpha: k1.alpha });
      y += lay.height + s(4);
    }
    const tl = api.text(p.title, { x, y: y + k2.dy, w, h: safe.h * 0.42, role: 'display', align: 'center', alpha: k2.alpha });
    y += tl.height + s(5);
    api.line([[api.W / 2 - s(5), y], [api.W / 2 + s(5), y]], { stroke: 'accent', progress: api.progress(0.8, 0.6, api.ease.inOutCubic) });
    y += s(5);
    if (p.subtitle) api.text(p.subtitle, { x, y: y + k3.dy, w, role: 'body', color: 'muted', align: 'center', alpha: k3.alpha });
  },
};
