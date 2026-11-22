import type { HandSpell } from '#src/engine/types.ts';

/** How many Tracts the pile with this uid holds in the hand; 0 when the card is not a pile of Tracts, or is gone. */
export function tractPileSize(spells: readonly HandSpell[], uid: number): number {
  const held = spells.find((spell) => spell.uid === uid);
  return held?.spellId === 'tract' ? (held.count ?? 1) : 0;
}
