import { computed, shallowRef } from 'vue';
import { EMPTY_BESTIARY_FILTER } from '#src/client/const/emptyBestiaryFilter.ts';
import { GAME_CONCEPTS } from '#src/client/const/gameConcepts.ts';
import { KEYWORD_RULES, TERM_RULES } from '#src/client/const/keywordRules.ts';
import { BESTIARY_KINDS } from '#src/client/const/bestiaryKinds.ts';
import type { BestiaryKind } from '#src/client/const/bestiaryKinds.ts';
import { bestiaryCatalog } from '#src/client/tools/bestiaryCatalog.ts';
import type { CatalogItem } from '#src/client/tools/bestiaryCatalog.ts';
import { bestiaryFilterQuery } from '#src/client/tools/bestiaryFilterQuery.ts';
import { matchesBestiaryFilter } from '#src/client/tools/matchesBestiaryFilter.ts';
import type { BestiaryFilter } from '#src/client/tools/matchesBestiaryFilter.ts';
import { parseBestiaryFilter } from '#src/client/tools/parseBestiaryFilter.ts';
import { CARDS, PARTY_CAMPS, TOKENS } from '#src/data/cards.ts';
import { CASSEROLES } from '#src/data/casseroles.ts';
import { CONTEXTS, HEROES } from '#src/data/heroes.ts';
import { SPELLS } from '#src/data/sorts.ts';

/**
 * The bestiary's model: the whole catalog, the filter the reader chose (kept in the link, so that it can be
 * shared), and what each section shows under it.
 */
export function useBestiary() {
  const catalog = bestiaryCatalog({
    cards: CARDS, tokens: Object.values(TOKENS), casseroles: CASSEROLES, spells: SPELLS, heroes: HEROES, contexts: CONTEXTS,
    campOrder: [...PARTY_CAMPS, 'civile'],
    cardTerms: [
      ...Object.values(KEYWORD_RULES).map(({ label, rule }) => ({ term: label, rule })),
      ...Object.entries(TERM_RULES).map(([term, rule]) => ({ term: term.charAt(0).toUpperCase() + term.slice(1), rule })),
    ],
    gameTerms: Object.entries(GAME_CONCEPTS).map(([term, rule]) => ({ term, rule })),
  });
  const everything: CatalogItem<unknown>[] = [
    ...catalog.keywords, ...catalog.heroes, ...catalog.camps.flatMap((c) => c.items), ...catalog.casseroles, ...catalog.spells, ...catalog.tokens, ...catalog.contexts,
  ];
  const filter = shallowRef<BestiaryFilter>(parseBestiaryFilter(window.location.search));

  /** The only way the filter changes: the link follows it. */
  function setFilter(next: BestiaryFilter): void {
    filter.value = next;
    window.history.replaceState(null, '', `${window.location.pathname}${bestiaryFilterQuery(next)}`);
  }

  function resetFilter(): void {
    setFilter(EMPTY_BESTIARY_FILTER);
  }

  const shown = <T>(items: CatalogItem<T>[]) => items.filter((item) => matchesBestiaryFilter(item, filter.value));
  /** How many items of each kind the other choices leave: the numbers on the kind buttons. */
  const counts = computed(() => Object.fromEntries(BESTIARY_KINDS.map(({ kind }) =>
    [kind, everything.filter((item) => matchesBestiaryFilter(item, { ...filter.value, kind })).length])) as Record<BestiaryKind, number>);

  return {
    filter,
    setFilter,
    resetFilter,
    counts,
    total: computed(() => shown(everything).length),
    keywords: computed(() => shown(catalog.keywords)),
    heroes: computed(() => shown(catalog.heroes)),
    camps: computed(() => catalog.camps.map((camp) => ({ ...camp, items: shown(camp.items) })).filter((camp) => camp.items.length > 0)),
    casseroles: computed(() => shown(catalog.casseroles)),
    spells: computed(() => shown(catalog.spells)),
    tokens: computed(() => shown(catalog.tokens)),
    contexts: computed(() => shown(catalog.contexts)),
  };
}
