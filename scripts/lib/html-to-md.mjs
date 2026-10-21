// Article HTML → article.md + anchors.json + figures/web-*.svg (+ WEB-INDEX.md).
// Usage: node scripts/lib/html-to-md.mjs <article.html> <outdir(source)>
// Dependency-free DOM-lite parser.
import fs from 'node:fs';
import path from 'node:path';
const [, , inFile, outDir] = process.argv;
const html = fs.readFileSync(inFile, 'utf8');
const pick = (tag) => { const a = html.indexOf(`<${tag}`), b = html.lastIndexOf(`</${tag}>`); return a >= 0 && b > a ? html.slice(a, b + tag.length + 3) : null; };
const art = pick('article') ?? pick('main') ?? pick('body') ?? html;

// ---- DOM-lite parser ----
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'wbr']);
function parse(s) {
  const root = { tag: '#root', attrs: {}, children: [], raw: '' };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(s))) {
    const top = stack[stack.length - 1];
    if (m[0].startsWith('<!--')) continue;
    if (m[1]) {
      const t = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === t) {
        stack[i].end = m.index + m[0].length; stack.length = i; break;
      }
    } else if (m[2]) {
      const t = m[2].toLowerCase(); const attrs = {};
      for (const a of m[3].matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[a[1]] = a[2] ?? a[3] ?? a[4] ?? '';
      const node = { tag: t, attrs, children: [], start: m.index };
      top.children.push(node);
      if (!VOID.has(t) && !m[4]) stack.push(node);
    } else if (m[5] !== undefined) top.children.push({ tag: '#text', text: m[5] });
    else if (m[0] === '<') top.children.push({ tag: '#text', text: '<' });
  }
  return root;
}
const ent = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const dec = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ent[e] ?? `&${e};`));
const text = n => n.tag === '#text' ? dec(n.text) : n.children.map(text).join('');
const cls = n => (n.attrs?.class || '').split(/\s+/);
const find = (n, pred, out = []) => { if (n.tag !== '#text') { if (pred(n)) out.push(n); n.children.forEach(c => find(c, pred, out)); } return out; };

const root = parse(art);

// ---- SVG extraction ----
const figDir = path.join(outDir, 'figures');
fs.mkdirSync(figDir, { recursive: true });
const svgs = find(root, n => n.tag === 'svg');
const svgFile = new Map();
const index = [];
let lastHeading = '(before first heading)';
// walk in document order to track headings
(function walk(n) {
  if (n.tag === '#text') return;
  if (/^h[23]$/.test(n.tag) && n.attrs.id) lastHeading = n.attrs.id;
  if (n.tag === 'svg') {
    const i = svgFile.size + 1;
    const ids = (n.attrs['aria-labelledby'] || '').split(/\s+/);
    const tEl = find(n, x => x.tag === 'title')[0];
    const dEl = find(n, x => x.tag === 'desc')[0];
    const title = tEl ? text(tEl).trim() : (n.attrs['aria-label'] || '');
    const desc = dEl ? text(dEl).trim() : '';
    const slugSrc = ids[0] ? ids[0].replace(/^f-/, '').replace(/-t$/, '') : title;
    const slug = slugSrc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const file = `web-${String(i).padStart(2, '0')}-${slug}.svg`;
    let raw = art.slice(n.start, n.end);
    if (!/xmlns=/.test(raw)) raw = raw.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    fs.writeFileSync(path.join(figDir, file), raw + '\n');
    svgFile.set(n, file);
    index.push({ file, title, desc, heading: lastHeading });
    return;
  }
  n.children.forEach(walk);
})(root);
// captions
for (const fig of find(root, n => n.tag === 'figure')) {
  const s = find(fig, n => n.tag === 'svg')[0]; const cap = find(fig, n => n.tag === 'figcaption')[0];
  if (s && cap) { const e = index.find(x => x.file === svgFile.get(s)); e.caption = text(cap).replace(/^Figure\s*/, '').trim(); }
}
const esc = s => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
fs.writeFileSync(path.join(figDir, 'WEB-INDEX.md'),
  `# Web figures (inline SVG extracted from article.html)\n\n| File | aria title | aria desc | Caption | Nearest preceding heading |\n|---|---|---|---|---|\n` +
  index.map(e => `| ${e.file} | ${esc(e.title)} | ${esc(e.desc)} | ${esc(e.caption || '')} | #${e.heading} |`).join('\n') + '\n');

// ---- Markdown rendering ----
const inline = n => {
  if (n.tag === '#text') return dec(n.text).replace(/\s+/g, ' ');
  const inner = () => n.children.map(inline).join('');
  switch (n.tag) {
    case 'strong': case 'b': { const t = inner(); return t.trim() ? `**${t.trim()}**${/\s$/.test(t) ? ' ' : ''}` : t; }
    case 'em': case 'i': { const t = inner(); return t.trim() ? `*${t.trim()}*${/\s$/.test(t) ? ' ' : ''}` : t; }
    case 'code': { const t = text(n); if (cls(n).includes('agent-code')) return ' `' + t.replace(/\n\s*/g, ' / ') + '`'; return '`' + t + '`'; }
    case 'a': {
      if (cls(n).includes('anchor')) return '';
      if (cls(n).includes('data-footnote-backref')) return '';
      if (n.attrs['data-footnote-ref'] !== undefined || /^#user-content-fn/.test(n.attrs.href || '')) return `[^${text(n).trim()}]`;
      return `[${inner().trim()}](${n.attrs.href})`;
    }
    case 'sup': { const t = inner(); return t.startsWith('[^') ? t : `^${t}`; }
    case 'br': return '  \n';
    case 'button': case 'svg': case 'input': return '';
    case 'span': if (cls(n).includes('agent-label')) return `**${inner().trim()}:** `; return inner();
    default: return inner();
  }
};
const block = (n, depth = 0) => {
  if (n.tag === '#text') { const t = dec(n.text).trim(); return t ? t + '\n\n' : ''; }
  const kids = () => n.children.map(c => block(c, depth)).join('');
  const c = cls(n);
  switch (n.tag) {
    case 'h1': return `# ${inline(n).trim()}\n\n`;
    case 'h2': case 'h3': case 'h4': {
      const lvl = '#'.repeat(+n.tag[1]); const id = n.attrs.id ? ` {#${n.attrs.id}}` : '';
      return `${lvl} ${inline(n).trim()}${id}\n\n`;
    }
    case 'p': { const t = inline(n).trim(); if (!t) return ''; return (c.includes('aside-title') || c.includes('widget-title') ? '**' + t + '**' : t) + '\n\n'; }
    case 'nav': return '';
    case 'button': case 'input': return '';
    case 'ul': case 'ol': {
      let i = 0; const ind = '  '.repeat(depth);
      return n.children.filter(x => x.tag === 'li').map(li => {
        i++; const mark = n.tag === 'ol' ? `${i}.` : '-';
        const inl = li.children.filter(x => !['ul', 'ol', 'p', 'pre', 'blockquote'].includes(x.tag)).map(inline).join('').trim();
        const ps = li.children.filter(x => x.tag === 'p').map(p => inline(p).trim());
        const nested = li.children.filter(x => ['ul', 'ol'].includes(x.tag)).map(x => block(x, depth + 1)).join('');
        const body = [inl, ...ps].filter(Boolean).join(' ');
        return `${ind}${mark} ${body}\n${nested ? nested.replace(/\n\n$/, '\n') : ''}`;
      }).join('') + (depth === 0 ? '\n' : '');
    }
    case 'blockquote': return kids().trim().split('\n').map(l => l ? `> ${l}` : '>').join('\n') + '\n\n';
    case 'aside': return kids().trim().split('\n').map(l => l ? `> ${l}` : '>').join('\n') + '\n\n';
    case 'figure': {
      const s = find(n, x => x.tag === 'svg')[0]; const cap = find(n, x => x.tag === 'figcaption')[0];
      const e = s ? index.find(x => x.file === svgFile.get(s)) : null;
      let out = '';
      if (e) out += `![${e.title}${e.desc ? ' — ' + e.desc : ''}](figures/${e.file})\n\n`;
      for (const img of find(n, x => x.tag === 'img')) out += `![${img.attrs.alt || ''}](${img.attrs.src})\n\n`;
      if (cap) out += `*Figure: ${inline(cap).replace(/^\s*Figure\s*/, '').trim()}*\n\n`;
      return out;
    }
    case 'pre': return '```' + (n.attrs['data-language'] || '') + '\n' + text(n).replace(/\n$/, '') + '\n```\n\n';
    case 'table': {
      const cap = find(n, x => x.tag === 'caption')[0];
      const rows = find(n, x => x.tag === 'tr').map(tr => tr.children.filter(x => x.tag === 'td' || x.tag === 'th').map(td => esc(inline(td).trim())));
      if (!rows.length) return '';
      let out = cap ? `*Table: ${inline(cap).trim()}*\n\n` : '';
      out += `| ${rows[0].join(' | ')} |\n|${rows[0].map(() => '---').join('|')}|\n`;
      out += rows.slice(1).map(r => `| ${r.join(' | ')} |`).join('\n') + '\n\n';
      return out;
    }
    case 'textarea': return '```\n' + text(n).trim() + '\n```\n\n';
    case 'label': case 'output': { const t = inline(n).trim(); return t ? t + '\n\n' : ''; }
    case 'section': {
      if (c.includes('widget')) {
        const body = kids().trim();
        return `> **[Interactive widget]**\n>\n` + body.split('\n').map(l => l ? `> ${l}` : '>').join('\n') + '\n\n';
      }
      return kids();
    }
    case 'li': return inline(n).trim() + '\n';
    case 'footer': {
      const next = find(n, x => x.tag === 'li' && cls(x).includes('next'))[0];
      const tags = find(n, x => cls(x).includes('tags'))[0];
      let out = '---\n\n';
      if (tags) out += `Tags: ${find(tags, x => x.tag === 'a').map(a => text(a)).join(', ')}\n\n`;
      if (next) { const a = find(next, x => x.tag === 'a')[0]; out += `Next issue: [${text(a).replace(/^Next issue/, '').trim()}](${a.attrs.href})\n\n`; }
      return out;
    }
    case 'span': case 'a': case 'strong': case 'em': case 'code': case 'sup': { const t = inline(n).trim(); return t ? t + '\n\n' : ''; }
    default: return kids();
  }
};
let md = block(root);
// footnote definitions: convert ol inside footnotes section into [^n]: text
md = md.replace(/(## Footnotes \{#footnote-label\}\n\n)([\s\S]*?)(\n---|\s*$)/, (all, h, body, tail) =>
  h + body.split('\n').map(l => l.replace(/^(\d+)\. (.*?)\s*↩?$/, '[^$1]: $2')).join('\n') + tail);
md = md.replace(/[ \t]+\n/g, m => m.endsWith('  \n') ? m : '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
fs.writeFileSync(path.join(outDir, 'article.md'), md);

// anchors
const anchors = {};
for (const h of find(root, n => /^h[23]$/.test(n.tag) && n.attrs.id)) anchors[h.attrs.id] = inline(h).trim();
fs.writeFileSync(path.join(outDir, 'anchors.json'), JSON.stringify(anchors, null, 2) + '\n');

// word count (body: everything before footnotes)
const body = md.split('## Footnotes')[0];
const words = body.replace(/\]\([^)]*\)/g, ']').replace(/[#*>`|\[\]^-]/g, ' ').split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length;
console.log(JSON.stringify({ words, totalWords: md.split(/\s+/).filter(Boolean).length, anchors: Object.keys(anchors).length, svgs: index.length }));
