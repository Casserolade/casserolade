/**
 * A scale that pops in like a cartoon number: from 0 at `t` = 0, past full size (about 1.2 at a quarter), a little
 * under it, then settled at 1. `t` from 0 to 1; past 1 it stays at 1.
 */
export function elasticPop(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-6 * t) * Math.cos(12 * t);
}
