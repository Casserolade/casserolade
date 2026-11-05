import type { CombatEvent, CombatUnit } from '#src/engine/types.ts';

/** Every unit of a combat, by uid, with its side: those of the opening boards, and those summoned during it. */
export function combatUnits(log: CombatEvent[]): Map<number, { unit: CombatUnit; side: 0 | 1 }> {
  const units = new Map<number, { unit: CombatUnit; side: 0 | 1 }>();
  for (const event of log) {
    if (event.e === 'debut') event.sides.forEach((row, side) => row.forEach((unit) => units.set(unit.uid, { unit, side: side as 0 | 1 })));
    if (event.e === 'invocation') units.set(event.unit.uid, { unit: event.unit, side: event.side });
  }
  return units;
}
