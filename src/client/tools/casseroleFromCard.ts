import type { CasseroleCard } from '#src/data/misesAJour.ts';
import type { Casserole } from '#src/engine/types.ts';

/**
 * A casserole frozen for the update notes, which keep only what its card shows, made whole again for the card
 * component: its fact and status stay empty, the card never prints them.
 */
export function casseroleFromCard(card: CasseroleCard): Casserole {
  return { ...card, blague: '', fait: '', statut: '', verifie: true };
}
