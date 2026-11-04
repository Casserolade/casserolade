import { CARD_BY_ID } from '#src/data/cards.ts';
import { CHANTS } from '#src/data/chants.ts';
import { phraseFor } from '#src/data/phrases.ts';
import type { Moment } from '#src/data/phrases.ts';
import type { CombatEvent } from '#src/engine/types.ts';

/** Where the celebrant's words are looked for, in this order: its celebration first, then any of its real quotes. */
const CELEBRATION_MOMENTS: Moment[] = ['celebration', 'heros', 'pose', 'casserole', 'mort'];
/** The one who answers for the loser: its last word first, then any of its real quotes. */
const ANSWER_MOMENTS: Moment[] = ['mort', 'defaite', 'casserole', 'pose'];

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
 * for the loser. Its own verified quotes first; a politician without any chants its camp's real slogan,
 * so that nobody talks for a long time without a word.
 */
export function speechForEvent(event: CombatEvent): CombatSpeech | null {
  if (event.e !== 'celebration' && event.e !== 'reponse') return null;
  const kind = event.e === 'celebration' ? 'celebration' : 'reponse';
  const moments = kind === 'celebration' ? CELEBRATION_MOMENTS : ANSWER_MOMENTS;
  const quote = moments.map((moment) => phraseFor(event.cardId, moment)).find((line) => line !== null) ?? null;
  const camp = CARD_BY_ID[event.cardId]?.camp;
  const chant = quote === null && camp ? CHANTS[camp] : null;
  return { kind, side: event.side, uid: event.uid, cardId: event.cardId, line: quote ?? chant, chant: chant !== null };
}
