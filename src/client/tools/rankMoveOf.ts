import { rankOf } from '#src/client/tools/rankOf.ts';

/** Where a game took the player's rank: up, down, or null when the rank is the same. */
export function rankMoveOf(before: number, after: number): 'up' | 'down' | null {
  const from = rankOf(before).min;
  const to = rankOf(after).min;
  if (to === from) return null;
  return to > from ? 'up' : 'down';
}
