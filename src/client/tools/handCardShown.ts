import type { HandCard } from '#src/client/tools/handCards.ts';
import { minionFace, scandalLeft } from '#src/client/tools/shownCard.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import type { PlayerView } from '#src/engine/game.ts';
import { tripleCopies } from '#src/engine/minion.ts';

/**
 * A card of the hand as its full face shows it: a minion with its copies toward a triple and its scandal, a spell
 * with what this player's Tracts give and the tier an Investiture was fixed at, or a casserole.
 */
export function handCardShown(card: HandCard, view: Pick<PlayerView, 'board' | 'hand' | 'scandalThreshold' | 'round' | 'tract'>): ShownCard {
  if (card.kind === 'casserole') return { kind: 'casserole', casserole: card.casserole };
  if (card.kind === 'spell') return { kind: 'spell', spell: card.spell, count: card.held.count, tier: card.held.tier, tract: view.tract };
  const { minion } = card;
  const copies = minion.golden ? 0 : tripleCopies([...view.board, ...view.hand], minion.cardId).length;
  return {
    kind: 'minion',
    face: minionFace(minion, { copies: copies >= 2 ? copies : 0, charges: minion.charges, scandalThreshold: view.scandalThreshold, scandalLeft: scandalLeft(minion, view.round) }),
  };
}
