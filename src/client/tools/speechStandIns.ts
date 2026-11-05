import type { CombatEvent, CombatUnit } from '#src/engine/types.ts';

/** Who may speak in the chosen one's place: the winner's survivors (Vedettes first), or the loser's other Droits de réponse. */
export function speechStandIns(event: Extract<CombatEvent, { e: 'celebration' | 'reponse' }>, log: CombatEvent[]): CombatUnit[] {
  if (event.e === 'celebration') {
    const end = log.find((e): e is Extract<CombatEvent, { e: 'fin' }> => e.e === 'fin');
    const survivors = (end?.sides[event.side] ?? []).filter((unit) => unit.hp > 0);
    return [...survivors.filter((unit) => unit.keywords.includes('vedette')), ...survivors.filter((unit) => !unit.keywords.includes('vedette'))];
  }
  const start = log.find((e): e is Extract<CombatEvent, { e: 'debut' }> => e.e === 'debut');
  return (start?.sides[event.side] ?? []).filter((unit) => unit.effects.some((effect) => effect.when === 'droit_de_reponse'));
}
