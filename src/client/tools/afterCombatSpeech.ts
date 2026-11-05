import { CARD_BY_ID } from '#src/data/cards.ts';
import { CHANTS } from '#src/data/chants.ts';
import type { CombatEvent } from '#src/engine/types.ts';
import { ANSWER_MOMENTS, CELEBRATION_MOMENTS } from '#src/client/const/speechMoments.ts';
import { quotesFor } from '#src/client/tools/quotesFor.ts';
import { voixPourPhrase } from '#src/data/trouverVoix.ts';


export interface CombatSpeech {
  kind: 'celebration' | 'reponse';
  side: 0 | 1;
  uid: number;
  cardId: string;
  /** A real quote, or its camp's chant; null for an unknown card: then it says nothing. */
  line: string | null;
  /** The line is its camp's slogan or rally chant (src/data/chants.ts), not its own words: shown as a chant. */
  chant: boolean;
}

/**
 * What is said once the combat is over: the survivor who celebrates the victory, and the one who answers
 * for the loser. One of its own verified quotes, drawn by `roll` in [0, 1) so that the same politician does
 * not say the same thing every time. When some of its quotes were recorded, the draw is among those: these
 * two moments are where the real voices are heard (4 November 2026: too few were). `avoid` is the line it
 * said last time: on a winning streak it says another one, recorded if it has another, else in a bubble
 * (5 November 2026). `canVoice` says which lines can be heard now: in a game, a voice is never heard twice, and
 * after a combat a single politician is heard. A politician without any quote chants its camp's real slogan, so
 * that nobody talks for a long time without a word.
 */
export function speechForEvent(
  event: CombatEvent,
  roll = 0,
  avoid: string | null = null,
  canVoice: (cardId: string, line: string) => boolean = (cardId, line) => Boolean(voixPourPhrase(cardId, line)),
): CombatSpeech | null {
  if (event.e !== 'celebration' && event.e !== 'reponse') return null;
  const kind = event.e === 'celebration' ? 'celebration' : 'reponse';
  const quotes = quotesFor(event.cardId, kind === 'celebration' ? CELEBRATION_MOMENTS : ANSWER_MOMENTS);
  const fresh = quotes.filter((line) => line !== avoid);
  const voiced = fresh.filter((line) => canVoice(event.cardId, line));
  const pool = voiced.length > 0 ? voiced : fresh.length > 0 ? fresh : quotes;
  const quote = pool.length ? pool[Math.min(pool.length - 1, Math.floor(roll * pool.length))] : null;
  const camp = CARD_BY_ID[event.cardId]?.camp;
  const chant = quote === null && camp ? CHANTS[camp] : null;
  return { kind, side: event.side, uid: event.uid, cardId: event.cardId, line: quote ?? chant, chant: chant !== null };
}
