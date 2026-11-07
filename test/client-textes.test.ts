import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSameRecipient } from '../src/client/tools/mergeSameRecipient.ts';
import { describeSpell, cardRuleLines } from '../src/client/tools/describeEffect.ts';
import { casseroleDefects } from '../src/client/tools/casseroleDefects.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { CASSEROLES, CASSEROLE_BY_ID } from '../src/data/casseroles.ts';
import { SPELL_BY_ID } from '../src/data/sorts.ts';

// Les textes de la re-spécification du 7 novembre 2026.

test('mergeSameRecipient names the recipient once when two gifts go to the same one', () => {
  assert.deepEqual(mergeSameRecipient(['donne **Porte-parole** à un politique', 'donne +0/+2 à un politique']), ['donne **Porte-parole** et +0/+2 à un politique']);
  assert.deepEqual(mergeSameRecipient(['donne +1/+1 à un politique', 'gagnez 2 budget']), ['donne +1/+1 à un politique', 'gagnez 2 budget']);
  assert.deepEqual(mergeSameRecipient(['donne +1/+1 à un politique', 'donne +1/+1 à vos politiques']), ['donne +1/+1 à un politique', 'donne +1/+1 à vos politiques']);
  assert.deepEqual(mergeSameRecipient([]), []);
});

test('a spell never names the same recipient twice', () => {
  assert.equal(describeSpell(SPELL_BY_ID.elements_de_langage), 'Donne **Porte-parole** et +0/+2 à un politique.');
  for (const spell of Object.values(SPELL_BY_ID)) assert.doesNotMatch(describeSpell(spell), /(à un politique).*\1/, spell.id);
});

test('the legends say what they double', () => {
  assert.deepEqual(cardRuleLines(CARD_BY_ID.cohn_bendit), ['**Fin de tour** : doublez les stats de ses voisins.']);
  assert.deepEqual(cardRuleLines(CARD_BY_ID.hollande), ['**Héritage** : doublez les stats de vos autres Socialistes pour de bon.']);
  assert.match(cardRuleLines(CARD_BY_ID.melenchon).join(' '), /vos \*\*Tracts\*\* donnent le double pour le reste de la partie/);
  assert.match(cardRuleLines(CARD_BY_ID.zemmour).join(' '), /gagne \+1\/\+1 par actualisation faite cette partie/);
  assert.match(cardRuleLines(CARD_BY_ID.schiappa).join(' '), /^\*\*Ni droite ni gauche\*\*\. \*\*Vedette\*\*\. Tous les deux sorts que vous lancez, gagne \+1\/\+1\./);
  assert.match(cardRuleLines(CARD_BY_ID.giscard).join(' '), /invoque une Chaise vide \*\*Porte-parole\*\* qui a ses PV/);
});

test('every casserole but the two that make people forget has a défaut, said in the words of the cards', () => {
  const withoutDefect = CASSEROLES.filter((c) => casseroleDefects(c).length === 0).map((c) => c.id);
  assert.deepEqual(withoutDefect.sort(), ['quatorze_heures', 'quel_facebook']);
  assert.deepEqual(casseroleDefects(CASSEROLE_BY_ID.benalla), ['-2 sondages par manche']);
  assert.deepEqual(casseroleDefects(CASSEROLE_BY_ID.arbre_mort), ['ne bouge plus', 'n\'attaque plus']);
});
