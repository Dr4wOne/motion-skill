// Scene registry: storyboard scenes → absolute times; global t → (scene, local t).
// Scenes are self-contained (they fade from/to the background), so a scene's frames
// never depend on its neighbours. That keeps the per-scene render cache valid.
export function buildTimeline(scenes, fps) {
  let start = 0;
  const out = scenes.map((s, index) => {
    if (!(s.duration > 0)) throw new Error(`scene ${s.id}: duration must be > 0`);
    const frames = Math.round(s.duration * fps);
    const entry = { ...s, index, start, frameStart: Math.round(start * fps), frames, duration: frames / fps };
    start += entry.duration;
    return entry;
  });
  const ids = new Set();
  for (const s of out) { if (ids.has(s.id)) throw new Error(`duplicate scene id ${s.id}`); ids.add(s.id); }
  return { scenes: out, fps, duration: start, frames: out.reduce((n, s) => n + s.frames, 0) };
}

// Global frame number → { scene, frameInScene, localT }.
export function locateFrame(tl, frame) {
  let lo = 0, hi = tl.scenes.length - 1;
  if (frame < 0 || frame >= tl.frames) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (tl.scenes[mid].frameStart <= frame) lo = mid; else hi = mid - 1;
  }
  const scene = tl.scenes[lo];
  const frameInScene = frame - scene.frameStart;
  return { scene, frameInScene, localT: frameInScene / tl.fps };
}

export function locateTime(tl, t) {
  return locateFrame(tl, Math.min(tl.frames - 1, Math.max(0, Math.floor(t * tl.fps + 1e-9))));
}
