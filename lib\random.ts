export function seededRandom(seed: number) {
  let state = Math.trunc(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(rand: () => number, min: number, max: number) {
  return min + (max - min) * rand();
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
