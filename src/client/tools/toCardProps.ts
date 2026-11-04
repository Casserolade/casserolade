import type { Camp, Effect, Keyword } from '#src/engine/types.ts';

interface CardLike {
  /** Catalogue cards call it id, minions and combat units cardId. */
  id?: string;
  cardId?: string;
  name: string;
  camp: Camp;
  tier: number;
  atk: number;
  hp: number;
  keywords?: Keyword[];
  effects?: Effect[];
  casseroles?: string[];
  golden?: boolean;
  locked?: boolean;
}

/** Keeps only what a card displays, whether it comes from the catalogue, the board or a combat. */
export function toCardProps({ id, cardId, name, camp, tier, atk, hp, keywords, effects, casseroles, golden, locked }: CardLike) {
  return { cardId: cardId ?? id ?? '', name, camp, tier, atk, hp, keywords, effects, casseroles, golden, locked };
}
