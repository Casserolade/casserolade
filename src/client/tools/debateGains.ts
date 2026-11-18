import type { CombatEvent } from '#src/engine/types.ts';

/**
 * What the combat gave each unit so far, by uid: the gains its journal writes (`stats`), up to the event played, never
 * the damage. A unit that came during the combat counts from its arrival.
 */
export function debateGains(log: readonly CombatEvent[], played: number): Map<number, { atk: number; hp: number }> {
  const stats = new Map<number, { atk: number; hp: number }>();
  const gains = new Map<number, { atk: number; hp: number }>();
  const enter = (unit: { uid: number; atk: number; hp: number }) => stats.set(unit.uid, { atk: unit.atk, hp: unit.hp });
  for (const event of log.slice(0, Math.max(0, played))) {
    if (event.e === 'debut') event.sides.forEach((side) => side.forEach(enter));
    else if (event.e === 'invocation' || event.e === 'retour') enter(event.unit);
    else if (event.e === 'degats') {
      const before = stats.get(event.uid);
      if (before) stats.set(event.uid, { atk: before.atk, hp: event.hp });
    } else if (event.e === 'stats') {
      const before = stats.get(event.uid);
      if (!before) continue;
      const gained = gains.get(event.uid) ?? { atk: 0, hp: 0 };
      gains.set(event.uid, { atk: gained.atk + event.atk - before.atk, hp: gained.hp + event.hp - before.hp });
      stats.set(event.uid, { atk: event.atk, hp: event.hp });
    }
  }
  return gains;
}
