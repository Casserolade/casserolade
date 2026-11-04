import type { Minion } from '#src/engine/types.ts';

/**
 * Who would answer a defeat after the next combat: the leftmost with a Droit de réponse. Only that
 * one plays its text; the others' bubbles go dim.
 */
export function boardResponder(board: Minion[]): number | null {
  return board.find((minion) => minion.effects.some((effect) => effect.when === 'droit_de_reponse'))?.uid ?? null;
}
