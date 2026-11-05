import type { StatTone } from '#src/client/tools/statTone.ts';

/** Wounded, below the most it had in this combat: red, even above the card's own value (5 November 2026). */
export function healthTone(tone: StatTone, hp: number, maxHp: number): StatTone {
  return hp < maxHp ? 'down' : tone;
}
