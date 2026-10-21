// A cut is a re-sequencing of storyboard scenes (with optional per-scene overrides), e.g. a 9:16 highlights reel.
export function scenesFor(board, cut) {
  if (!cut) return board.scenes;
  const def = board.cuts?.[cut];
  if (!def) throw new Error(`storyboard has no cut "${cut}"`);
  const byId = new Map(board.scenes.map((s) => [s.id, s]));
  return def.scenes.map((c) => {
    const base = byId.get(c.id);
    if (!base) throw new Error(`cut ${cut}: unknown scene ${c.id}`);
    return { ...base, ...c, props: { ...base.props, ...c.props } };
  });
}
export const suffix = (cut) => (cut ? `.${cut}` : '');
