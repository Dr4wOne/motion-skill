// Bridge-in card: "Topic 2 of 5" + title + promise. props: { index, total, title, promise, list? }
// Opt-in list: [topic titles] → split layout (16:9 only): title + promise left-aligned, the roadmap list on the
// right with done topics muted, the current one in ink beside an accent bar, later ones muted.
export default {
  render(ctx, t, api, p) {
    const { safe, s } = api;
    if (p.list && api.format !== '9:16') return split(api, p);
    const w = Math.min(safe.w, api.W * 0.72), x = (api.W - w) / 2;
    const e1 = api.enter(0.1), e2 = api.enter(0.3), e3 = api.enter(0.6);
    const kick = api.layoutText(`Topic ${p.index} of ${p.total}`, { x, y: 0, w, role: 'label' });
    const tit = api.layoutText(p.title, { x, y: 0, w, role: 'display' });
    const pro = api.layoutText(p.promise, { x, y: 0, w, role: 'body' });
    let y = safe.y + (safe.h - (kick.height + tit.height + pro.height + 2 * s(4))) / 2;
    api.text(`Topic ${p.index} of ${p.total}`, { x, y: y + e1.dy, w, role: 'label', color: 'accent', align: 'center', alpha: e1.alpha });
    y += kick.height + s(4);
    api.text(p.title, { x, y: y + e2.dy, w, role: 'display', align: 'center', alpha: e2.alpha });
    y += tit.height + s(4);
    api.text(p.promise, { x, y: y + e3.dy, w, role: 'body', color: 'muted', align: 'center', alpha: e3.alpha });
  },
};

function split(api, p) {
  const { safe, s, k } = api;
  const lw = safe.w * 0.56, x = safe.x;
  const e1 = api.enter(0.1), e2 = api.enter(0.25), e3 = api.enter(0.5);
  const kickT = `Topic ${p.index} of ${p.total}`;
  const kick = api.layoutText(kickT, { x, y: 0, w: lw, role: 'label' });
  const tit = api.layoutText(p.title, { x, y: 0, w: lw, role: 'display' });
  const pro = api.layoutText(p.promise, { x, y: 0, w: lw, role: 'body' });
  const top = safe.y + 90 * k; // clear of the tracker line
  const avail = safe.y + safe.h - top;
  let y = top + (avail - (kick.height + tit.height + pro.height + s(3) + s(5))) / 2;
  api.text(kickT, { x, y: y + e1.dy, w: lw, role: 'label', color: 'muted', alpha: e1.alpha });
  y += kick.height + s(3);
  api.text(p.title, { x, y: y + e2.dy, w: lw, role: 'display', alpha: e2.alpha });
  y += tit.height + s(5);
  api.text(p.promise, { x, y: y + e3.dy, w: lw, role: 'body', color: 'muted', alpha: e3.alpha });
  // Roadmap list on the right third.
  const lx = safe.x + safe.w * 0.66, lwR = safe.x + safe.w - lx;
  const rowH = 84 * k;
  let ly = top + (avail - p.list.length * rowH) / 2;
  p.list.forEach((title, i) => {
    const e = api.enter(0.2 + i * 0.07);
    const cur = i === p.index - 1;
    if (cur) api.box({ x: lx, y: ly + e.dy + 8 * k, w: 8 * k, h: rowH - 32 * k, fill: 'accent', radius: 4 * k, alpha: e.alpha, decor: true });
    api.text(title, { x: lx + 36 * k, y: ly + e.dy, w: lwR - 36 * k, role: 'label', color: cur ? 'ink' : 'muted', alpha: e.alpha, fixed: true });
    ly += rowH;
  });
}
