import { sellGain } from '#src/client/tools/sellGain.ts';
import type { Dragging } from '#src/client/stores/useTableGestures.ts';
import type { PlayerView } from '#src/engine/game.ts';

/** What the counter line says while something is carried: what a drop on the other side would do, for how much. */
export interface DropGuide {
  mode: 'buy' | 'sell';
  /** The pointer is on the side where the drop acts. */
  armed: boolean;
  amount: number;
  /** Why a purchase would be refused: not enough budget, or no room left in the hand. */
  blocked: 'budget' | 'hand' | null;
}

export function dropGuideFor(drag: Dragging | null, view: PlayerView): DropGuide | null {
  if (!drag) return null;
  const { item, aim } = drag;
  if (item.from === 'board' || item.from === 'hand') {
    return { mode: 'sell', armed: aim.zone === 'shop', amount: sellGain(view.params, view.mods, item.minion, item.from === 'board').now, blocked: null };
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
