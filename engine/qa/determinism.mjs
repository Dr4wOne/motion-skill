// Same frame rendered in two separate browser sessions → identical pixel hash.
import { result } from './util.mjs';
import { openProject } from '../render.mjs';

export async function framesToTest(info) {
  return info.scenes.flatMap((s) => [s.frameStart + Math.min(s.frames - 1, 15), s.frameStart + (s.frames >> 1), s.frameStart + s.frames - 1]);
}

export async function check({ dir, info, opts = {} }) {
  const frames = await framesToTest(info);
  const hashes = [];
  for (let session = 0; session < 2; session++) {
    const p = await openProject(dir, { ...opts, workers: 1 });
    const page = p.pages[0];
    const h = [];
    // Second session walks the frames in reverse to catch hidden state carried between frames.
    for (const f of session ? [...frames].reverse() : frames) {
      await page.evaluate((f) => window.render(f), f);
      h.push([f, await page.evaluate(() => window.pixelHash())]);
    }
    hashes.push(new Map(h));
    await p.close();
  }
  const fails = frames.filter((f) => hashes[0].get(f) !== hashes[1].get(f)).map((f) => ({ frame: f, msg: `pixel hash differs between sessions at frame ${f}` }));
  return result('determinism', fails, { framesCompared: frames.length });
}
