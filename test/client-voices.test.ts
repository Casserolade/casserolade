import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterCombatSpeaker, HOST_CHANCE } from '../src/client/tools/afterCombatSpeaker.ts';
import { drainSteps } from '../src/client/tools/drainSteps.ts';
import { boldGlossaryTerms, glossaryFor } from '../src/client/tools/glossaryFor.ts';
import { combatLayout } from '../src/client/tools/combatLayout.ts';
import { boldTerms } from '../src/client/tools/richText.ts';
import { MEDALLION_LAYOUT } from '../src/client/const/medallionLayout.ts';
import { claimSpeech, claimVoice, createMixerState } from '../src/client/tools/soundMixer.ts';
import { HEROES } from '../src/data/heroes.ts';
import { VOIX } from '../src/data/voix.ts';

// Une seule voix après un combat.

test('après un combat, une seule voix : le politique qui célèbre fait taire le héros, l\'animateur parle de temps en temps', () => {
  const quiet = HOST_CHANCE + 0.01;
  assert.equal(afterCombatSpeaker({ minionSpoke: true, rivalLine: 'Ça va mieux.', hostLine: 'Une image forte.', roll: quiet }), null);
  assert.equal(afterCombatSpeaker({ minionSpoke: false, rivalLine: 'Ça va mieux.', hostLine: 'Une image forte.', roll: quiet }), 'rival');
  assert.equal(afterCombatSpeaker({ minionSpoke: false, rivalLine: null, hostLine: 'Une image forte.', roll: quiet }), null, 'l\'animateur ne parle pas à chaque manche');
  assert.equal(afterCombatSpeaker({ minionSpoke: true, rivalLine: 'Ça va mieux.', hostLine: 'Une image forte.', roll: 0 }), 'host');
  assert.equal(afterCombatSpeaker({ minionSpoke: false, rivalLine: 'Ça va mieux.', hostLine: null, roll: 0 }), 'rival');
  // Sur beaucoup de manches, l'animateur parle parfois, jamais toujours.
  const rolls = Array.from({ length: 1000 }, (_, i) => (i * 0.618034) % 1);
  const host = rolls.filter((roll) => afterCombatSpeaker({ minionSpoke: false, rivalLine: 'x', hostLine: 'y', roll }) === 'host').length;
  assert.ok(host > 100 && host < 400, `${host} fois sur 1000`);
});

test('une vraie voix à la fois : la suivante attend que la première ait fini', () => {
  const mixer = createMixerState();
  assert.equal(claimSpeech(mixer, 0, 2500), true);
  assert.equal(claimSpeech(mixer, 1000, 1000), false, 'jamais par-dessus une autre voix');
  assert.equal(claimSpeech(mixer, 2600, 1000), true);
  // Les bruits de la table ne font pas taire une voix : elle passe même quand ils sonnent tous.
  const busy = createMixerState();
  for (let i = 0; i < 12; i++) claimVoice(busy, `bruit-${i}`, 0, 2000);
  assert.equal(claimSpeech(busy, 10, 1500), true);
});

// Les sondages s'égrènent quand on perd.

test('les sondages s\'égrènent un par un, ou par paliers pour une grosse perte, et s\'arrêtent à 0', () => {
  assert.deepEqual(drainSteps(21, 16), [20, 19, 18, 17, 16]);
  assert.deepEqual(drainSteps(3, -4), [2, 1, 0], 'une perte mortelle s\'arrête à 0');
  const big = drainSteps(40, 10);
  assert.ok(big.length <= 12);
  assert.equal(big.at(-1), 10);
  assert.ok(big.every((value, index) => index === 0 || value < big[index - 1]));
  assert.deepEqual(drainSteps(10, 10), []);
  assert.deepEqual(drainSteps(10, 12), []);
});

// Le pouvoir d'un héros s'explique comme une carte.

test('le pouvoir d\'un héros met ses mots-clés en gras, et chacun a son explication', () => {
  assert.equal(boldGlossaryTerms('Votre premier politique a Polémique à chaque combat.'), 'Votre premier politique a **Polémique** à chaque combat.');
  assert.deepEqual(glossaryFor([boldGlossaryTerms('Votre premier politique a Polémique à chaque combat.')]).map((entry) => entry.term), ['Polémique']);
  assert.equal(boldGlossaryTerms('Les échelons coûtent 1 de moins.'), 'Les échelons coûtent 1 de moins.');
  for (const hero of HEROES) {
    const text = boldGlossaryTerms(hero.desc);
    assert.equal(glossaryFor([text]).length, boldTerms([text]).length, hero.id);
  }
});

// Le combat se centre à toutes les proportions d'écran.

test('combatLayout : les deux rangées sont centrées sur la table, à toutes les proportions d\'écran', () => {
  for (const [width, height] of [[1920, 1080], [2000, 931], [2560, 1080], [1280, 1024], [800, 600]]) {
    const layout = combatLayout(width, height, 6, 4);
    const medallion = MEDALLION_LAYOUT.width * layout.scale;
    const center = (row: { x: number }[]) => (row[0].x + (row.at(-1)?.x ?? 0) + medallion) / 2;
    assert.ok(Math.abs(center(layout.enemy) - width / 2) < 1, `${width}×${height} : ennemis centrés`);
    assert.ok(Math.abs(center(layout.own) - width / 2) < 1, `${width}×${height} : les vôtres centrés`);
    assert.ok(layout.enemy[0].y < layout.own[0].y && layout.own[0].y + medallion < height, `${width}×${height} : à l'écran`);
  }
});

// Le lexique : le joueur ne lit jamais « serviteur », mais « politique ».

test('aucun texte affiché ne dit « serviteur » : cartes, dorées comprises, sorts, casseroles, glossaire, héros', async () => {
  const { cardRuleLines } = await import('../src/client/tools/describeEffect.ts');
  const { casseroleCardLines, spellCardLines } = await import('../src/client/tools/spellCardLines.ts');
  const { KEYWORD_RULES, TERM_RULES } = await import('../src/client/const/keywordRules.ts');
  const { CARDS } = await import('../src/data/cards.ts');
  const { CASSEROLES } = await import('../src/data/casseroles.ts');
  const { SPELLS } = await import('../src/data/sorts.ts');
  const texts = [
    ...CARDS.flatMap((card) => [...cardRuleLines(card), ...cardRuleLines(card, { isGolden: true })]),
    ...SPELLS.flatMap((spell) => spellCardLines(spell, { tier: 3, tract: { atk: 1, hp: 1 } })),
    ...CASSEROLES.flatMap((casserole) => casseroleCardLines(casserole)),
    ...Object.values(KEYWORD_RULES).flatMap(({ label, rule }) => [label, rule]),
    ...Object.entries(TERM_RULES).flat(),
    ...HEROES.flatMap((hero) => [hero.name, hero.power, hero.desc]),
  ];
  const glossary = glossaryFor(texts).flatMap((entry) => [entry.term, entry.rule]);
  for (const text of [...texts, ...glossary]) assert.doesNotMatch(text, /serviteur/i, text);
});
