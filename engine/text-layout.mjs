// Text measuring, wrapping and fitting. Single source of truth for overflow:
// the renderer draws exactly what fitText() returns and records it in the frame manifest.
//
// `measure(str)` returns the width of `str` at REF_PX for the current font. Width is linear
// in font size (canvas measureText, no hinting), so one measurement serves every size.
export const REF_PX = 100;

const widthAt = (measure, str, px) => (measure(str) * px) / REF_PX;

// Greedy wrap of one paragraph at `maxW` px. A word longer than the line gets its own line.
export function wrapGreedy(words, maxW, measure, px) {
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (!cur || widthAt(measure, next, px) <= maxW) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Balanced wrap: same line count as greedy, but the narrowest width that keeps it.
// Evens out line lengths and avoids single-word last lines (orphans).
export function wrapBalanced(text, maxW, measure, px) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    const greedy = wrapGreedy(words, maxW, measure, px);
    if (greedy.length === 1) { out.push(greedy[0]); continue; }
    let lo = 0, hi = maxW;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (wrapGreedy(words, mid, measure, px).length <= greedy.length) hi = mid; else lo = mid;
    }
    const best = wrapGreedy(words, hi, measure, px);
    // A single word alone on the last line: pull the previous line's last word down if it still fits.
    const n = best.length;
    if (n > 1 && !/\s/.test(best[n - 1])) {
      const prev = best[n - 2].split(' ');
      const moved = `${prev[prev.length - 1]} ${best[n - 1]}`;
      if (prev.length > 1 && widthAt(measure, moved, px) <= maxW) { best[n - 2] = prev.slice(0, -1).join(' '); best[n - 1] = moved; }
    }
    out.push(...best);
  }
  return out;
}

// Largest size in [minPx, maxPx] (step 2 px) at which `text` fits the box.
// Returns fits:false at minPx when nothing fits; QA flags that frame.
export function fitText(text, { maxWidth, maxHeight, maxPx, minPx, lineHeight = 1.2, measure, balance = true }) {
  let best = null, firstFit = null;
  for (let px = maxPx; px >= minPx; px -= 2) {
    best = layoutAt(text, px, { maxWidth, lineHeight, measure, balance });
    if (best.width <= maxWidth + 0.5 && best.height <= maxHeight + 0.5) {
      if (!best.orphan) return { ...best, fits: true };
      firstFit = firstFit ?? best; // fits but leaves an orphan: try a smaller size first
    }
  }
  if (firstFit) return { ...firstFit, fits: true };
  best = best ?? layoutAt(text, minPx, { maxWidth, lineHeight, measure, balance });
  return { ...best, fits: best.width <= maxWidth + 0.5 && best.height <= maxHeight + 0.5 };
}

export function layoutAt(text, px, { maxWidth, lineHeight = 1.2, measure, balance = true }) {
  const strs = balance ? wrapBalanced(text, maxWidth, measure, px) : String(text).split('\n').flatMap((p) => wrapGreedy(p.split(/\s+/).filter(Boolean), maxWidth, measure, px));
  const lines = strs.map((s) => ({ text: s, width: widthAt(measure, s, px) }));
  const width = Math.max(0, ...lines.map((l) => l.width));
  const lh = px * lineHeight;
  const last = lines[lines.length - 1]?.text ?? '';
  return {
    px, lineHeight: lh, lines, width, height: lines.length * lh,
    // Orphan: a lone last word under a line of several words (a stacked "Two / words" label is fine).
    orphan: lines.length > 1 && !/\s/.test(last.trim()) && last.trim().length > 0 && /\s/.test(lines[lines.length - 2].text.trim()),
  };
}
