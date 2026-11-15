import { shuffled } from '#src/client/tools/shuffled.ts';

/**
 * The order the tracks play in: all of them, shuffled, none first by right. `rolls` gives one number in [0, 1) per
 * track (a seeded or a real random), so the same rolls give the same order. `justPlayed` never opens the new order:
 * the last track of one round is not heard twice in a row.
 */
export function musicOrder<T>(tracks: readonly T[], rolls: readonly number[], justPlayed: T | null = null): T[] {
  const order = shuffled(tracks, rolls);
  if (order.length > 1 && order[0] === justPlayed) order.push(order.shift() as T);
  return order;
}
