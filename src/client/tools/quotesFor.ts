import { PHRASES } from '#src/data/phrases.ts';
import type { Moment } from '#src/data/phrases.ts';

/** All the real quotes of a person for these moments, in their order, each once. */
export function quotesFor(id: string, moments: Moment[]): string[] {
  const quotes = moments.flatMap((moment) => PHRASES[id]?.[moment] ?? []);
  return [...new Set(quotes)];
}
