import test from 'node:test';
import assert from 'node:assert/strict';
import { createBot, decide } from '../src/bots/bots.ts';
import type { BotLevel } from '../src/bots/bots.ts';
import { keywordFit } from '../src/bots/keywordFit.ts';
import { rallyHost } from '../src/bots/rallyHost.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { applyAction, createGame, viewFor } from '../src/engine/game.ts';
import { makeMinion, makeToken } from '../src/engine/minion.ts';
import { addMinionToHand, take } from '../src/engine/recruit.ts';
import type { Keyword, Minion } from '../src/engine/types.ts';

let nextUid = 1;
/** Un politique sur un plateau d'essai, à ces stats, avec ces mots-clés en plus de ceux de sa carte. */
function unit(cardId: string, atk: number, hp: number, extra: Keyword[] = []): Minion {
  const m = makeMinion(CARD_BY_ID[cardId], nextUid++);
  return { ...m, atk, hp, keywords: [...new Set([...m.keywords, ...extra])] };
}

test('keywordFit : rien pour un mot-clé déjà là, et la Polémique vaut plus sur une petite attaque', () => {
  const giant = unit('kazib', 40, 40);
  const small = unit('kazib', 3, 3);
  assert.equal(keywordFit('polemique', unit('kazib', 3, 3, ['polemique'])), 0);
  assert.ok(keywordFit('polemique', small) > keywordFit('polemique', giant));
  assert.ok(keywordFit('polemique', unit('kazib', 3, 10, ['porte_parole'])) > keywordFit('polemique', small), 'l\'ennemi doit frapper le Porte-parole');
  assert.ok(keywordFit('immunite', giant) > keywordFit('immunite', small), 'l\'Immunité protège le plus gros');
  assert.ok(keywordFit('cumul', giant) > keywordFit('cumul', small), 'le Cumul double la plus grosse attaque');
});

test('rallyHost : Peltier donne sa Polémique à un Porte-parole, pas au plus gros ; jamais deux fois au même, sauf plateau plein sans autre cible', () => {
  const giant = unit('kazib', 40, 40);
  const guard = unit('delogu', 2, 10);
  const small = unit('cheminade', 3, 3);
  const peltier = unit('peltier', 7, 8);
  assert.equal(rallyHost([giant, guard, small], peltier, true), guard);
  assert.equal(rallyHost([giant, guard, small], peltier, false), guard);
  const armed = { ...guard, keywords: [...guard.keywords, 'polemique' as const] };
  assert.equal(rallyHost([giant, armed, small], peltier, true), small, 'le Porte-parole l\'a déjà : au suivant');
  const all = [giant, armed, small].map((m) => ({ ...m, keywords: [...new Set([...m.keywords, 'polemique' as const])] }));
  assert.equal(rallyHost(all, peltier, true), all[0], 'tout le monde l\'a et le plateau est plein : il ne reste que ses stats, au plus gros');
  assert.equal(rallyHost(all, peltier, false), null, 'tout le monde l\'a et il reste une place : il se pose');
  assert.equal(rallyHost(all, unit('lemaire', 1, 3), false), all[0], 'un Ralliement sans mot-clé à donner rejoint le plus gros');
});

test('rallyHost : le Cumul va à la plus grosse attaque, l\'Immunité au plus gros, jamais à un jeton', () => {
  const giant = unit('kazib', 30, 12);
  const wall = unit('cheminade', 4, 50);
  const token = { ...makeToken('electeur_fantome', 'republicains', nextUid++), atk: 60, hp: 60 };
  assert.equal(rallyHost([wall, giant, token], unit('castaner', 3, 4), true), giant);
  assert.equal(rallyHost([giant, wall, token], unit('dupond_moretti', 1, 2), true), wall);
  assert.equal(rallyHost([token], unit('castaner', 3, 4), true), null);
});

test('rallyHost : avec Bayrou ou Macron, qui comptent les Ralliements reçus, ils s\'empilent sur le même hôte', () => {
  const host = { ...unit('kazib', 5, 5, ['polemique']), rallied: ['castaner', 'lemaire'] };
  const guard = unit('delogu', 2, 10);
  const bayrou = unit('bayrou', 6, 8);
  assert.equal(rallyHost([guard, host, bayrou], unit('peltier', 7, 8), true), host, 'même si la Polémique y est déjà : c\'est le nombre de Ralliements qui paie');
  assert.equal(rallyHost([guard, host], unit('peltier', 7, 8), true), guard, 'sans eux, le mot-clé décide');
});

/** Un plateau plein et Peltier en main : où le bot de ce niveau le rallie. */
function peltierHost(level: BotLevel): { host: Minion | undefined; giant: Minion; guard: Minion } {
  const game = createGame({ seed: 21, seats: 2, heroes: ['philippe', 'philippe'], activeCamps: ['reconquete', 'insoumis', 'republicains', 'socialistes', 'rn'] });
  const p = game.players[0];
  p.tier = 4;
  p.budget = 60;
  const lay = (id: string) => {
    assert.ok(take(game, id));
    const m = addMinionToHand(game, p, id) as Minion;
    assert.equal(applyAction(game, 0, { t: 'play', uid: m.uid }).ok, true, id);
    return p.board.find((x) => x.uid === m.uid) as Minion;
  };
  const giant = lay('kazib');
  const guard = lay('delogu');
  for (const id of ['boyard', 'portes', 'leaument', 'trouve', 'coquerel']) lay(id);
  giant.atk = 40;
  giant.hp = 40;
  assert.equal(p.board.length, 7, 'plateau plein');
  p.spells = [];
  p.shop = [];
  p.shopSpells = [];
  p.casseroleOffer = null;
  p.budget = 0;
  assert.ok(take(game, 'peltier'));
  const peltier = addMinionToHand(game, p, 'peltier') as Minion;
  const bot = createBot(level, 5);
  for (let n = 0; n < 20; n++) {
    const action = decide(viewFor(game, 0), bot);
    if (!action) break;
    assert.equal(applyAction(game, 0, action).ok, true, JSON.stringify(action));
    if (action.t === 'play' && action.uid === peltier.uid) return { host: p.board.find((m) => m.uid === action.onto), giant, guard };
  }
  return { host: undefined, giant, guard };
}

test('difficile : plateau plein, il rallie Peltier sur son Porte-parole, pas sur son plus gros politique', () => {
  const { host, guard } = peltierHost('difficile');
  assert.equal(host, guard);
  assert.ok(guard.keywords.includes('polemique') && guard.keywords.includes('porte_parole'));
});

test('moyen : il rallie toujours sur le plus gros (la mesure d\'équilibrage ne change pas)', () => {
  const { host, giant } = peltierHost('moyen');
  assert.equal(host, giant);
});

test('difficile : s\'il reste une place et que tous ont déjà la Polémique, il pose Peltier au lieu de la donner deux fois', () => {
  const game = createGame({ seed: 22, seats: 2, heroes: ['philippe', 'philippe'], activeCamps: ['reconquete', 'insoumis', 'republicains', 'socialistes', 'rn'] });
  const p = game.players[0];
  p.tier = 4;
  p.budget = 60;
  for (const id of ['kazib', 'delogu', 'boyard']) {
    assert.ok(take(game, id));
    const m = addMinionToHand(game, p, id) as Minion;
    assert.equal(applyAction(game, 0, { t: 'play', uid: m.uid }).ok, true, id);
  }
  for (const m of p.board) m.keywords = [...m.keywords, 'polemique'];
  p.spells = [];
  p.shop = [];
  p.shopSpells = [];
  p.casseroleOffer = null;
  p.budget = 0;
  assert.ok(take(game, 'peltier'));
  const peltier = addMinionToHand(game, p, 'peltier') as Minion;
  const bot = createBot('difficile', 5);
  for (let n = 0; n < 20; n++) {
    const action = decide(viewFor(game, 0), bot);
    if (!action) break;
    assert.equal(applyAction(game, 0, action).ok, true, JSON.stringify(action));
    if (action.t === 'play' && action.uid === peltier.uid) {
      assert.equal(action.onto, undefined, 'posé, pas rallié');
      assert.ok(p.board.some((m) => m.uid === peltier.uid));
      return;
    }
  }
  assert.fail('Peltier n\'a pas été joué');
});
