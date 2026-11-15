import type { StudioCard } from '#src/client/const/studioDetails.ts';
import { clockText } from '#src/client/tools/clockText.ts';

/** What a set's card shows: its label, its value or values, a note, and which value is live (a duel's running clock). */
export interface StudioCardText {
  label: string;
  values: string[];
  note: string;
  live: number;
}

/**
 * What the card of a set reads `elapsed` seconds after it came on air: the sign of the moment, the counter's value,
 * the clock's time. A clock that counts down starts again at zero; a duel's two clocks run in turn.
 */
export function studioCardText(card: StudioCard, elapsed: number): StudioCardText {
  const turn = (count: number, seconds: number) => Math.floor(elapsed / seconds) % count;
  if (card.kind === 'sign') return { label: '', values: [card.texts[turn(card.texts.length, card.seconds)]], note: '', live: 0 };
  if (card.kind === 'counter') return { label: card.label, values: [card.values[turn(card.values.length, card.seconds)]], note: card.note ?? '', live: 0 };
  if (card.kind === 'clock') {
    const time = card.direction === 'up' ? card.from + elapsed : card.from - (elapsed % (card.from + 1));
    return { label: card.label, values: [clockText(time)], note: '', live: 0 };
  }
  // Each swap hands the floor over: the full turns already spoken are shared, the turn in progress goes to its speaker.
  const turns = Math.floor(elapsed / card.swapSeconds);
  const speaker = turns % 2;
  const spoken = [Math.ceil(turns / 2), Math.floor(turns / 2)].map((whole, side) => whole * card.swapSeconds + (side === speaker ? elapsed % card.swapSeconds : 0));
  return { label: card.label, values: [clockText(card.from[0] + spoken[0]), clockText(card.from[1] + spoken[1])], note: '', live: speaker };
}
