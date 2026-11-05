import type { Moment } from '#src/data/phrases.ts';
import { quotesFor } from '#src/client/tools/quotesFor.ts';
import { voixPourPhrase } from '#src/data/trouverVoix.ts';

/** Whether one of this person's lines for these moments was recorded: it can be heard, not only read. */
export function hasRecordedLine(id: string, moments: Moment[]): boolean {
  return quotesFor(id, moments).some((line) => voixPourPhrase(id, line));
}
