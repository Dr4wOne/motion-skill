// Closing card. props: { credit, url, next? }
export default {
  render(ctx, t, api, p) {
    const { safe, s } = api;
    const w = Math.min(safe.w, api.W * 0.8);
    const x = (api.W - w) / 2;
    const e1 = api.enter(0.3), e2 = api.enter(0.8), e3 = api.enter(1.4);
    const lays = [api.layoutText(p.credit, { x, y: 0, w, role: 'body' }), api.layoutText(p.url, { x, y: 0, w, role: 'title' }), p.next ? api.layoutText(p.next, { x, y: 0, w, role: 'label' }) : null];
    const total = lays.reduce((a, l) => a + (l ? l.height + s(5) : 0), 0);
    let y = safe.y + (safe.h - total) / 2;
    api.text(p.credit, { x, y: y + e1.dy, w, role: 'body', color: 'muted', align: 'center', alpha: e1.alpha });
    y += lays[0].height + s(5);
    api.text(p.url, { x, y: y + e2.dy, w, role: 'title', color: 'accent', align: 'center', alpha: e2.alpha });
    y += lays[1].height + s(5);
    if (p.next) api.text(p.next, { x, y: y + e3.dy, w, role: 'label', align: 'center', alpha: e3.alpha });
  },
};
