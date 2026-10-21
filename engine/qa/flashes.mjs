// General flash threshold (WCAG 2.3.1 approximation): a flash = a pair of opposing luminance
// changes of ≥ 10% of full scale; no more than 3 flashes in any 1-second window.
import { result, skip } from './util.mjs';

export async function check({ stats, info }) {
  if (!stats) return skip('flashes', 'no encoded video yet');
  const y = stats.map((f) => f.YAVG / 255);
  const changes = [];
  let ref = y[0], dir = 0;
  for (let i = 1; i < y.length; i++) {
    const d = y[i] - ref;
    if (Math.abs(d) >= 0.1) {
      const nd = Math.sign(d);
      if (nd !== dir) changes.push(i);
      dir = nd;
      ref = y[i];
    } else if (Math.sign(y[i] - y[i - 1]) !== dir && dir !== 0) ref = y[i];
  }
  let maxPerSec = 0, worstAt = 0;
  for (let i = 0; i < changes.length; i++) {
    let j = i;
    while (j < changes.length && changes[j] - changes[i] < info.fps) j++;
    const flashes = Math.floor((j - i) / 2);
    if (flashes > maxPerSec) { maxPerSec = flashes; worstAt = changes[i]; }
  }
  const fails = maxPerSec > 3 ? [{ frame: worstAt, t: +(worstAt / info.fps).toFixed(2), msg: `${maxPerSec} flashes within 1 s` }] : [];
  return result('flashes', fails, { maxFlashesPerSecond: maxPerSec, luminanceChanges: changes.length });
}
