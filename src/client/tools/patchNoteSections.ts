import { cardFace } from '#src/client/tools/cardFace.ts';
import { casseroleFromCard } from '#src/client/tools/casseroleFromCard.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import { tierChangeLine } from '#src/client/tools/tierChangeLine.ts';
import type { CardChange, PatchNote } from '#src/data/misesAJour.ts';

export interface ShownChange {
  key: string;
  before?: ShownCard;
  after?: ShownCard;
  why?: string;
}

export interface PatchNoteSections {
  newCards: ShownChange[];
  changedCards: ShownChange[];
  newCasseroles: ShownChange[];
  changedCasseroles: ShownChange[];
  newSpells: ShownChange[];
  /** Les sorts qui changent, puis ceux qui partent. */
  changedSpells: ShownChange[];
}

/** The cards of a version as the update notes show them: new ones first, then the ones that changed or left, with why. */
export function patchNoteSections(note: PatchNote): PatchNoteSections {
  function shown<T extends { id: string }>(changes: CardChange<T>[], toCard: (x: T) => ShownCard): ShownChange[] {
    return changes.map(({ before, after }) => {
      const key = (after ?? before)?.id ?? '';
      const tierOf = (card: T | undefined) => (card && 'tier' in card ? { tier: Number(card.tier) } : undefined);
      return { key, before: before && toCard(before), after: after && toCard(after), why: note.why[key] ?? tierChangeLine(tierOf(before), tierOf(after)) };
    });
  }
  const cards = shown(note.cards.cards, (card) => ({ kind: 'minion', face: cardFace(card) }));
  const casseroles = shown(note.cards.casseroles, (card) => ({ kind: 'casserole', casserole: casseroleFromCard(card) }));
  const spells = shown(note.cards.spells, (spell) => ({ kind: 'spell', spell }));
  return {
    newCards: cards.filter((change) => !change.before),
    changedCards: cards.filter((change) => change.before),
    newCasseroles: casseroles.filter((change) => !change.before),
    changedCasseroles: casseroles.filter((change) => change.before),
    newSpells: spells.filter((change) => !change.before),
    changedSpells: spells.filter((change) => change.before),
  };
}
