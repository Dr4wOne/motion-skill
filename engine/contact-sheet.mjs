// Contact sheet: one row per scene (start, middle, end), labelled with scene id and time.
// Composed in Chromium so labels use the project fonts; output is a downscaled PNG.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

export async function contactSheet(samples, outFile, { thumbW = 400, title = '' } = {}) {
  const rows = new Map();
  for (const s of samples) {
    const id = s.manifest.scene;
    if (!rows.has(id)) rows.set(id, []);
    rows.get(id).push(s);
  }
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const html = `<!doctype html><html><body style="margin:0;background:#111;color:#ddd;font:14px/1.3 monospace;padding:12px">
  ${title ? `<div style="font-size:16px;margin-bottom:8px">${esc(title)}</div>` : ''}
  ${[...rows].map(([id, ss]) => `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px">
    <div style="width:70px;padding-top:4px">${esc(id)}</div>
    ${ss.map((s) => `<figure style="margin:0"><img style="display:block;width:${thumbW}px" src="data:image/png;base64,${readFileSync(s.file).toString('base64')}">
      <figcaption style="font-size:12px;color:#999">f${s.frame} · t=${s.manifest.t.toFixed(2)}s</figcaption></figure>`).join('')}
  </div>`).join('')}</body></html>`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 90 + 3 * (thumbW + 8) + 24, height: 200 } });
  await page.setContent(html, { waitUntil: 'load' });
  writeFileSync(outFile, await page.screenshot({ fullPage: true, type: 'png' }));
  await browser.close();
  return outFile;
}
