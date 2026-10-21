// Every visible text box must sit inside the format's safe rect. Every frame.
import { result, runs } from './util.mjs';
import { inside } from '../safe-area.mjs';

export async function check({ manifests, info }) {
  const bad = [];
  for (const m of manifests) for (const tx of m.texts) {
    if (tx.alpha < 0.05 || tx.allowOutsideSafe) continue;
    if (!inside(tx, info.safe, 1)) bad.push({ frame: m.frame, scene: m.scene, key: tx.text, msg: `outside ${info.format} safe area: box ${tx.x},${tx.y} ${tx.w}×${tx.h} vs safe ${info.safe.x},${info.safe.y} ${info.safe.w}×${info.safe.h}: "${tx.text.slice(0, 40)}"` });
  }
  bad.sort((a, b) => a.key.localeCompare(b.key) || a.frame - b.frame);
  return result('safe-area', runs(bad, info.fps, (s) => s.msg), { framesChecked: manifests.length, safe: info.safe });
}
