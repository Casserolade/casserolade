import type { BestiaryKind } from '#src/client/const/bestiaryKinds.ts';
import { sourceMatches } from '#src/client/tools/sourceMatches.ts';
import type { Camp } from '#src/engine/types.ts';

/** What the reader of the bestiary chose to see. A null field keeps everything. */
export interface BestiaryFilter {
  kind: BestiaryKind | null;
  camp: Camp | null;
  tier: number | null;
  query: string;
}

/** An item of the bestiary as the filter reads it. Without a camp or a tier, it is hidden once one is chosen. */
export interface BestiaryItem {
  kind: BestiaryKind;
  camp: Camp | null;
  tier: number | null;
  /** All its words: name, card text, joke, quote, fact. */
  text: string;
}

export function matchesBestiaryFilter(item: BestiaryItem, filter: BestiaryFilter): boolean {
  return (filter.kind === null || item.kind === filter.kind)
    && (filter.camp === null || item.camp === filter.camp)
    && (filter.tier === null || item.tier === filter.tier)
    && sourceMatches(item.text, filter.query);
}
