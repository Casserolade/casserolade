import { combatBonuses } from '#src/engine/combat.ts';
import type { Minion } from '#src/engine/types.ts';

/**
 * What each minion of a board will gain at the start of combat: the engine's own rule, not a copy. `extremes`: the
 * Fer à cheval context, where the extremes are one camp.
 */
export function previewCombatBonuses(board: Minion[], extremes = false): number[] {
  return combatBonuses(board, extremes);
}
