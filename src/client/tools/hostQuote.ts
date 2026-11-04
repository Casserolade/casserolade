import { phraseFor } from '#src/data/phrases.ts';
import type { Moment } from '#src/data/phrases.ts';

/** A host's bubble is one short line: a longer quote waits for another moment. */
export const MAX_HOST_LINE = 90;

/** One of the host's real lines for this moment, short enough for a bubble; `turn` varies it. */
export function hostQuote(hostId: string, moment: Moment, turn = 0): string | null {
  const line = phraseFor(hostId, moment, turn);
  return line && line.length <= MAX_HOST_LINE ? line : null;
}
