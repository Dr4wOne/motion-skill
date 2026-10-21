// Deterministic additive "soft piano / bell" synth + Schroeder reverb. Pure JS, no samples.
// notes: [{ t (s), dur (s), midi, vel (0..1) }] → { L, R } Float32Array at SR.
export const SR = 48000;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

export function renderNotes(notes, { seconds, timbre = 'piano', gain = 0.25, reverb = 0.22 } = {}) {
  const len = Math.ceil((seconds ?? Math.max(...notes.map((n) => n.t + n.dur)) + 2.5) * SR);
  const L = new Float32Array(len), R = new Float32Array(len);
  const partials = timbre === 'bell' ? [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]] : [[1, 1], [2, 0.42], [3, 0.2], [4, 0.1], [5.02, 0.05]];
  for (const n of notes) {
    const f = hz(n.midi), i0 = Math.round(n.t * SR);
    const decay = timbre === 'bell' ? 2.2 : 1.1 + 600 / f; // lower notes ring longer
    const rel = Math.min(n.dur, 4) + 0.6;
    const pan = Math.max(-0.6, Math.min(0.6, (n.midi - 64) / 40));
    const total = Math.round((rel + decay) * SR);
    for (let i = 0; i < total && i0 + i < len; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 0.006) * Math.exp(-t / decay) * (t > n.dur ? Math.exp(-(t - n.dur) / 0.25) : 1);
      if (env < 1e-4 && t > 0.05) break;
      let s = 0;
      for (const [m, a] of partials) s += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t * (m - 1) * 1.2);
      s *= env * (n.vel ?? 0.7) * gain;
      L[i0 + i] += s * (1 - pan);
      R[i0 + i] += s * (1 + pan);
    }
  }
  return reverb ? schroeder(L, R, reverb) : { L, R };
}

// Schroeder reverb: 4 parallel combs + 2 series allpasses per channel (deterministic, fixed delays).
function schroeder(L, R, mix) {
  const process = (x, offset) => {
    const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: d + offset, buf: new Float32Array(d + offset), i: 0, fb: 0.78 }));
    const aps = [225, 556].map((d) => ({ d: d + offset, buf: new Float32Array(d + offset), i: 0 }));
    const y = new Float32Array(x.length);
    for (let n = 0; n < x.length; n++) {
      let s = 0;
      for (const c of combs) { const o = c.buf[c.i]; c.buf[c.i] = x[n] + o * c.fb; c.i = (c.i + 1) % c.d; s += o; }
      s /= combs.length;
      for (const a of aps) { const o = a.buf[a.i]; const v = s + o * 0.5; a.buf[a.i] = v; a.i = (a.i + 1) % a.d; s = o - v * 0.5; }
      y[n] = x[n] * (1 - mix) + s * mix;
    }
    return y;
  };
  return { L: process(L, 0), R: process(R, 23) };
}

export function fade({ L, R }, inS = 0.01, outS = 0.5) {
  const n = L.length, fi = Math.round(inS * SR), fo = Math.round(outS * SR);
  for (let i = 0; i < n; i++) {
    const g = Math.min(1, i / Math.max(1, fi), (n - i) / Math.max(1, fo));
    L[i] *= g; R[i] *= g;
  }
  return { L, R };
}
