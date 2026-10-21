// B5: every colour drawn in brand scenes (intro/outro/sting) is within ΔE2000 ≤ 5 of a colour in brand/palette.json.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { result, skip } from './util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function lab(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const [r, g, b] = lin;
  const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883];
  const f = xyz.map((v) => (v > 216 / 24389 ? Math.cbrt(v) : (24389 / 27 * v + 16) / 116));
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}

// CIEDE2000 (Sharma et al. 2005).
export const deltaE2000 = (h1, h2) => deltaE2000Lab(lab(h1), lab(h2));
export function deltaE2000Lab([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G), C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (b, a) => { const v = Math.atan2(b, a) / rad; return v < 0 ? v + 360 : v; };
  const h1p = h(b1, a1p), h2p = h(b2, a2p);
  const dL = L2 - L1, dC = C2p - C1p;
  let dh = h2p - h1p; if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lb = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hb = h1p + h2p; if (C1p * C2p !== 0) hb = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2 : (h1p + h2p) / 2;
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cbp, SH = 1 + 0.015 * Cbp * T;
  const RT = -2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}

export async function check({ manifests, root = ROOT }) {
  const pf = path.join(root, 'brand/palette.json');
  if (!existsSync(pf)) return skip('palette', 'no brand/palette.json');
  const ref = JSON.parse(readFileSync(pf, 'utf8')).colors.map((c) => c.hex.toUpperCase());
  const brandFrames = manifests.filter((m) => ['sting', 'outro'].includes(m.block) || /^(intro|outro)-/.test(m.scene));
  if (!brandFrames.length) return skip('palette', 'no brand scenes in this render');
  const used = new Set(brandFrames.flatMap((m) => [...(m.colors || []), ...m.texts.map((t) => t.fg)]).map((c) => c.toUpperCase()));
  const fails = [];
  let worst = 0;
  for (const c of used) {
    const d = Math.min(...ref.map((r) => deltaE2000(c, r)));
    worst = Math.max(worst, d);
    if (d > 5) fails.push({ msg: `${c} is ΔE ${d.toFixed(1)} from the nearest palette.json colour (max 5)` });
  }
  return result('palette', fails, { colours: used.size, worstDeltaE: +worst.toFixed(2) });
}
