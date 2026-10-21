// One idea, said big. props: { text (use {{word}} for accent), caption?, strikes?: [word] shown crossed out, revealPerSecond?, beats? }
// revealPerSecond > 0 reveals the text word by word (matches narration pace).
export default {
  render(ctx, t, api, p) {
    const { safe, s } = api;
    const w = Math.min(safe.w, api.W * (api.format === '9:16' ? 0.88 : 0.72));
    const x = (api.W - w) / 2;
    const e = api.enter(0.25);
    const reveal = p.revealPerSecond ? Math.max(0, (t - 0.3) * p.revealPerSecond) : undefined;
    const lay = api.layoutText(p.text, { x, y: 0, w, h: safe.h * 0.6, role: 'title' });
    const strikeH = p.strikes ? 100 * api.k + s(5) : 0;
    const blockH = lay.height + (p.caption ? s(5) + 70 * api.k : 0) + strikeH;
    const y = safe.y + (safe.h - blockH) / 2 + e.dy;
    api.text(p.text, { x, y, w, h: safe.h * 0.6, role: 'title', align: 'center', alpha: e.alpha, revealWords: reveal });
    let yy = y + lay.height + s(5);
    if (p.strikes) {
      const gap = s(7);
      const lays = p.strikes.map((wd) => api.layoutText(wd, { x: 0, y: 0, w, role: 'heading', fixed: true }));
      const total = lays.reduce((a, l) => a + l.width, 0) + gap * (lays.length - 1);
      let sx = (api.W - total) / 2;
      p.strikes.forEach((wd, i) => {
        const b0 = p.beats?.[i] ?? 1.2 + i * 1.2;
        const e2 = api.enter(b0);
        api.text(wd, { x: sx, y: yy + e2.dy, w: lays[i].width + 4, role: 'heading', color: 'muted', alpha: e2.alpha, fixed: true });
        const cut = api.progress(b0 + 0.5, 0.4, api.ease.inOutCubic);
        api.line([[sx - 8 * api.k, yy + lays[i].height * 0.55], [sx + lays[i].width + 8 * api.k, yy + lays[i].height * 0.55]], { stroke: 'ink', lineWidth: 5 * api.k, progress: cut, alpha: e2.alpha });
        sx += lays[i].width + gap;
      });
      yy += 100 * api.k + s(5);
    }
    if (p.caption) {
      const c = api.enter(p.strikes ? 3.5 : 0.9);
      api.text(p.caption, { x, y: yy + c.dy, w, role: 'body', color: 'muted', align: 'center', alpha: c.alpha });
    }
  },
};
