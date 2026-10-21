// Safe areas as fractions of the frame. Configurable; check the sources before relying on them.
//
// 16:9 — EBU R 95 (2008) "graphics safe" = central 90% of width and height (5% margins).
// 9:16 — Meta Reels ad specs as reported 2026-10 (socialync.io, revid.ai): 14% top, 35% bottom,
//        6% sides. Right side widened to 9% for the YouTube Shorts button rail (~96 px of 1080,
//        reap.video). No first-party organic-post spec exists; preview on device before publishing.
export const SAFE = {
  '16:9': { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
  '9:16': { top: 0.14, bottom: 0.35, left: 0.06, right: 0.09 },
};

export const SIZES = { '16:9': { width: 1920, height: 1080 }, '9:16': { width: 1080, height: 1920 } };

export function safeRect(format, width, height) {
  const m = SAFE[format];
  if (!m) throw new Error(`unknown format ${format}`);
  const x = Math.round(width * m.left), y = Math.round(height * m.top);
  return { x, y, w: Math.round(width * (1 - m.right)) - x, h: Math.round(height * (1 - m.bottom)) - y };
}

// Minimum text size: 36 px on a 1080-px short side, scaled for other sizes.
export const minTextPx = (width, height) => Math.round((36 * Math.min(width, height)) / 1080);

export function inside(box, rect, tol = 0.5) {
  return box.x >= rect.x - tol && box.y >= rect.y - tol && box.x + box.w <= rect.x + rect.w + tol && box.y + box.h <= rect.y + rect.h + tol;
}
