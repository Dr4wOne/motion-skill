// Persistent "you are here" tracker for topic scenes: "2/5 · Meaning" + one bar per topic, drawn in the
// reserved kicker line at the top right of the content area (never over content; QA checks overlap).
export function drawTracker(api, roadmap, topicId) {
  const topics = roadmap?.topics || [];
  const i = topics.findIndex((t) => t.id === topicId);
  if (i < 0) return;
  const { safe, k } = api;
  const barW = 34 * k, barH = 6 * k, gap = 8 * k;
  const barsW = topics.length * barW + (topics.length - 1) * gap;
  const label = `${i + 1}/${topics.length} · ${topics[i].title}`;
  const lay = api.layoutText(label, { x: 0, y: 0, w: safe.w / 2, role: 'small', fixed: true });
  const x1 = safe.x + safe.w;
  const y = safe.y;
  const tx = x1 - barsW - api.s(2) - lay.width;
  api.text(label, { x: tx, y, w: lay.width + 2, role: 'small', color: 'muted', fixed: true });
  const by = y + lay.height / 2 - barH / 2;
  topics.forEach((_, j) => {
    api.box({ x: x1 - barsW + j * (barW + gap), y: by, w: barW, h: barH, radius: barH / 2, fill: j < i ? 'ink' : j === i ? 'accent' : 'line', decor: true });
  });
  api.manifest.texts[api.manifest.texts.length - 1].role = 'tracker';
}
