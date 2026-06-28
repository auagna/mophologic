export type RandomFn = () => number;

export function createSeededRandom(seed: number): RandomFn {
  let state = seed >>> 0;
  if (state === 0) state = 0x6d2b79f5;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomBetween(random: RandomFn, min: number, max: number) {
  return min + (max - min) * random();
}
