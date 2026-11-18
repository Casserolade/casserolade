import type { CombatEvent } from '#src/engine/types.ts';
import { speechStandIns } from '#src/client/tools/speechStandIns.ts';

type SpeechEvent = Extract<CombatEvent, { e: 'celebration' | 'reponse' }>;

/**
 * Who speaks once the combat is over: the one the engine drew (a survivor at random, for a Célébration), unless it
 * has no recorded line and other survivors (or other Droits de réponse of the loser) do: then one of those, drawn by
 * `roll` in [0, 1), without any order of precedence. Real voices are heard at these two moments only: one with a
 * voice takes the floor (5 November 2026). Only the speaker changes: every Célébration still plays its gain on its
 * own card.
 */
export function voicedSpeaker(event: SpeechEvent, log: CombatEvent[], hasVoice: (cardId: string) => boolean, roll = 0): SpeechEvent {
  if (hasVoice(event.cardId)) return event;
  const others = speechStandIns(event, log).filter((unit) => unit.uid !== event.uid && hasVoice(unit.cardId));
  const other = others[Math.min(others.length - 1, Math.floor(roll * others.length))];
  return other ? { ...event, uid: other.uid, cardId: other.cardId } : event;
}
