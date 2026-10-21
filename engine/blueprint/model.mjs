// Shared Blueprint model: block order, word counting, scene timing, term matching.
// Canonical order (skills/motion-skill/references/blueprint.md). cold-open and sting may be disabled per project.
export const ORDER = ['cold-open', 'sting', 'intro', 'overview', 'roadmap', 'topic', 'full-picture', 'takeaways', 'outro'];
export const PREVIEW_BLOCKS = new Set(['cold-open', 'intro', 'overview', 'roadmap']); // may name terms ahead of definition
export const words = (s) => String(s || '').replace(/\{\{|\}\}/g, '').split(/\s+/).filter(Boolean).length;

export function timed(board) {
  let t = 0;
  return board.scenes.map((s) => { const r = { ...s, start: t, end: t + (s.duration || 0) }; t += s.duration || 0; return r; });
}

// Term match: whole word, case-insensitive, optional plural "s"; multi-word terms allowed.
export function termRegex(term) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}(s|es)?(?=$|[^\\p{L}\\p{N}])`, 'iu');
}

export const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
