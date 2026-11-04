import type { CombatView } from '#src/engine/game.ts';

function sondages(count: number): string {
  return `${count} point${count > 1 ? 's' : ''} de sondage`;
}

/** The result as the player feels it, from their side of the combat. `eliminated`: it took their last polls. */
export function summarizeCombatOutcome({ side, winner, damage }: CombatView, { eliminated = false } = {}): string {
  const lost = damage[side];
  const dealt = damage[side === 0 ? 1 : 0];
  if (eliminated) return lost > 0 ? `Vous perdez ${sondages(lost)} : vous êtes éliminé.` : 'Les électeurs sont lassés : vous êtes éliminé.';
  if (winner === side) return lost > 0 ? `Gagné, ${sondages(dealt)} pour l'adversaire, ${sondages(lost)} pour vous.` : `Gagné : l'adversaire perd ${sondages(dealt)}.`;
  if (winner === null) return lost > 0 ? `Égalité, mais vous perdez ${sondages(lost)}.` : 'Égalité : personne ne perd de sondages.';
  return `Perdu : vous perdez ${sondages(lost)}.`;
}
