import { combatBonuses } from '#src/engine/combat.ts';
import type { Minion } from '#src/engine/types.ts';

/** What each minion of a board will gain at the start of combat: the engine's own rule, not a copy. */
export function previewCombatBonuses(board: Minion[]): number[] {
  return combatBonuses(board);
}
