import { BESTIARY_KINDS } from '#src/client/const/bestiaryKinds.ts';
import { CAMP_LABELS } from '#src/client/const/campLabels.ts';
import type { BestiaryFilter } from '#src/client/tools/matchesBestiaryFilter.ts';
import type { Camp } from '#src/engine/types.ts';

const MAX_TIER = 6;

/** The filter a link carries (`?type=casserole&camp=rn&echelon=3&q=…`). Anything unknown is ignored. */
export function parseBestiaryFilter(search: string): BestiaryFilter {
  const params = new URLSearchParams(search);
  const kind = BESTIARY_KINDS.find((k) => k.kind === params.get('type'))?.kind ?? null;
  const camp = (params.get('camp') ?? '') in CAMP_LABELS ? (params.get('camp') as Camp) : null;
  const tier = Number(params.get('echelon'));
  return { kind, camp, tier: Number.isInteger(tier) && tier >= 1 && tier <= MAX_TIER ? tier : null, query: params.get('q') ?? '' };
}
