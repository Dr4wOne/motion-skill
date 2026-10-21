// Every audio file under assets/music and assets/sfx must have a complete PROVENANCE.md block with a matching
// sha256. Exit/fail on any missing file entry, missing field, hash mismatch or self-review.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { result } from './util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FIELDS = ['file', 'sha256', 'use', 'composition', 'composer', 'score source', 'route', 'performer/synth', 'recording source', 'excerpt', 'modifications', 'attribution', 'author', 'reviewer'];
const AUDIO = /\.(wav|mp3|flac|ogg|m4a|aac|mid|midi)$/i;

export function parseProvenance(md) {
  const blocks = [];
  let cur = null;
  for (const line of md.split('\n')) {
    if (/^##\s+/.test(line)) { cur = { _title: line.replace(/^##\s+/, '').trim() }; blocks.push(cur); continue; }
    const m = line.match(/^-\s*([a-z0-9 /]+?):\s*(.*)$/i);
    if (cur && m) cur[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return blocks;
}

export async function check({ root = ROOT } = {}) {
  const fails = [];
  const provFile = path.join(root, 'assets/music/PROVENANCE.md');
  const blocks = existsSync(provFile) ? parseProvenance(readFileSync(provFile, 'utf8')) : [];
  const files = ['assets/music', 'assets/sfx'].flatMap((d) => (existsSync(path.join(root, d)) ? readdirSync(path.join(root, d), { recursive: true }).filter((f) => AUDIO.test(f)).map((f) => path.join(d, f)) : []));
  for (const f of files) if (!blocks.some((b) => b.file === f)) fails.push({ msg: `${f}: no PROVENANCE.md entry` });
  for (const b of blocks) {
    for (const k of FIELDS) if (!b[k]) fails.push({ msg: `${b._title}: missing field "${k}"` });
    if (b.file && !existsSync(path.join(root, b.file))) fails.push({ msg: `${b.file}: listed but not found` });
    else if (b.file && b.sha256) {
      const h = createHash('sha256').update(readFileSync(path.join(root, b.file))).digest('hex');
      if (h !== b.sha256) fails.push({ msg: `${b.file}: sha256 mismatch` });
    }
    if (b['score source'] && !(/https?:\/\//.test(b['score source']) && /\d{4}-\d{2}-\d{2}/.test(b['score source']))) fails.push({ msg: `${b._title}: score source needs a URL and a YYYY-MM-DD check date` });
    if (b.route && b.route !== '1' && !(/https?:\/\//.test(b['recording source'] || '') && /\d{4}-\d{2}-\d{2}/.test(b['recording source'] || ''))) fails.push({ msg: `${b._title}: route ${b.route} needs a recording source URL and date` });
    if (b.author && b.reviewer && b.author.toLowerCase() === b.reviewer.toLowerCase()) fails.push({ msg: `${b._title}: reviewer is the author` });
    if (/^(pending|todo|tbd|-)$/i.test(b.reviewer || '')) fails.push({ msg: `${b._title}: not reviewed yet (reviewer: ${b.reviewer})` });
  }
  return result('music-provenance', fails, { audioFiles: files.length, entries: blocks.length });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await check();
  for (const f of r.failures) console.log(`✗ ${f.msg}`);
  console.log(r.pass ? `✓ music provenance complete (${r.metrics.audioFiles} files, ${r.metrics.entries} entries)` : `music provenance FAILED (${r.failureCount})`);
  process.exit(r.pass ? 0 : 1);
}
