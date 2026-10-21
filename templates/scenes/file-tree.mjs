// A small folder tree (mono names, serif notes) beside an optional file panel whose lines appear or type in.
// Entries can grey out between two beats (e.g. "ignored") and light up again with another note.
// props: { kicker?, heading?, root, entries: [{ name, depth?: 1, note?, at?: beat, dim?: [fromBeat, toBeat],
//   dimNote?, litNote? }], skip?: n (opens with beats 0..n-1 already done), file?: { title, at?: beat, lines: [{ text, at?: beat, mono?: bool, typed?: bool, accent?: bool }] }, beats }
import { beat, header, vertical } from './lib/kit.mjs';

export const meta = { name: 'file-tree', beats: 'referenced by index from entries/file' };

export default {
  render(ctx, t, api, p) {
    const { safe, s, k } = api;
    const top = header(api, p);
    const v = vertical(api);
    const nb = p.beats?.length || 3;
    // Opt-in skip: n → beats with index < n have already happened (the scene opens in that state); beat index i ≥ n
    // reads props.beats[i - n]. Used to continue one animation across two scenes.
    const skip = p.skip || 0;
    const B = (i) => ((i ?? 0) < skip ? -10 : beat(api, p, (i ?? 0) - skip, nb));
    const H = safe.y + safe.h - top;
    const treeR = v || !p.file ? { x: safe.x, y: top, w: safe.w, h: p.file ? H * 0.55 : H } : { x: safe.x, y: top, w: safe.w * 0.56, h: H };
    const fileR = p.file ? (v ? { x: safe.x, y: top + H * 0.55 + s(4), w: safe.w, h: H * 0.45 - s(4) } : { x: safe.x + safe.w * 0.6, y: top, w: safe.w * 0.4, h: H }) : null;
    const rowH = 96 * k, indent = 64 * k, namePx = 52;
    const rowsN = 1 + p.entries.length;
    let y0 = treeR.y + Math.max(0, (treeR.h - rowsN * rowH) / 2);
    if (fileR && !v) { // size the file card to its content and centre it on the tree
      const pd = s(4);
      const ttl = api.layoutText(p.file.title, { x: 0, y: 0, w: fileR.w - 2 * pd, role: 'label', fixed: true }).height;
      const body = p.file.lines.reduce((acc, ln) => acc + api.layoutText(ln.text, { x: 0, y: 0, w: fileR.w - 2 * pd, role: ln.mono ? 'mono' : 'body', font: ln.mono ? 'mono' : undefined, px: ln.mono ? namePx : undefined, fixed: true }).height + s(2), 0);
      fileR.h = pd + ttl + s(4) + body - s(2) + pd;
      fileR.y = Math.max(top, y0 + (rowsN * rowH) / 2 - fileR.h / 2);
    }
    const er = api.enter(B(0) - 0.2);
    const rootLay = api.text(p.root, { x: treeR.x, y: y0 + er.dy, w: treeR.w, role: 'mono', font: 'mono', px: namePx, alpha: er.alpha, fixed: true });
    const noteX = treeR.x + (v ? 0.5 : 0.46) * treeR.w;
    p.entries.forEach((en, i) => {
      const at = B(en.at ?? 0) + i * 0.08;
      const e = api.enter(at);
      const d = en.depth ?? 1;
      const y = y0 + (i + 1) * rowH + e.dy;
      const x = treeR.x + d * indent;
      // Connector: vertical from the parent row, then a stub into the name.
      const cx = x - indent + 22 * k, cy = y + rootLay.height / 2;
      api.line([[cx, y - rowH + rootLay.height + 6 * k], [cx, cy], [x - 14 * k, cy]], { stroke: 'line', lineWidth: 4 * k, alpha: e.alpha, progress: api.progress(at, 0.4) });
      const dimmed = en.dim && t >= B(en.dim[0]) && (en.dim[1] == null || t < B(en.dim[1]));
      const relit = en.dim && en.dim[1] != null && t >= B(en.dim[1]);
      const dimA = en.dim ? api.progress(B(en.dim[0]), 0.4) * (en.dim[1] != null ? 1 - api.progress(B(en.dim[1]), 0.4) : 1) : 0;
      api.text(en.name, { x, y, w: noteX - x - s(2), role: 'mono', font: 'mono', px: namePx, color: dimA > 0.5 ? 'muted' : 'ink', alpha: e.alpha * (1 - 0.35 * dimA), fixed: true });
      const note = dimmed && en.dimNote ? en.dimNote : relit && en.litNote ? en.litNote : en.note;
      const noteAccent = (dimmed && en.dimNote) || (relit && en.litNote);
      if (note) {
        const switchAt = dimmed ? B(en.dim[0]) : relit ? B(en.dim[1]) : at;
        const en2 = api.enter(switchAt, { rise: 0 });
        api.text(note, { x: noteX, y, w: treeR.x + treeR.w - noteX, h: rootLay.height, valign: 'middle', role: 'label', color: noteAccent ? 'accent' : 'muted', alpha: e.alpha * en2.alpha });
      }
    });
    if (p.file) {
      const f = p.file;
      const ef = api.enter(B(f.at ?? 1));
      api.box({ ...fileR, y: fileR.y + ef.dy, fill: 'surface', alpha: ef.alpha });
      const pad = s(4);
      let y = fileR.y + pad + ef.dy;
      const tl = api.text(f.title, { x: fileR.x + pad, y, w: fileR.w - 2 * pad, role: 'label', color: 'muted', on: 'surface', alpha: ef.alpha, fixed: true });
      y += tl.height + s(4);
      for (const ln of f.lines) {
        const at = B(ln.at ?? f.at ?? 1);
        const shown = t >= at;
        const lay = api.layoutText(ln.text, { x: 0, y: 0, w: fileR.w - 2 * pad, role: ln.mono ? 'mono' : 'body', font: ln.mono ? 'mono' : undefined, px: ln.mono ? namePx : undefined, fixed: true });
        if (shown) {
          if (ln.typed) {
            const nChars = Math.min(ln.text.length, Math.floor((t - at) * 18) + 1);
            const str = ln.text.slice(0, nChars);
            const tl2 = api.text(str, { x: fileR.x + pad, y, w: fileR.w - 2 * pad, role: 'mono', font: 'mono', px: namePx, color: ln.accent ? 'accent' : 'ink', on: 'surface', fixed: true, balance: false, allowOrphan: true });
            if (nChars < ln.text.length) api.box({ x: fileR.x + pad + tl2.width + 6 * k, y: y + 8 * k, w: 24 * k, h: lay.height - 16 * k, fill: 'ink', radius: 2 * k, decor: true });
          } else {
            const el = api.enter(at);
            api.text(ln.text, { x: fileR.x + pad, y: y + el.dy, w: fileR.w - 2 * pad, role: ln.mono ? 'mono' : 'body', font: ln.mono ? 'mono' : undefined, px: ln.mono ? namePx : undefined, color: ln.accent ? 'accent' : ln.mono ? 'ink' : 'muted', on: 'surface', alpha: el.alpha * ef.alpha });
          }
        }
        y += lay.height + s(2);
      }
    }
  },
};
