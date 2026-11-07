import { compactStat } from '#src/client/tools/compactStat.ts';

/** A change with its sign, written short past 1 000 like the stats themselves: +2, -1, +1,5k. */
export function signed(value: number): string {
  return value >= 0 ? `+${compactStat(value)}` : `-${compactStat(-value)}`;
}
