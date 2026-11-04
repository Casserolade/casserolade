import { describeCasserole } from '#src/client/tools/describeCasserole.ts';
import { describeSpell } from '#src/client/tools/describeEffect.ts';
import { signed } from '#src/client/tools/signed.ts';
import { CARD_BY_ID } from '#src/data/cards.ts';
import type { Casserole, Spell } from '#src/engine/types.ts';

/**
 * The text of a spell card. A Tract says what it gives this player now, an Investiture the tier
 * it was fixed at when the golden minion was laid down.
 */
export function spellCardLines(spell: Spell, { tier, tract }: { tier?: number; tract?: { atk: number; hp: number } } = {}): string[] {
  if (spell.id === 'tract' && tract) return [`Donne ${signed(tract.atk)}/${signed(tract.hp)} à un politique.`];
  if (spell.id === 'investiture' && tier) return [`**Découvrez** un politique d'échelon ${tier}.`];
  return [describeSpell(spell)];
}

/** The text of a casserole card: its rules, and who gets it twice as hard. */
export function casseroleCardLines(casserole: Casserole, ownerMultiplier: number): string[] {
  const owner = CARD_BY_ID[casserole.owner]?.name;
  const lines = describeCasserole(casserole);
  return owner && ownerMultiplier > 1 ? [...lines, `×${ownerMultiplier} sur ${owner}`] : lines;
}
