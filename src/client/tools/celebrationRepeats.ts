import type { CombatEvent } from '#src/engine/types.ts';

/**
 * How many times the Célébrations of a side play after its combat: Macron doubles them if he survived, triples them
 * golden. Read on the survivors of the end of the combat, as the engine counts them (celebrationRepeats in combat.ts).
 */
export function celebrationRepeats(log: CombatEvent[], side: 0 | 1): number {
  const end = log.find((event) => event.e === 'fin');
  const survivors = end?.e === 'fin' ? end.sides[side] : [];
  let repeats = 1;
  for (const unit of survivors) {
    for (const effect of unit.effects) {
      if (effect.when === 'aura' && effect.do === 'doubler' && effect.trigger === 'celebration') repeats = Math.max(repeats, (effect.power ?? (unit.golden ? 2 : 1)) > 1 ? 3 : 2);
    }
  }
  return repeats;
}
