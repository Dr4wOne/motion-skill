// Parse script.md: "## <id> <title>" scene headings, "> on-screen:" / "> visual:" notes,
// one sentence per line ending in "[#anchor]".
export function parseScript(md) {
  const scenes = [];
  let cur = null;
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    const h = line.match(/^##\s+(\S+)\s*(.*)$/);
    if (h) { cur = { id: h[1], title: h[2].replace(/^[—–-]\s*/, ''), onscreen: '', visual: '', sentences: [] }; scenes.push(cur); continue; }
    if (!cur || !line || line.startsWith('<!--') || line.startsWith('#')) continue;
    const note = line.match(/^>\s*(on-screen|visual):\s*(.*)$/);
    if (note) { cur[note[1] === 'on-screen' ? 'onscreen' : 'visual'] = note[2]; continue; }
    if (line.startsWith('>')) continue;
    const m = line.match(/^(.*?)\s*\[#([^\]]+)\]\s*$/);
    if (!m) throw new Error(`script line without [#anchor]: "${line.slice(0, 60)}"`);
    cur.sentences.push({ text: m[1], anchor: m[2] });
  }
  return { scenes, words: scenes.flatMap((s) => s.sentences).reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0) };
}
