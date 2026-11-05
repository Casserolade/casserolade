import type { CombatEvent } from '#src/engine/types.ts';

/**
 * How many times the Célébrations of a side play after its combat: Macron doubles them, triples them golden.
 * Read on the board that went into the combat, as the engine reads it after (repeatCount).
 */
export function celebrationRepeats(log: CombatEvent[], side: 0 | 1): number {
  const opening = log[0]?.e === 'debut' ? log[0].sides[side] : [];
  let repeats = 1;
  for (const unit of opening) {
    if (unit.effects.some((effect) => effect.when === 'aura' && effect.do === 'doubler' && effect.trigger === 'celebration')) repeats = Math.max(repeats, unit.golden ? 3 : 2);
  }
  return repeats;
}
