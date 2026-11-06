import { test } from 'node:test';
import assert from 'node:assert/strict';
import { casseroleDefects } from '../src/client/tools/casseroleDefects.ts';
import { casseroleFlowLine } from '../src/client/tools/casseroleFlowLine.ts';
import { describeCasserole } from '../src/client/tools/describeCasserole.ts';
import { cardRuleLines } from '../src/client/tools/describeEffect.ts';
import { fittedRulesSize } from '../src/client/tools/fittedRulesSize.ts';
import { glossaryFor } from '../src/client/tools/glossaryFor.ts';
import { pointedCasseroleIndex } from '../src/client/tools/pointedCasseroleIndex.ts';
import { boldTerms } from '../src/client/tools/richText.ts';
import { wornCasserole } from '../src/client/tools/wornCasserole.ts';
import { wornCasseroleLines } from '../src/client/tools/wornCasseroleLines.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { CASSEROLE_BY_ID, CASSEROLES } from '../src/data/casseroles.ts';
import { makeMinion } from '../src/engine/minion.ts';
import type { Minion } from '../src/engine/types.ts';

/**
 * A casserole pointed under a medallion shows its own card, and beside it what it does now on this politician
 * (6 November 2026: on the full card, three casseroles were three names, their effects nowhere to read).
 */

function wearer(extra: Partial<Minion>): Minion {
  return { ...makeMinion(CARD_BY_ID.schiappa, 1), ...extra };
}

/** A stand-in for the element under the pointer: only what pointedCasseroleIndex reads of it. */
function under(index: string | null): EventTarget {
  const pan = index === null ? null : { getAttribute: (name: string) => (name === 'data-casserole-index' ? index : null) };
  return { closest: (selector: string) => (selector === '[data-casserole-index]' ? pan : null) } as unknown as EventTarget;
}

test('pointedCasseroleIndex reads which pan is pointed, and nothing elsewhere on the medallion', () => {
  assert.equal(pointedCasseroleIndex(under('2')), 2);
  assert.equal(pointedCasseroleIndex(under('0')), 0);
  assert.equal(pointedCasseroleIndex(under(null)), null);
  assert.equal(pointedCasseroleIndex(under('abc')), null);
  assert.equal(pointedCasseroleIndex(null), null);
});

test('wornCasserole: the first oublie ones are forgotten, the others asleep or in the scandal, owner bonus kept', () => {
  const minion = wearer({ casseroles: ['playboy', 'fonds_marianne', 'bygmalion'], oublie: 1, ownerCasseroles: ['playboy', 'fonds_marianne'] });
  assert.deepEqual(wornCasserole(minion, 0, 6), { state: 'forgotten', scandalLeft: 0, owned: true });
  assert.deepEqual(wornCasserole(minion, 2, 6), { state: 'dormant', scandalLeft: 0, owned: false });
  const inScandal = { ...minion, scandal: { until: 8, budget: 0, hpLoss: 0, locked: false, silenced: null } };
  assert.deepEqual(wornCasserole(inScandal, 1, 6), { state: 'scandal', scandalLeft: 2, owned: true });
  assert.deepEqual(wornCasserole(inScandal, 0, 6).state, 'forgotten', 'forgotten stays forgotten during a new scandal');
});

test('wornCasseroleLines says what its défaut does now, and whether the owner bonus on the card was given', () => {
  const locked = CASSEROLE_BY_ID.mandat_depot;
  assert.ok(casseroleDefects(locked).length > 0);
  const owner = CARD_BY_ID[locked.owner].name;
  assert.deepEqual(wornCasseroleLines(locked, { state: 'dormant', scandalLeft: 0, owned: true }), [
    'Son défaut dort : il ne joue qu\'en **Scandale**.',
    `Posée sur ${owner} : le bonus en plus est acquis.`,
  ]);
  assert.deepEqual(wornCasseroleLines(locked, { state: 'scandal', scandalLeft: 2, owned: false }), [
    'En **Scandale** : son défaut joue encore 2 manches.',
    `Pas posée sur ${owner} : pas de bonus en plus.`,
  ]);
  assert.match(wornCasseroleLines(locked, { state: 'scandal', scandalLeft: 1, owned: false })[0], /encore une manche\.$/);
  assert.match(wornCasseroleLines(locked, { state: 'forgotten', scandalLeft: 0, owned: false })[0], /ne jouera plus, son avantage reste/);
  const harmless = CASSEROLE_BY_ID.playboy;
  assert.deepEqual(casseroleDefects(harmless), []);
  assert.equal(wornCasseroleLines(harmless, { state: 'dormant', scandalLeft: 0, owned: true })[0], 'Sans défaut, mais elle compte pour le **Scandale**.');
  assert.equal(wornCasseroleLines(harmless, { state: 'scandal', scandalLeft: 2, owned: true })[0], 'Sans défaut : le **Scandale** en cours ne lui coûte rien.');
});

test('every casserole has its state and owner lines, with every bold word explained', () => {
  for (const casserole of CASSEROLES) {
    for (const state of ['dormant', 'scandal', 'forgotten'] as const) {
      const lines = wornCasseroleLines(casserole, { state, scandalLeft: 2, owned: true });
      assert.equal(lines.length, 2, `${casserole.id} ${state}`);
      assert.equal(glossaryFor(lines).length, new Set(boldTerms(lines)).size, `${casserole.id} ${state}`);
    }
  }
});

test('describeCasserole prints the défauts casseroleDefects lists, after « Scandale »', () => {
  for (const casserole of CASSEROLES) {
    const defects = casseroleDefects(casserole);
    const line = describeCasserole(casserole).find((text) => text.startsWith('**Scandale** :'));
    assert.equal(line, defects.length > 0 ? `**Scandale** : ${defects.join(', ')}` : undefined, casserole.id);
  }
});

test('a golden politician with four keywords and three casseroles fits its card, casseroles flowing on two rows', () => {
  assert.equal(casseroleFlowLine(['Une ministre libre', 'Fonds Marianne']), '·· Une ministre libre  ·· Fonds Marianne');
  const schiappa = { ...CARD_BY_ID.schiappa, keywords: ['ni_droite_ni_gauche', 'vedette', 'retour', 'porte_parole'] as Minion['keywords'] };
  const lines = cardRuleLines(schiappa, { isGolden: true });
  const names = ['playboy', 'fonds_marianne', 'bygmalion'].map((id) => CASSEROLE_BY_ID[id].name);
  const size = fittedRulesSize([...lines, casseroleFlowLine(names)]);
  assert.ok(size >= 16 && size < 20, `taille ${size}`);
});
