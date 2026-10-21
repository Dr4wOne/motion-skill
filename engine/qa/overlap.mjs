// Text must not overlap other text, and must not straddle a box edge (fully inside or fully outside).
// Every frame, from the manifest (texts + shapes). Captions count as text.
import { result, runs } from './util.mjs';

const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const inside = (a, b, tol = 2) => a.x >= b.x - tol && a.y >= b.y - tol && a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol;

export async function check({ manifests, info }) {
  const bad = [];
  for (const m of manifests) {
    const texts = m.texts.filter((t) => t.alpha > 0.05 && t.w > 0 && t.h > 0 && !t.allowOverlap);
    for (let i = 0; i < texts.length; i++) {
      const a = texts[i];
      for (let j = i + 1; j < texts.length; j++) {
        const b = texts[j];
        const ov = inter(a, b);
        if (ov > 0.04 * Math.min(a.w * a.h, b.w * b.h)) bad.push({ frame: m.frame, scene: m.scene, key: `tt:${a.text}|${b.text}`, msg: `text overlaps text: "${a.text.slice(0, 30)}" × "${b.text.slice(0, 30)}"` });
      }
      for (const s of m.shapes || []) {
        const ov = inter(a, s);
        if (ov > 0.02 * a.w * a.h && !inside(a, s)) bad.push({ frame: m.frame, scene: m.scene, key: `ts:${a.text}|${s.x},${s.y}`, msg: `text straddles a box edge: "${a.text.slice(0, 40)}" vs box ${s.x},${s.y} ${s.w}×${s.h}` });
      }
    }
  }
  bad.sort((a, b) => a.key.localeCompare(b.key) || a.frame - b.frame);
  // Keep-out (end-screen slots) and wordmark clear space.
  for (const m of manifests) {
    const texts = m.texts.filter((t) => t.alpha > 0.05);
    for (const ko of m.keepout || []) for (const t of texts) if (inter(t, ko) > 0) bad.push({ frame: m.frame, scene: m.scene, key: `ko:${t.text}`, msg: `text inside a reserved end-screen region: "${t.text.slice(0, 30)}"` });
    for (const mk of m.marks || []) {
      const zone = { x: mk.x - mk.clear, y: mk.y - mk.clear, w: mk.w + 2 * mk.clear, h: mk.h + 2 * mk.clear };
      for (const t of texts) if (!inside(t, mk, 2) && inter(t, zone) > 0) bad.push({ frame: m.frame, scene: m.scene, key: `cs:${t.text}`, msg: `text inside the wordmark clear space: "${t.text.slice(0, 30)}"` });
    }
  }
  bad.sort((a, b) => a.key.localeCompare(b.key) || a.frame - b.frame);
  return result('overlap', runs(bad, info.fps, (s) => s.msg), { framesChecked: manifests.length });
}
