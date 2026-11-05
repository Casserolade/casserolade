/** CSS color-mix(in srgb, a weight, b): `#rrggbb` colors only, `weight` the share of `a`, from 0 to 1. */
export function mixColor(a: string, b: string, weight: number): string {
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ca, cb] = [channels(a), channels(b)];
  return `#${ca.map((value, i) => Math.round(value * weight + cb[i] * (1 - weight)).toString(16).padStart(2, '0')).join('')}`;
}
