import type { BestiaryFilter } from '#src/client/tools/matchesBestiaryFilter.ts';

/** Everything shown: no kind, camp, tier or words chosen. */
export const EMPTY_BESTIARY_FILTER: BestiaryFilter = { kind: null, camp: null, tier: null, query: '' };
