// Caption cues from timed words. Rules: break at sentence ends, ≤ 84 chars (2 lines of ~42),
// ≤ 6 s, never across scenes; extend a cue's end toward the next cue (≤ 0.7 s) so reading
// speed stays ≤ 17 chars/s where possible.
export function buildCues(words, scenes = []) {
  const cues = [];
  let cur = null;
  const flush = () => { if (cur) { cues.push(cur); cur = null; } };
  words.forEach((w, i) => {
    if (cur && (cur.scene !== w.scene || (cur.text + ' ' + w.text).length > 84 || w.end - cur.start > 6)) flush();
    if (!cur) cur = { start: w.start, end: w.end, text: w.text, firstWord: i, scene: w.scene };
    else { cur.text += ' ' + w.text; cur.end = w.end; }
    // sentence end: close the cue unless it's very short and the next word follows quickly
    if (/[.!?]$/.test(w.text) && cur.text.length > 24) flush();
    else if (/[,;:]$/.test(w.text) && cur.text.length > 60) flush();
  });
  flush();
  const sceneEnd = new Map();
  let t = 0;
  for (const s of scenes) { t += s.duration ?? 0; sceneEnd.set(s.id, t); }
  // Pass 1: starts. Lead-in of up to 0.1 s before the first word (inside the ±150 ms sync tolerance),
  // never before the previous cue's last spoken word.
  const rawEnd = cues.map((c) => c.end);
  cues.forEach((c, i) => { c.start = Math.max(i ? rawEnd[i - 1] + 0.05 : 0, c.start - 0.1); });
  // Pass 2: ends. Extend toward the next cue (and within the scene) so reading speed stays ≤ ~16.5 cps.
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    const limit = Math.min(i + 1 < cues.length ? cues[i + 1].start - 0.05 : Infinity, sceneEnd.get(c.scene) ?? Infinity);
    const need = c.text.length / 16.5; // seconds needed at 16.5 cps (limit 17)
    c.end = +Math.min(limit, Math.max(rawEnd[i] + 0.3, c.start + need, c.start + 1)).toFixed(3);
    c.start = +c.start.toFixed(3);
  }
  return cues;
}

const ts = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};

export function toSrt(cues) {
  return cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n');
}
