import { celebrationRepeats } from '#src/client/tools/celebrationRepeats.ts';
import { combatUnits } from '#src/client/tools/combatUnits.ts';
import { describeEffect } from '#src/client/tools/describeEffect.ts';
import type { CombatEvent } from '#src/engine/types.ts';

export interface CelebrationNotice {
  /** Where its effect sits in the combat log: the notice shows once the playback has reached it. */
  at: number;
  uid: number;
  /** Its card: the notice shows its head. */
  cardId: string;
  side: 0 | 1;
  name: string;
  /** What it gives, card text without its « Célébration : » head, golden values included. */
  text: string;
  /** How many times it plays: Macron doubles the Célébrations of its side, triples them golden. */
  repeats: number;
}

const HEAD = '**Célébration** : ';

/** The bonuses that the Célébrations of a combat give, in the order they play: one notice each. */
export function celebrationNotices(log: CombatEvent[]): CelebrationNotice[] {
  const units = combatUnits(log);
  const notices: CelebrationNotice[] = [];
  log.forEach((event, at) => {
    if (event.e !== 'effet' || event.when !== 'celebration') return;
    const found = units.get(event.uid);
    if (!found) return;
    const described = describeEffect(event.effect, (event.effect.power ?? (found.unit.golden ? 2 : 1)) > 1);
    const body = described.startsWith(HEAD) ? described.slice(HEAD.length) : described;
    const text = body.charAt(0).toUpperCase() + body.slice(1);
    notices.push({ at, uid: event.uid, cardId: found.unit.cardId, side: found.side, name: found.unit.name, text, repeats: celebrationRepeats(log, found.side) });
  });
  return notices;
}
