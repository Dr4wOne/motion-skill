// Outro links must match brand/links.json (status "confirmed") exactly: every confirmed link drawn, no extra
// URL/handle-like text, no typos. Reads the text actually drawn (frame manifests) in each outro's final second.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { result, skip } from './util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const display = (url) => url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
const looksLikeLink = (s) => /(^@[\w.]+$)|([a-z0-9-]+\.(io|com|dev|org|net|me|app|co|tv|gg)(\/\S*)?)/i.test(s);

export async function check({ manifests, info, root = ROOT, outroScenes }) {
  const linksFile = path.join(root, 'brand/links.json');
  if (!existsSync(linksFile)) return skip('links-match', 'no brand/links.json');
  const confirmed = JSON.parse(readFileSync(linksFile, 'utf8')).filter((l) => l.status === 'confirmed' && l.outro).map((l) => l.display || display(l.url));
  const outros = outroScenes ?? [...new Set(manifests.filter((m) => /outro/.test(m.scene) || m.block === 'outro').map((m) => m.scene))];
  if (!outros.length) return skip('links-match', 'no outro scenes in this render');
  const fails = [];
  for (const id of outros) {
    const frames = manifests.filter((m) => m.scene === id);
    const last = frames.slice(-info.fps); // final second: everything revealed
    const drawn = new Set(last.flatMap((m) => m.texts.filter((t) => t.alpha > 0.5).flatMap((t) => t.text.split(/\s+|·|\|/).map((x) => x.trim()).filter(Boolean))));
    const drawnText = last.flatMap((m) => m.texts.filter((t) => t.alpha > 0.5).map((t) => t.text)).join('\n');
    for (const c of confirmed) if (!drawnText.includes(c)) fails.push({ scene: id, msg: `confirmed link missing from final frame: ${c}` });
    for (const tok of drawn) if (looksLikeLink(tok) && !confirmed.some((c) => c === tok || c.startsWith(tok) && tok.includes('/'))) fails.push({ scene: id, msg: `unconfirmed or misspelled link drawn: ${tok}` });
  }
  return result('links-match', [...new Map(fails.map((f) => [f.msg + f.scene, f])).values()], { confirmed: confirmed.length, outros: outros.length });
}
