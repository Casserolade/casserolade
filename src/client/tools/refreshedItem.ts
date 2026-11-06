import type { GestureItem } from '#src/client/stores/useTableGestures.ts';
import { CASSEROLE_BY_ID } from '#src/data/casseroles.ts';
import { SPELL_BY_ID } from '#src/data/sorts.ts';
import type { PlayerView } from '#src/engine/game.ts';

/**
 * The thing a card of the phone shows, in a new state of the game: the same, up to date, or null when it is gone
 * (bought, played, sold, or a new shop). The card then follows it, or closes.
 */
export function refreshedItem(item: GestureItem, view: Pick<PlayerView, 'shop' | 'shopSpells' | 'casseroleOffer' | 'hand' | 'spells' | 'board'>): GestureItem | null {
  switch (item.from) {
    case 'shop':
      return view.shop[item.slot] === item.minion.cardId ? item : null;
    case 'shop-spell':
      return view.shopSpells[item.slot] === item.spell.id && SPELL_BY_ID[item.spell.id] ? item : null;
    case 'shop-casserole':
      return view.casseroleOffer === item.casserole.id && CASSEROLE_BY_ID[item.casserole.id] ? item : null;
    case 'hand': {
      const minion = view.hand.find((m) => m.uid === item.minion.uid);
      return minion ? { from: 'hand', minion } : null;
    }
    case 'hand-spell': {
      const held = view.spells.find((s) => s.uid === item.held.uid);
      return held ? { ...item, held } : null;
    }
    case 'board': {
      const index = view.board.findIndex((m) => m.uid === item.minion.uid);
      return index >= 0 ? { from: 'board', minion: view.board[index], index } : null;
    }
  }
}
