import type { CasseroleCard } from '#src/data/misesAJour.ts';
import type { Casserole } from '#src/engine/types.ts';

/**
 * A casserole frozen for the update notes, which keep only what its card shows, made whole again for the card
 * component: its fact and status stay empty, the card never prints them. Before 26 November 2026 casseroles had no tier.
 */
export function casseroleFromCard(card: CasseroleCard): Casserole {
  return { ...card, echelon: card.echelon ?? 1, blague: '', fait: '', statut: '', verifie: true };
}
