import type { SheetAction } from '#src/client/tools/sheetAction.ts';
import type { PlayerView } from '#src/engine/game.ts';

/** « Recruter », for this cost: greyed when the budget or the hand is short, as the engine would refuse it. */
export function buyAction(view: Pick<PlayerView, 'budget' | 'hand' | 'spells' | 'handLimit'>, cost: number): SheetAction {
  const handFull = view.hand.length + view.spells.length >= view.handLimit;
  const reason = view.budget < cost ? 'Budget insuffisant' : handFull ? 'Main pleine' : null;
  return { id: 'buy', label: 'Recruter', cost, reason, primary: true };
}
