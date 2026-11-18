import { baseStats } from '#src/engine/gains.ts';

export type StatTone = 'base' | 'up' | 'down';

/** Green above the card's own value, red below it, white otherwise. A golden card counts double. */
export function statTones(cardId: string, golden: boolean, atk: number, hp: number): { atk: StatTone; hp: StatTone } {
  const base = baseStats({ cardId, golden });
  if (!base) return { atk: 'base', hp: 'base' };
  const tone = (value: number, own: number): StatTone => (value > own ? 'up' : value < own ? 'down' : 'base');
  return { atk: tone(atk, base.atk), hp: tone(hp, base.hp) };
}
