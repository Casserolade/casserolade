/**
 * A number in [0, 1) that only depends on its two inputs: a note humanized this way plays the same at each turn of
 * a loop, and the loop joins without a seam. `salt` draws another number for the same seed.
 */
export function seededRandom(seed: number, salt = 0): number {
  let value = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((salt | 0) + 0x632be5ab, 0xc2b2ae35);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}
