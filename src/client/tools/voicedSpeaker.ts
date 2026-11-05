import type { CombatEvent } from '#src/engine/types.ts';
import { speechStandIns } from '#src/client/tools/speechStandIns.ts';

type SpeechEvent = Extract<CombatEvent, { e: 'celebration' | 'reponse' }>;

/**
 * Who speaks once the combat is over: the one the engine chose, unless it has no recorded line and another
 * survivor (or another Droit de réponse of the loser) does. Real voices are heard at these two moments only:
 * the one with a voice takes the floor (5 November 2026). Only the speaker changes: every Célébration still
 * plays its gain on its own card.
 */
export function voicedSpeaker(event: SpeechEvent, log: CombatEvent[], hasVoice: (cardId: string) => boolean): SpeechEvent {
  if (hasVoice(event.cardId)) return event;
  const other = speechStandIns(event, log).find((unit) => unit.uid !== event.uid && hasVoice(unit.cardId));
  return other ? { ...event, uid: other.uid, cardId: other.cardId } : event;
}
