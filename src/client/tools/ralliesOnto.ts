import { canRallyOnto } from '#src/engine/minion.ts';
import type { Minion } from '#src/engine/types.ts';

/**
 * A politician of the hand dropped on this ally joins it: a Ralliement, on an ally that can take it, as the engine
 * rules it (no casserole on a token). Anywhere else, it takes its own place on the board.
 */
export function ralliesOnto(minion: Pick<Minion, 'keywords' | 'casseroles'>, hostUid: number | null, board: readonly Minion[]): boolean {
  if (!minion.keywords.includes('ralliement') || hostUid === null) return false;
  const host = board.find((ally) => ally.uid === hostUid);
  return host !== undefined && canRallyOnto(host, minion);
}
