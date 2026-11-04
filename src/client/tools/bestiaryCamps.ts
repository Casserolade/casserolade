import { CAMP_LABELS } from '#src/client/const/campLabels.ts';
import type { MinionFace } from '#src/client/tools/shownCard.ts';
import type { Camp, Card, Casserole } from '#src/engine/types.ts';

export interface BestiaryEntry {
  face: MinionFace;
  /** The names of its casseroles, its affairs and its public blunders. */
  casseroles: string[];
}

export interface BestiaryCamp {
  camp: Camp;
  label: string;
  entries: BestiaryEntry[];
}

/**
 * Every politician of the game, camp by camp in the given order, from the lowest tier to the highest, then by name.
 * Tokens are left out: they are not politicians.
 */
export function bestiaryCamps(cards: readonly Card[], casseroles: readonly Casserole[], order: readonly Camp[]): BestiaryCamp[] {
  return order.map((camp) => ({
    camp,
    label: CAMP_LABELS[camp],
    entries: cards
      .filter((card) => card.camp === camp && !card.token)
      .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name, 'fr'))
      .map((card) => ({
        face: { cardId: card.id, name: card.name, camp: card.camp, tier: card.tier, atk: card.atk, hp: card.hp, keywords: card.keywords ?? [], effects: card.effects ?? [] },
        casseroles: casseroles.filter((c) => c.owner === card.id).map((c) => c.name),
      })),
  }));
}
