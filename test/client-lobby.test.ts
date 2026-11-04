import test from 'node:test';
import { TUTORIEL } from '../src/data/histoire/tutoriel.ts';
import assert from 'node:assert/strict';
import { buildInviteLink } from '../src/client/tools/buildInviteLink.ts';
import { readInviteCode } from '../src/client/tools/readInviteCode.ts';
import { cardRulesLines } from '../src/client/tools/cardRulesLines.ts';
import { readingDelayMs } from '../src/client/tools/readingDelayMs.ts';
import { rivalLineForCombat } from '../src/client/tools/rivalLineForCombat.ts';
import { pollsBase } from '../src/client/tools/pollsBase.ts';
import { speakerName } from '../src/client/tools/speakerName.ts';
import { splitPolls } from '../src/client/tools/splitPolls.ts';
import { storyLineDelayMs } from '../src/client/tools/storyLineDelayMs.ts';
import { HEROES, HERO_BY_ID } from '../src/data/heroes.ts';
import { CHAPITRES } from '../src/data/histoire/chapitres.ts';
import { PARAMS } from '../src/data/params.ts';
import { CARDS } from '../src/data/cards.ts';
import { REPLIQUES } from '../src/data/repliques.ts';
import type { CombatView } from '../src/engine/game.ts';

function combat(partial: Partial<CombatView>): CombatView {
  return { round: 1, side: 0, opponent: { seat: 2, heroId: 'hollande' }, log: [], winner: 0, damage: [0, 5], endOfTurn: [], ...partial };
}

test('buildInviteLink : le lien ouvre l\'accueil avec le code', () => {
  assert.equal(buildInviteLink('https://exemple.fr', 'ABC234'), 'https://exemple.fr/?salon=ABC234');
});

test('readInviteCode : lit le code, en majuscules, ou rien', () => {
  assert.equal(readInviteCode('?salon=abc234'), 'ABC234');
  assert.equal(readInviteCode('?seed=3'), '');
});

test('rivalLineForCombat : la réplique suit le résultat vu du rival', () => {
  assert.equal(rivalLineForCombat(combat({ winner: 0 }), 20), REPLIQUES.hollande.defaite);
  assert.equal(rivalLineForCombat(combat({ winner: 1 }), 20), REPLIQUES.hollande.victoire);
  assert.equal(rivalLineForCombat(combat({ winner: null }), 20), null);
  assert.equal(rivalLineForCombat(combat({ winner: 0, damage: [0, 20] }), 20), REPLIQUES.hollande.elimine);
});

test('rivalLineForCombat : le fantôme ne dit rien', () => {
  assert.equal(rivalLineForCombat(combat({ opponent: { seat: -1, heroId: 'fantome' } }), null), null);
});

test('speakerName : le narrateur n\'a pas de nom', () => {
  assert.equal(speakerName('narrateur'), null);
  assert.equal(speakerName('hanouna'), 'Cyril Hanouna');
});

test('cardRulesLines : le texte du politique s\'affiche en combat, mots-clés en gras, et aucune carte n\'est vide', () => {
  const villiers = CARDS.find((c) => c.id === 'villiers') as (typeof CARDS)[number];
  const lines = cardRulesLines({ keywords: villiers.keywords ?? [], effects: villiers.effects ?? [], bonus: 2 });
  assert.match(lines[0], /\*\*Vedette\*\*/);
  assert.match(lines[1], /\*\*49\.3\*\* : inflige 2 dégâts à tous les ennemis/);
  assert.equal(lines.at(-1), 'Seul de son camp : +2/+2');
  for (const card of CARDS) {
    const text = cardRulesLines({ keywords: card.keywords ?? [], effects: card.effects ?? [], bonus: 0 });
    assert.ok(text.length > 0, `${card.id} n'a aucun texte`);
  }
});

test('readingDelayMs : assez pour lire, jamais longtemps', () => {
  assert.equal(readingDelayMs('Perdu.'), 2000);
  assert.equal(readingDelayMs('x'.repeat(100)), 4500);
  assert.equal(readingDelayMs('x'.repeat(1000)), 6000);
});

test('storyLineDelayMs : laisse lire le tutoriel, sans dépasser 12 secondes', () => {
  assert.equal(storyLineDelayMs('Court.'), 3000);
  assert.equal(storyLineDelayMs('x'.repeat(186)), 11160);
  assert.equal(storyLineDelayMs('x'.repeat(1000)), 12000);
});

test('le chapitre 1 se lit dans le temps imparti : 45 secondes à la première manche', () => {
  const premiereManche = new Set(['debut', 'premier_achat', 'premiere_pose']);
  const lignes = CHAPITRES[0].dialogues.filter((ligne) => premiereManche.has(ligne.quand));
  const total = lignes.reduce((somme, ligne) => somme + storyLineDelayMs(ligne.texte), 0);
  assert.ok(total <= 35_000, `${total} ms de lecture`);
});

test('le tutoriel enseigne le glisser, sans parler de cliquer', () => {
  for (const etape of TUTORIEL.etapes) assert.doesNotMatch(etape.texte, /cliqu/i, etape.texte);
  assert.ok(TUTORIEL.etapes.some((etape) => /[Gg]lissez/.test(etape.texte)));
});

test('pollsBase : la base commune est le départ du héros le moins doté, à toute échelle', () => {
  const lowest = Math.min(...HEROES.map((hero) => hero.hpBonus));
  assert.equal(pollsBase(PARAMS.startHp), PARAMS.startHp + lowest);
  assert.ok(pollsBase(7) >= 1, 'un chapitre court garde une base');
});

test('splitPolls : aucun héros n\'a de socle négatif, et le total ne change jamais', () => {
  for (const startHp of [PARAMS.startHp, ...CHAPITRES.map((c) => c.regles.startHp ?? PARAMS.startHp)]) {
    for (const hero of Object.values(HERO_BY_ID)) {
      const scaled = Math.round((hero.hpBonus * startHp) / PARAMS.startHp);
      const { polls, electoralBase } = splitPolls(startHp + scaled, startHp);
      assert.ok(electoralBase >= 0, `${hero.id} à ${startHp}`);
      assert.equal(polls + electoralBase, startHp + scaled);
    }
  }
});

test('splitPolls : le socle part en premier, puis les sondages', () => {
  const base = pollsBase(28);
  assert.deepEqual(splitPolls(base + 19, 28), { polls: base, electoralBase: 19 });
  assert.deepEqual(splitPolls(base + 3, 28), { polls: base, electoralBase: 3 });
  assert.deepEqual(splitPolls(base, 28), { polls: base, electoralBase: 0 });
  assert.deepEqual(splitPolls(5, 28), { polls: 5, electoralBase: 0 });
});
