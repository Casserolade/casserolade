import { cardFace } from '#src/client/tools/cardFace.ts';
import { casseroleFromCard } from '#src/client/tools/casseroleFromCard.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import type { PatchNote } from '#src/data/misesAJour.ts';

export interface ShownChange {
  key: string;
  before?: ShownCard;
  after: ShownCard;
  why?: string;
}

export interface PatchNoteSections {
  newCards: ShownChange[];
  changedCards: ShownChange[];
  newCasseroles: ShownChange[];
  changedCasseroles: ShownChange[];
  spells: ShownChange[];
}

/** The cards of a version as the update notes show them: new ones first, then the ones that changed, with why. */
export function patchNoteSections(note: PatchNote): PatchNoteSections {
  const cards: ShownChange[] = note.cards.cards.map(({ before, after }) => ({
    key: after.id,
    before: before && { kind: 'minion', face: cardFace(before) },
    after: { kind: 'minion', face: cardFace(after) },
    why: note.why[after.id],
  }));
  const casseroles: ShownChange[] = note.cards.casseroles.map(({ before, after }) => ({
    key: after.id,
    before: before && { kind: 'casserole', casserole: casseroleFromCard(before) },
    after: { kind: 'casserole', casserole: casseroleFromCard(after) },
  }));
  return {
    newCards: cards.filter((change) => !change.before),
    changedCards: cards.filter((change) => change.before),
    newCasseroles: casseroles.filter((change) => !change.before),
    changedCasseroles: casseroles.filter((change) => change.before),
    spells: note.cards.spells.map(({ before, after }) => ({
      key: after.id,
      before: before && { kind: 'spell', spell: before },
      after: { kind: 'spell', spell: after },
    })),
  };
}
