// Minimal Standard MIDI File reader (format 0/1): note events → seconds via the tempo map.
export function parseMidi(buf) {
  let p = 0;
  const u32 = () => (buf[p++] << 24 | buf[p++] << 16 | buf[p++] << 8 | buf[p++]) >>> 0;
  const u16 = () => (buf[p++] << 8) | buf[p++];
  const vlq = () => { let v = 0, b; do { b = buf[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
  if (String.fromCharCode(...buf.subarray(0, 4)) !== 'MThd') throw new Error('not a MIDI file');
  p = 8; u16(); const ntrk = u16(), div = u16();
  if (div & 0x8000) throw new Error('SMPTE time division not supported');
  const events = [];
  for (let tr = 0; tr < ntrk; tr++) {
    while (String.fromCharCode(...buf.subarray(p, p + 4)) !== 'MTrk') p++;
    p += 4;
    const len = u32();
    const end = p + len;
    let tick = 0, status = 0;
    while (p < end) {
      tick += vlq();
      let b = buf[p];
      if (b & 0x80) { status = b; p++; } // running status otherwise
      const type = status & 0xf0, ch = status & 0x0f;
      if (status === 0xff) { const meta = buf[p++]; const len = vlq(); if (meta === 0x51) events.push({ tick, tempo: (buf[p] << 16) | (buf[p + 1] << 8) | buf[p + 2] }); p += len; }
      else if (status === 0xf0 || status === 0xf7) { p += vlq(); }
      else if (type === 0x90 || type === 0x80) { const note = buf[p++], vel = buf[p++]; events.push({ tick, on: type === 0x90 && vel > 0, note, vel, ch, tr }); }
      else if (type === 0xc0 || type === 0xd0) p += 1;
      else p += 2;
    }
    p = end;
  }
  events.sort((a, b) => a.tick - b.tick || (a.tempo ? -1 : 0));
  // tick → seconds
  let tempo = 500000, lastTick = 0, sec = 0;
  const open = new Map(), notes = [];
  for (const e of events) {
    sec += ((e.tick - lastTick) / div) * (tempo / 1e6);
    lastTick = e.tick;
    if (e.tempo) { tempo = e.tempo; continue; }
    const key = `${e.tr}:${e.ch}:${e.note}`;
    if (e.on) open.set(key, { t: sec, midi: e.note, vel: e.vel / 127 });
    else if (open.has(key)) { const n = open.get(key); open.delete(key); notes.push({ ...n, dur: Math.max(0.05, sec - n.t) }); }
  }
  return notes.sort((a, b) => a.t - b.t);
}
