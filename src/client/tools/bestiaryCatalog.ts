import { CAMP_LABELS } from '#src/client/const/campLabels.ts';
import { bestiaryCamps } from '#src/client/tools/bestiaryCamps.ts';
import type { BestiaryEntry } from '#src/client/tools/bestiaryCamps.ts';
import type { BestiaryItem } from '#src/client/tools/matchesBestiaryFilter.ts';
import { shownCardLines } from '#src/client/tools/shownCard.ts';
import { sourceMatches } from '#src/client/tools/sourceMatches.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import type { Camp, Card, Casserole, Context, Hero, Spell } from '#src/engine/types.ts';

/** One thing the bestiary shows, with what its filter reads. */
export interface CatalogItem<T> extends BestiaryItem {
  key: string;
  data: T;
}

/** A word explained: a keyword of the cards, or a word of the game. `politicians`: how many cards use it. */
export interface KeywordEntry {
  term: string;
  rule: string;
  group: 'carte' | 'jeu';
  politicians: number;
}

export interface BestiaryCatalog {
  keywords: CatalogItem<KeywordEntry>[];
  heroes: CatalogItem<Hero>[];
  camps: { camp: Camp; label: string; items: CatalogItem<BestiaryEntry>[] }[];
  casseroles: CatalogItem<Casserole>[];
  spells: CatalogItem<Spell>[];
  /** What effects create: the tokens, and the spells one earns (Tract, Investiture). */
  tokens: CatalogItem<ShownCard>[];
  contexts: CatalogItem<Context>[];
}

export interface BestiaryData {
  cards: readonly Card[];
  tokens: readonly Card[];
  casseroles: readonly Casserole[];
  spells: readonly Spell[];
  heroes: readonly Hero[];
  contexts: readonly Context[];
  campOrder: readonly Camp[];
  /** The words in bold on the cards, with their rule: the same ones the game explains on hover. */
  cardTerms: readonly { term: string; rule: string }[];
  /** The words of the game itself: budget, tier, golden… */
  gameTerms: readonly { term: string; rule: string }[];
}

/** A card's rule lines as plain words, for the search. */
function rules(card: ShownCard): string {
  return shownCardLines(card).join(' ').replaceAll('**', '');
}

/** Everything the game holds, as the bestiary lists it: each item knows its kind, camp, tier and words. */
export function bestiaryCatalog(data: BestiaryData): BestiaryCatalog {
  const cardOf = (id: string) => data.cards.find((c) => c.id === id);
  const campOf = (id: string) => cardOf(id)?.camp ?? null;
  const spell = (s: Spell): ShownCard => ({ kind: 'spell', spell: s });
  const token = (c: Card): ShownCard => ({ kind: 'minion', face: { cardId: c.id, name: c.name, camp: c.camp, tier: c.tier, atk: c.atk, hp: c.hp, keywords: c.keywords ?? [], effects: c.effects ?? [] } });
  const camps = bestiaryCamps(data.cards, data.casseroles, data.campOrder).map((camp) => ({
    camp: camp.camp,
    label: camp.label,
    items: camp.entries.map((entry): CatalogItem<BestiaryEntry> => ({
      key: entry.face.cardId, kind: 'politique', camp: camp.camp, tier: entry.face.tier, data: entry,
      text: `${entry.face.name} ${CAMP_LABELS[camp.camp]} ${rules({ kind: 'minion', face: entry.face })} ${entry.casseroles.join(' ')}`,
    })),
  }));
  const politicians = camps.flatMap((camp) => camp.items);
  const keyword = (group: KeywordEntry['group']) => ({ term, rule }: { term: string; rule: string }): CatalogItem<KeywordEntry> => ({
    key: `${group}-${term}`, kind: 'mot_cle', camp: null, tier: null, text: `${term} ${rule}`,
    data: { term, rule, group, politicians: politicians.filter((p) => sourceMatches(p.text, term)).length },
  });
  return {
    keywords: [...data.cardTerms.map(keyword('carte')), ...data.gameTerms.map(keyword('jeu'))],
    heroes: data.heroes.map((hero) => ({ key: hero.id, kind: 'heros', camp: campOf(hero.id), tier: null, text: `${hero.name} ${hero.power} ${hero.desc}`, data: hero })),
    camps,
    casseroles: data.casseroles.map((c) => ({
      key: c.id, kind: 'casserole', camp: campOf(c.owner), tier: null, data: c,
      text: `${c.name} ${cardOf(c.owner)?.name ?? ''} ${rules({ kind: 'casserole', casserole: c })} ${c.blague} ${c.citation ?? ''} ${c.fait}`,
    })),
    spells: data.spells.filter((s) => !s.token).map((s) => ({ key: s.id, kind: 'sort', camp: null, tier: s.tier, text: `${s.name} ${rules(spell(s))}`, data: s })),
    tokens: [
      ...data.tokens.map((c) => ({ key: c.id, kind: 'jeton' as const, camp: null, tier: null, text: `${c.name} ${rules(token(c))}`, data: token(c) })),
      ...data.spells.filter((s) => s.token).map((s) => ({ key: s.id, kind: 'jeton' as const, camp: null, tier: null, text: `${s.name} ${rules(spell(s))}`, data: spell(s) })),
    ],
    contexts: data.contexts.map((c) => ({ key: c.id, kind: 'contexte', camp: null, tier: null, text: `${c.name} ${c.desc}`, data: c })),
  };
}
