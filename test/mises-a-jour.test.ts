import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardFace } from '../src/client/tools/cardFace.ts';
import { casseroleFromCard } from '../src/client/tools/casseroleFromCard.ts';
import { patchNoteSections } from '../src/client/tools/patchNoteSections.ts';
import { tierChangeLine } from '../src/client/tools/tierChangeLine.ts';
import { KEYWORD_RULES } from '../src/client/const/keywordRules.ts';
import { MISES_A_JOUR } from '../src/data/misesAJour.ts';
import type { CasseroleCard } from '../src/data/misesAJour.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { CASSEROLE_BY_ID } from '../src/data/casseroles.ts';
import { SPELL_BY_ID } from '../src/data/sorts.ts';
import { VERSION } from '../src/protocol/version.ts';
import type { Casserole } from '../src/engine/types.ts';

/**
 * La page des mises à jour (/mises-a-jour) : les cartes de chaque version, avant et après. La dernière version doit
 * dire vrai : son « après » est le jeu tel qu'il est. Si un test casse ici, la page n'est plus à jour : refaire
 * l'instantané (tools/mises_a_jour/instantane.ts) et le texte de la version (src/data/misesAJour.ts).
 */

const latest = MISES_A_JOUR[0];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function shownCasserole(c: Casserole): CasseroleCard {
  const { blague, citation, fait, statut, verifie, ...shown } = c as Casserole & { sources?: unknown };
  delete (shown as { sources?: unknown }).sources;
  return shown;
}

test('la dernière version est celle du jeu', () => {
  assert.equal(latest.version, VERSION);
});

test('l\'« après » de la dernière version est le jeu tel qu\'il est : politiques, casseroles, sorts', () => {
  for (const { before, after } of latest.cards.cards) {
    if (after) assert.ok(same(cardFace(after), cardFace(CARD_BY_ID[after.id])), `${after.id} a changé depuis`);
    else assert.equal(CARD_BY_ID[before.id], undefined, `${before.id} n'est pas retiré`);
  }
  for (const { before, after } of latest.cards.casseroles) {
    if (after) assert.ok(same(after, shownCasserole(CASSEROLE_BY_ID[after.id])), `${after.id} a changé depuis`);
    else assert.equal(CASSEROLE_BY_ID[before.id], undefined, `${before.id} n'est pas retirée`);
  }
  for (const { before, after } of latest.cards.spells) {
    if (after) assert.ok(same(after, SPELL_BY_ID[after.id]), `${after.id} a changé depuis`);
    else assert.equal(SPELL_BY_ID[before.id], undefined, `${before.id} n'est pas retiré`);
  }
});

test('chaque politique nouveau, retouché ou retiré dit pourquoi, et le pourquoi ne parle que de ce qui change', () => {
  const idOf = (change: { before?: { id: string }; after?: { id: string } }) => (change.after ?? change.before)?.id as string;
  const cards = latest.cards.cards.map(idOf);
  for (const id of cards) assert.ok(latest.why[id], `${id} sans pourquoi`);
  const changed = [...cards, ...latest.cards.spells.map(idOf), ...latest.cards.casseroles.map(idOf)];
  for (const id of Object.keys(latest.why)) assert.ok(changed.includes(id), `${id} n'a pas changé`);
});

test('un mot-clé des règles de la dernière version a le texte du jeu', () => {
  for (const rule of latest.rules) {
    const keyword = Object.values(KEYWORD_RULES).find((k) => k.label === rule.term);
    if (keyword) assert.equal(rule.after, keyword.rule, rule.term);
  }
});

test('les versions vont de la plus récente à la plus ancienne, une fois chacune', () => {
  const versions = MISES_A_JOUR.map((note) => note.version);
  assert.equal(new Set(versions).size, versions.length);
  const rank = (v: string) => v.split('.').reduce((sum, part) => sum * 1000 + Number(part), 0);
  assert.deepEqual([...versions].sort((a, b) => rank(b) - rank(a)), versions);
});

test('cardFace : la carte nue, sans rien de gagné', () => {
  assert.deepEqual(cardFace(CARD_BY_ID.giscard), {
    cardId: 'giscard', name: CARD_BY_ID.giscard.name, camp: 'civile', tier: 6, atk: CARD_BY_ID.giscard.atk, hp: CARD_BY_ID.giscard.hp,
    keywords: ['retour'], effects: CARD_BY_ID.giscard.effects,
  });
  assert.deepEqual(cardFace({ id: 'x', name: 'X', camp: 'rn', tier: 1, atk: 1, hp: 2 }).keywords, []);
});

test('casseroleFromCard : la mécanique de la carte, sans fait ni statut', () => {
  const card = shownCasserole(CASSEROLE_BY_ID.karcher);
  const whole = casseroleFromCard(card);
  assert.equal(whole.fait, '');
  assert.equal(whole.statut, '');
  assert.equal(whole.name, CASSEROLE_BY_ID.karcher.name);
  assert.deepEqual(whole.keywords, CASSEROLE_BY_ID.karcher.keywords);
});

test('patchNoteSections : les nouveaux à part des retouchés, chacun avec son pourquoi', () => {
  const sections = patchNoteSections(latest);
  assert.deepEqual(sections.newCards.map((c) => c.key).sort(), ['barnier', 'borne', 'bove', 'hassan', 'joly', 'juppe']);
  assert.ok(sections.changedCards.some((c) => c.key === 'berge' && c.before && !c.after), 'un politique retiré : avant seulement');
  assert.ok(sections.changedCards.every((c) => c.before && c.why));
  assert.ok(sections.changedCards.some((c) => c.key === 'giscard'));
  assert.equal(sections.newCasseroles.length + sections.changedCasseroles.length, latest.cards.casseroles.length);
  assert.ok(sections.newCasseroles.every((c) => !c.before && c.after?.kind === 'casserole'));
  assert.deepEqual(sections.newSpells.map((s) => s.key).sort(), ['a_la_une', 'fuite_dans_la_presse', 'grand_menage']);
  assert.ok(sections.changedSpells.some((s) => s.key === 'tribune_libre' && s.before && !s.after), 'un sort retiré : avant seulement');
});

test('tierChangeLine : un changement d\'échelon se lit en clair, rien sinon', () => {
  assert.equal(tierChangeLine({ tier: 3 }, { tier: 2 }), 'Échelon 3 → 2');
  assert.equal(tierChangeLine({ tier: 4 }, { tier: 4 }), undefined);
  assert.equal(tierChangeLine(undefined, { tier: 2 }), undefined);
  assert.equal(tierChangeLine({ tier: 2 }, undefined), undefined);
  const censure = patchNoteSections(latest).changedSpells.find((s) => s.key === 'motion_de_censure');
  assert.equal(censure?.why, 'Échelon 3 → 2');
});
