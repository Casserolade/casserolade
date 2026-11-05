import { DUREES_VOIX } from '#src/data/dureesVoix.ts';
import { voixPourPhrase } from '#src/data/trouverVoix.ts';

/**
 * The voice that can say this line now: recorded, not heard yet in this game (`heard`), and no longer than
 * `maxSeconds`, for a Célébration is short. Null: the line stays a bubble, without a voice.
 */
export function freshVoice(person: string, line: string, heard: (key: string) => boolean, maxSeconds = Infinity): string | null {
  const key = voixPourPhrase(person, line);
  if (!key || heard(key)) return null;
  return (DUREES_VOIX[key] ?? Infinity) <= maxSeconds ? key : null;
}
