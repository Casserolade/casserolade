import type { CombatEvent } from '#src/engine/types.ts';

/** Every character a combat will show, including those it summons, so they can be loaded before it starts. */
export function combatCharacterIds(log: CombatEvent[]): string[] {
  const ids = log.flatMap((event) => {
    if (event.e === 'debut') return [...event.sides[0], ...event.sides[1]].map((unit) => unit.cardId);
    return event.e === 'invocation' ? [event.unit.cardId] : [];
  });
  return [...new Set(ids)];
}
