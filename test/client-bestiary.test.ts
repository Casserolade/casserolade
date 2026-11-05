import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestiaryCamps } from '../src/client/tools/bestiaryCamps.ts';
import { CARDS, PARTY_CAMPS } from '../src/data/cards.ts';
import { CASSEROLES } from '../src/data/casseroles.ts';
import { bestiaryCatalog } from '../src/client/tools/bestiaryCatalog.ts';
import { bestiaryFilterQuery } from '../src/client/tools/bestiaryFilterQuery.ts';
import { casseroleSources } from '../src/client/tools/casseroleSources.ts';
import { countLabel } from '../src/client/tools/countLabel.ts';
import { isWebLink } from '../src/client/tools/isWebLink.ts';
import { matchesBestiaryFilter } from '../src/client/tools/matchesBestiaryFilter.ts';
import { parseBestiaryFilter } from '../src/client/tools/parseBestiaryFilter.ts';
import { personSources } from '../src/client/tools/personSources.ts';
import { EMPTY_BESTIARY_FILTER } from '../src/client/const/emptyBestiaryFilter.ts';
import type { GameSources } from '../src/client/services/loadSources.ts';
import { TOKENS } from '../src/data/cards.ts';
import { CONTEXTS, HEROES } from '../src/data/heroes.ts';
import { PARAMS } from '../src/data/params.ts';
import { SPELLS } from '../src/data/sorts.ts';

test('bestiaryCamps : chaque politique une fois, dans son camp, par échelon puis par nom, avec ses casseroles', () => {
  const camps = bestiaryCamps(CARDS, CASSEROLES, [...PARTY_CAMPS, 'civile']);
  const all = camps.flatMap((c) => c.entries.map((e) => e.face.cardId));
  assert.equal(all.length, CARDS.filter((c) => !c.token).length);
  assert.equal(new Set(all).size, all.length);
  for (const camp of camps) {
    assert.ok(camp.entries.every((e) => e.face.camp === camp.camp), camp.camp);
    const tiers = camp.entries.map((e) => e.face.tier);
    assert.deepEqual(tiers, [...tiers].sort((a, b) => a - b), camp.camp);
  }
  const sarkozy = camps.flatMap((c) => c.entries).find((e) => e.face.cardId === 'sarkozy');
  assert.ok(sarkozy && sarkozy.casseroles.includes('Les écoutes'));
  assert.equal(camps.find((c) => c.camp === 'reconquete')?.label, 'Reconquête');
});

const catalog = bestiaryCatalog({
  cards: CARDS, tokens: Object.values(TOKENS), casseroles: CASSEROLES, spells: SPELLS, heroes: HEROES, contexts: CONTEXTS,
  campOrder: [...PARTY_CAMPS, 'civile'], ownerMultiplier: PARAMS.ownerMultiplier,
  cardTerms: [{ term: 'Porte-parole', rule: 'Les ennemis doivent l\'attaquer en priorité.' }, { term: 'Fin de tour', rule: 'À la fin du recrutement.' }],
  gameTerms: [{ term: 'Budget', rule: 'Il ne se garde pas.' }],
});

test('bestiaryCatalog : tout le jeu, chaque chose une fois, avec son camp et son échelon', () => {
  assert.equal(catalog.heroes.length, HEROES.length);
  assert.equal(catalog.camps.flatMap((c) => c.items).length, CARDS.length);
  assert.equal(catalog.casseroles.length, CASSEROLES.length);
  assert.equal(catalog.spells.length + catalog.tokens.length, SPELLS.length + Object.keys(TOKENS).length);
  assert.ok(catalog.spells.every((s) => !s.data.token && s.tier === s.data.tier));
  const bardella = catalog.casseroles.find((c) => c.key === 'des_deux_siciles');
  assert.equal(bardella?.camp, 'rn');
  assert.match(bardella?.text ?? '', /Deux-Siciles/);
  assert.ok(catalog.tokens.some((t) => t.key === 'tract') && catalog.tokens.some((t) => t.key === 'chaise_vide'));
});

test('bestiaryCatalog : les mots-clés expliqués, et combien de politiques les portent', () => {
  const porteParole = catalog.keywords.find((k) => k.data.term === 'Porte-parole');
  const carriers = CARDS.filter((c) => c.keywords?.includes('porte_parole')).length;
  assert.ok(porteParole && porteParole.data.group === 'carte' && porteParole.data.politicians >= carriers);
  assert.ok(catalog.keywords.some((k) => k.data.term === 'Budget' && k.data.group === 'jeu'));
  assert.ok(catalog.keywords.every((k) => k.kind === 'mot_cle' && k.camp === null && k.tier === null));
});

test('matchesBestiaryFilter : type, camp, échelon et mots, sans accents ; sans camp ni échelon, caché dès qu\'on en choisit un', () => {
  const ndiaye = catalog.camps.flatMap((c) => c.items).find((i) => i.key === 'ndiaye');
  assert.ok(ndiaye);
  assert.ok(matchesBestiaryFilter(ndiaye, EMPTY_BESTIARY_FILTER));
  assert.ok(matchesBestiaryFilter(ndiaye, { kind: 'politique', camp: 'macronie', tier: 1, query: 'porte parole' }));
  assert.ok(!matchesBestiaryFilter(ndiaye, { ...EMPTY_BESTIARY_FILTER, kind: 'casserole' }));
  assert.ok(!matchesBestiaryFilter(ndiaye, { ...EMPTY_BESTIARY_FILTER, tier: 2 }));
  const spell = catalog.spells[0];
  assert.ok(!matchesBestiaryFilter(spell, { ...EMPTY_BESTIARY_FILTER, camp: 'rn' }));
  const pecresse = catalog.camps.flatMap((c) => c.items).find((i) => i.key === 'pecresse');
  assert.ok(pecresse && matchesBestiaryFilter(pecresse, { ...EMPTY_BESTIARY_FILTER, query: 'PECRESSE' }));
});

test('parseBestiaryFilter et bestiaryFilterQuery : le lien garde le filtre, et ignore ce qu\'il ne connaît pas', () => {
  const filter = { kind: 'casserole' as const, camp: 'rn' as const, tier: 3, query: 'facebook' };
  assert.deepEqual(parseBestiaryFilter(bestiaryFilterQuery(filter)), filter);
  assert.equal(bestiaryFilterQuery(EMPTY_BESTIARY_FILTER), '');
  assert.deepEqual(parseBestiaryFilter('?type=dragon&camp=pirates&echelon=9'), EMPTY_BESTIARY_FILTER);
});

test('personSources et casseroleSources : chaque source sous sa carte', () => {
  const sources: GameSources = {
    genere: '', logos: [], polices: [],
    phrases: [{ id: 'bardella', qui: 'Jordan Bardella', texte: 'Bravo Jean Moulin !', date: '', contexte: '', sources: ['https://example.org/a'] }],
    casseroles: [],
    voix: [
      { nom: 'a', phrase: 'Bravo Jean Moulin !', personne: 'bardella', casserole: '', auteur: '', source: 'https://example.org/v', date: '' },
      { nom: 'b', phrase: 'alstom', personne: 'lepen', casserole: 'confusion_dossiers', auteur: '', source: '', date: '' },
    ],
    photos: [
      { nom: 'Jordan Bardella', personne: 'bardella', casserole: '', auteur: '', licence: '', source: '' },
      { nom: 'Casserole', personne: '', casserole: 'des_deux_siciles', auteur: '', licence: '', source: 'Photo fournie' },
    ],
  };
  const bardella = personSources(sources, 'bardella');
  assert.deepEqual([bardella.photos.length, bardella.voices.length, bardella.lines.length], [1, 1, 1]);
  assert.equal(casseroleSources(sources, 'des_deux_siciles').photos.length, 1);
  assert.equal(casseroleSources(sources, 'confusion_dossiers').voices[0].phrase, 'alstom');
});

test('countLabel et isWebLink', () => {
  assert.equal(countLabel(1, 'politique', 'politiques'), '1 politique');
  assert.equal(countLabel(0, 'résultat', 'résultats'), '0 résultat');
  assert.equal(countLabel(13, 'politique', 'politiques'), '13 politiques');
  assert.ok(isWebLink('https://commons.wikimedia.org/x'));
  assert.ok(!isWebLink('Photo du Grand Prix de Monaco'));
});
