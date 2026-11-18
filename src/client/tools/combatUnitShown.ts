import type { ShownCard } from '#src/client/tools/shownCard.ts';
import type { CombatUnit } from '#src/engine/types.ts';

/**
 * A unit of the combat as its full card shows it: its stats and keywords of the moment, the bonuses it came with, and
 * what this combat gave it so far (`debate`).
 */
export function combatUnitShown(unit: CombatUnit, debate: { atk: number; hp: number } | null): ShownCard {
  const { cardId, name, camp, tier, atk, hp, keywords, effects, casseroles, golden, gains } = unit;
  return { kind: 'minion', face: { cardId, name, camp, tier, atk, hp: Math.max(0, hp), keywords, effects, casseroles, golden }, gains, ...(debate ? { debate } : {}) };
}
