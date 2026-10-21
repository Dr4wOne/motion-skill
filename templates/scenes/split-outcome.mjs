// Two ways side by side (wrong left, right right): each column has a label, the commands typed, a project folder
// that is either unlit ("never read") or lit ("read at launch"), and its own result line. Both stay visible.
// props: { kicker?, heading?, cols: [{ label, code: 'line\nline', folder, files?: [..], lit: bool, result }], beats? }
// beats: [col 0, col 0 result, col 1, col 1 result]. Each card enters together with its content (never empty).
import { beat, header, vertical } from './lib/kit.mjs';

export const meta = { name: 'split-outcome', beats: ['col0', 'result0', 'col1', 'result1'] };

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const v = vertical(api);
    const n = 2 * p.cols.length;
    const gap = s(5);
    const bottom = safe.y + safe.h;
    const m = p.cols.length;
    const cw = v ? safe.w : (safe.w - gap * (m - 1)) / m;
    const pad = s(4);
    const inner = cw - 2 * pad;
    // Measure one column to size the cards and centre them in the area.
    const codeH = (c) => api.layoutText(c.code, { x: 0, y: 0, w: inner - 2 * s(2), role: 'mono', font: 'mono', balance: false, fixed: true }).height;
    const labH = api.layoutText('Wrong', { x: 0, y: 0, w: inner, role: 'heading', fixed: true }).height;
    const folderH = 130 * k;
    const resH = api.layoutText('Result', { x: 0, y: 0, w: inner, role: 'label', fixed: true }).height;
    const cardH = (c) => pad + labH + s(3) + codeH(c) + 2 * s(2) + s(4) + folderH + s(3) + resH + pad;
    const H = Math.max(...p.cols.map(cardH));
    const area = bottom - top;
    const y0 = v ? top : top + Math.max(0, (area - H) / 2);
    p.cols.forEach((c, i) => {
      const at = beat(api, p, 2 * i, n), rAt = beat(api, p, 2 * i + 1, n);
      const e = api.enter(at);
      if (e.alpha <= 0) return;
      const x = v ? safe.x : safe.x + i * (cw + gap);
      const y = (v ? y0 + i * (H + gap) : y0) + e.dy;
      api.box({ x, y, w: cw, h: H, fill: 'surface', alpha: e.alpha });
      let yy = y + pad;
      api.text(c.label, { x: x + pad, y: yy, w: inner, role: 'heading', color: c.lit ? 'ink' : 'muted', on: 'surface', alpha: e.alpha, fixed: true });
      yy += labH + s(3);
      const ch = codeH(c) + 2 * s(2);
      api.box({ x: x + pad, y: yy, w: inner, h: ch, fill: 'surface2', alpha: e.alpha });
      api.text(c.code, { x: x + pad + s(2), y: yy + s(2), w: inner - 2 * s(2), role: 'mono', font: 'mono', on: 'surface2', alpha: e.alpha, balance: false, fixed: true, allowOrphan: true });
      yy += ch + s(4);
      // Project folder: a tab + body. Unlit: dashed outline, muted. Lit: accent outline once its result lands.
      const er = api.enter(rAt, { rise: 0 });
      const litNow = c.lit && t >= rAt;
      const fw = inner, fx = x + pad;
      const tabW = 140 * k, tabH = 26 * k;
      const stroke = litNow ? 'accent' : 'lineStrong';
      const dash = c.lit ? null : [12, 10];
      api.line([[fx, yy + tabH], [fx, yy], [fx + tabW, yy], [fx + tabW + 20 * k, yy + tabH]], { stroke, lineWidth: 4 * k, alpha: e.alpha, dash });
      api.box({ x: fx, y: yy + tabH, w: fw, h: folderH - tabH, fill: litNow ? 'surface2' : null, stroke, lineWidth: 4 * k, dash, alpha: e.alpha });
      api.text(c.folder, { x: fx + s(2), y: yy + tabH + s(2), w: fw - s(4), role: 'mono', font: 'mono', color: litNow ? 'ink' : 'muted', on: litNow ? 'surface2' : 'surface', alpha: e.alpha, fixed: true });
      if (c.files) api.text(c.files.join('  '), { x: fx + s(2), y: yy + tabH + s(2) + 56 * k, w: fw - s(4), role: 'mono', font: 'mono', color: 'ink', on: 'surface2', alpha: er.alpha * (litNow ? 1 : 0), fixed: true });
      yy += folderH + s(3);
      api.text(c.result, { x: x + pad, y: yy, w: inner, h: resH, role: 'label', color: c.lit ? 'ink' : 'muted', on: 'surface', alpha: er.alpha });
    });
  },
};
