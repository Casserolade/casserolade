import { RANGS } from '#src/data/rangs.ts';
import type { Rang } from '#src/data/rangs.ts';

/** The rank a rating sits at: the highest one whose floor it reaches. */
export function rankOf(mmr: number): Rang {
  return RANGS.findLast((rank) => mmr >= rank.min) ?? RANGS[0];
}
