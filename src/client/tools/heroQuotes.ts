import type { Moment } from '#src/data/phrases.ts';
import { quotesFor } from '#src/client/tools/quotesFor.ts';

/** Where a hero's words come from on the selection screen: its hero lines first, then its other real quotes. */
const HERO_MOMENTS: Moment[] = ['heros', 'celebration', 'pose', 'casserole'];
/** Longer than this, a line would cover the cards around it. */
const MAX_QUOTE = 110;

/** The real quotes a hero may say when the pointer rests on it, each once. */
export function heroQuotes(heroId: string): string[] {
  return quotesFor(heroId, HERO_MOMENTS).filter((line) => line.length <= MAX_QUOTE);
}
