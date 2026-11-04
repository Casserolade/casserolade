import { CARD_BY_ID, TOKENS } from '#src/data/cards.ts';

export type StatTone = 'base' | 'up' | 'down';

/** Green above the card's own value, red below it, white otherwise. A golden card counts double. */
export function statTones(cardId: string, golden: boolean, atk: number, hp: number): { atk: StatTone; hp: StatTone } {
  const card = CARD_BY_ID[cardId] ?? TOKENS[cardId];
  if (!card) return { atk: 'base', hp: 'base' };
  const factor = golden && !card.golden ? 2 : 1;
  const tone = (value: number, base: number): StatTone => (value > base ? 'up' : value < base ? 'down' : 'base');
  return { atk: tone(atk, card.atk * factor), hp: tone(hp, card.hp * factor) };
}
