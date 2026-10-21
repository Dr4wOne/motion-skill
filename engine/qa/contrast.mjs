// WCAG contrast ≥ 4.5:1 for all steady-state text (fully faded in, scene not fading).
// 1) declared colours, every frame; 2) on sampled PNGs, the actual pixels around each text box.
import { result, contrast, decodeRGB, rgbHex, runs } from './util.mjs';

const MIN = 4.5;

export async function check({ manifests, samples, info }) {
  const bad = [];
  let worst = Infinity;
  for (const m of manifests) {
    if (m.sceneFade < 1) continue;
    for (const tx of m.texts) {
      if (tx.alpha < 0.99) continue;
      const c = contrast(tx.fg, tx.on);
      worst = Math.min(worst, c);
      if (c < MIN) bad.push({ frame: m.frame, scene: m.scene, key: `${tx.fg}/${tx.on}`, msg: `declared ${tx.fg} on ${tx.on} = ${c.toFixed(2)}:1 < ${MIN}: "${tx.text.slice(0, 40)}"` });
    }
  }
  // Pixel verification: sample a ring 6 px outside each box; its median must match the declared background.
  let pixelChecks = 0;
  const pixelBad = [];
  for (const s of samples) {
    if (s.manifest.sceneFade < 1) continue;
    const texts = s.manifest.texts.filter((tx) => tx.alpha >= 0.99);
    if (!texts.length) continue;
    const rgb = await decodeRGB(s.file);
    const sx = info.outW / info.W, sy = info.outH / info.H;
    for (const tx of texts) {
      const ring = [];
      const x0 = Math.round((tx.x - 6) * sx), x1 = Math.round((tx.x + tx.w + 6) * sx), y0 = Math.round((tx.y - 6) * sy), y1 = Math.round((tx.y + tx.h + 6) * sy);
      const px = (x, y) => { if (x < 0 || y < 0 || x >= info.outW || y >= info.outH) return null; const i = (y * info.outW + x) * 3; return [rgb[i], rgb[i + 1], rgb[i + 2]]; };
      for (let x = x0; x <= x1; x += 4) { ring.push(px(x, y0), px(x, y1)); }
      for (let y = y0; y <= y1; y += 4) { ring.push(px(x0, y), px(x1, y)); }
      const pts = ring.filter(Boolean);
      if (!pts.length) continue;
      const med = [0, 1, 2].map((ch) => pts.map((p) => p[ch]).sort((a, b) => a - b)[pts.length >> 1]);
      const actual = rgbHex(...med);
      const c = contrast(tx.fg, actual);
      pixelChecks++;
      worst = Math.min(worst, c);
      if (c < MIN) pixelBad.push({ frame: s.frame, scene: s.manifest.scene, msg: `measured background ${actual} gives ${c.toFixed(2)}:1 for ${tx.fg}: "${tx.text.slice(0, 40)}"` });
    }
  }
  return result('contrast', [...runs(bad, info.fps, (s) => s.msg), ...pixelBad], { minRequired: MIN, worstRatio: +worst.toFixed(2), pixelChecks });
}
