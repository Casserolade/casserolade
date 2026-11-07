/**
 * Smooth noise in [-1, 1] along `t`: random values at whole numbers, eased in between. `channel` gives another, unrelated
 * curve (one for x, one for y, one for the tilt). The same arguments always give the same value.
 */
export function smoothNoise(t: number, channel: number): number {
  const index = Math.floor(t);
  const fraction = t - index;
  const eased = fraction * fraction * (3 - 2 * fraction);
  const [from, to] = [index, index + 1].map((lattice) => {
    const hashed = Math.sin(lattice * 127.1 + channel * 311.7) * 43758.5453;
    return (hashed - Math.floor(hashed)) * 2 - 1;
  });
  return from + (to - from) * eased;
}
