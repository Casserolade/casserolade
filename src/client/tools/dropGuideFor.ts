import { sellGain } from '#src/client/tools/sellGain.ts';
import type { Dragging } from '#src/client/stores/useTableGestures.ts';
import type { PlayerView } from '#src/engine/game.ts';

/** What the counter line says while something is carried: what a drop on the other side would do, for how much. */
export interface DropGuide {
  /** `play`: a politician of the hand over a full board, only to say why it will not land. */
  mode: 'buy' | 'sell' | 'play';
  /** The pointer is on the side where the drop acts. */
  armed: boolean;
  amount: number;
  /** Why the drop would be refused: not enough budget, no room left in the hand or on the board, a bracelet. */
  blocked: 'budget' | 'hand' | 'board' | 'bracelet' | null;
  /** The board's places, for « Plateau plein » (6 with Batho's power, 7 otherwise). */
  places?: number;
}

export function dropGuideFor(drag: Dragging | null, view: PlayerView): DropGuide | null {
  if (!drag) return null;
  const { item, aim } = drag;
  if (item.from === 'hand' && aim.zone === 'board' && view.board.length >= view.boardLimit) {
    const rallies = item.minion.keywords.includes('ralliement') && aim.uid !== null;
    if (!rallies) return { mode: 'play', armed: true, amount: 0, blocked: 'board', places: view.boardLimit };
  }
  if (item.from === 'board' || item.from === 'hand') {
    const blocked = item.minion.bracelet ? 'bracelet' : null;
    return { mode: 'sell', armed: aim.zone === 'shop', amount: sellGain(view.params, view.mods, item.minion, item.from === 'board').now, blocked };
  }
  let cost: number;
  switch (item.from) {
    case 'shop':
      cost = view.buyCost;
      break;
    case 'shop-spell':
      cost = view.shopSpellCosts[item.slot] ?? item.spell.cost;
      break;
    case 'shop-casserole':
      cost = view.casseroleCost ?? item.casserole.cost;
      break;
    default:
      return null;
  }
  const handFull = view.hand.length + view.spells.length >= view.handLimit;
  return { mode: 'buy', armed: aim.zone === 'board' || aim.zone === 'hand', amount: cost, blocked: view.budget < cost ? 'budget' : handFull ? 'hand' : null };
}
