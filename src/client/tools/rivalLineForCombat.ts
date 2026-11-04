import { repliqueDe } from '#src/data/repliques.ts';
import type { CombatView } from '#src/engine/game.ts';

/** What the opponent says after the combat, known only from what the player can already see. */
export function rivalLineForCombat({ side, winner, damage, opponent }: CombatView, opponentHp: number | null): string | null {
  if (winner === null) return null;
  const rivalSide = side === 0 ? 1 : 0;
  if (winner === side && opponentHp !== null && opponentHp - damage[rivalSide] <= 0) return repliqueDe(opponent.heroId, 'elimine');
  return repliqueDe(opponent.heroId, winner === side ? 'defaite' : 'victoire');
}
