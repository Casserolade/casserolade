import { RANGS } from '#src/data/rangs.ts';
import type { Rang } from '#src/data/rangs.ts';

/** The rank above a rating's own, with the floor to reach; null at the top. */
export function nextRankOf(mmr: number): Rang | null {
  return RANGS.find((rank) => rank.min > mmr) ?? null;
}
