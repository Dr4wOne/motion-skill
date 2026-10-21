// Text that doesn't fit its box, orphan last words, and text under the size floor. Every frame.
import { result, runs } from './util.mjs';

export async function check({ manifests, info }) {
  const bad = [];
  let texts = 0;
  for (const m of manifests) for (const tx of m.texts) {
    if (tx.alpha < 0.05) continue;
    texts++;
    if (!tx.fits) bad.push({ frame: m.frame, scene: m.scene, key: `fit:${tx.text}`, msg: `does not fit its box at ${tx.px}px: "${tx.text.slice(0, 60)}"` });
    if (tx.orphan) bad.push({ frame: m.frame, scene: m.scene, key: `orphan:${tx.text}`, msg: `single-word last line: "${tx.text.slice(-40)}"` });
    if (tx.px < tx.minPx) bad.push({ frame: m.frame, scene: m.scene, key: `size:${tx.text}`, msg: `${tx.px}px < floor ${tx.minPx}px: "${tx.text.slice(0, 40)}"` });
  }
  bad.sort((a, b) => a.key.localeCompare(b.key) || a.frame - b.frame);
  return result('overflow', runs(bad, info.fps, (s) => s.msg), { framesChecked: manifests.length, textDraws: texts });
}
