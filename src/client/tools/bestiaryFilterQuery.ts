import type { BestiaryFilter } from '#src/client/tools/matchesBestiaryFilter.ts';

/** The link of a filter, so that it can be shared: `?type=casserole&camp=rn`, or '' when nothing is chosen. */
export function bestiaryFilterQuery(filter: BestiaryFilter): string {
  const params = new URLSearchParams();
  if (filter.kind) params.set('type', filter.kind);
  if (filter.camp) params.set('camp', filter.camp);
  if (filter.tier) params.set('echelon', String(filter.tier));
  if (filter.query.trim()) params.set('q', filter.query.trim());
  const query = params.toString();
  return query ? `?${query}` : '';
}
