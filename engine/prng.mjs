// Seeded PRNG (mulberry32). The only source of randomness allowed in render(t).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a: stable 32-bit seed from a string (e.g. a scene id).
export function seedFrom(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

// Stateless value for (seed, index): same inputs → same number, in any call order.
export function hashRandom(seed, index) {
  return mulberry32((seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0)();
}
