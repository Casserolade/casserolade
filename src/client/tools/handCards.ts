import { CASSEROLE_BY_ID } from '#src/data/casseroles.ts';
import { SPELL_BY_ID } from '#src/data/sorts.ts';
import type { Casserole, HandSpell, Minion, Spell } from '#src/engine/types.ts';

export type HandCard =
  | { kind: 'minion'; uid: number; minion: Minion }
  | { kind: 'spell'; uid: number; held: HandSpell; spell: Spell }
  | { kind: 'casserole'; uid: number; held: HandSpell; casserole: Casserole };

/** Minions, spells and casseroles in one hand, in the order they came in (uids only grow). */
export function handCards(hand: Minion[], spells: HandSpell[]): HandCard[] {
  const cards: HandCard[] = hand.map((minion) => ({ kind: 'minion', uid: minion.uid, minion }));
  for (const held of spells) {
    const casserole = held.casseroleId ? CASSEROLE_BY_ID[held.casseroleId] : undefined;
    const spell = held.spellId ? SPELL_BY_ID[held.spellId] : undefined;
    if (casserole) cards.push({ kind: 'casserole', uid: held.uid, held, casserole });
    else if (spell) cards.push({ kind: 'spell', uid: held.uid, held, spell });
  }
  return cards.sort((a, b) => a.uid - b.uid);
}
