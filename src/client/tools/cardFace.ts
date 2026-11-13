import type { MinionFace } from '#src/client/tools/shownCard.ts';
import type { Card } from '#src/engine/types.ts';

/** The face of a politician's card as the game defines it: no buff, no casserole, nothing gained. */
export function cardFace(card: Card): MinionFace {
  return { cardId: card.id, name: card.name, camp: card.camp, tier: card.tier, atk: card.atk, hp: card.hp, keywords: card.keywords ?? [], effects: card.effects ?? [] };
}
