import type { GestureItem } from '#src/client/stores/useTableGestures.ts';
import { boardMinionShown } from '#src/client/tools/boardMinionShown.ts';
import { buyAction } from '#src/client/tools/buyAction.ts';
import { handCardShown } from '#src/client/tools/handCardShown.ts';
import { sellAction } from '#src/client/tools/sellAction.ts';
import type { SheetAction } from '#src/client/tools/sheetAction.ts';
import { minionFace } from '#src/client/tools/shownCard.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import { wornCasseroles } from '#src/client/tools/wornCasseroles.ts';
import type { SheetCasserole } from '#src/client/tools/wornCasseroles.ts';
import type { PlayerView } from '#src/engine/game.ts';

/** The phone's card, opened by a touch: the full card, what can be done with it, and the casseroles it carries. */
export interface CardSheet {
  item: GestureItem;
  card: ShownCard;
  actions: SheetAction[];
  casseroles: SheetCasserole[];
}

/** The card a touch opens on the phone, for anything of the shop, the hand or the board. */
export function cardSheetFor(item: GestureItem, view: PlayerView): CardSheet {
  switch (item.from) {
    case 'shop':
      return { item, card: { kind: 'minion', face: minionFace(item.minion) }, actions: [buyAction(view, view.buyCost)], casseroles: [] };
    case 'shop-spell':
      return { item, card: { kind: 'spell', spell: item.spell }, actions: [buyAction(view, view.shopSpellCosts[item.slot] ?? item.spell.cost)], casseroles: [] };
    case 'shop-casserole':
      return { item, card: { kind: 'casserole', casserole: item.casserole }, actions: [buyAction(view, view.casseroleCost ?? item.casserole.cost)], casseroles: [] };
    case 'hand': {
      const play: SheetAction = { id: 'play', label: 'Poser', reason: view.board.length >= view.boardLimit ? 'Plateau plein' : null, primary: true };
      const card = handCardShown({ kind: 'minion', uid: item.minion.uid, minion: item.minion }, view);
      return { item, card, actions: [play, sellAction(view, item.minion, false)], casseroles: wornCasseroles(item.minion, view.round) };
    }
    case 'hand-spell': {
      const casserole = item.card.kind === 'casserole';
      const reason = casserole && view.board.length === 0 ? 'Aucun politique sur le plateau' : null;
      return { item, card: item.card, actions: [{ id: 'cast', label: casserole ? 'Poser sur un politique' : 'Lancer', reason, primary: true }], casseroles: [] };
    }
    case 'board':
      return { item, card: boardMinionShown(item.minion, view), actions: [sellAction(view, item.minion, true)], casseroles: wornCasseroles(item.minion, view.round) };
  }
}
