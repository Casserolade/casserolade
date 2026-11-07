import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createGame, startRound } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { resolveCombat } from '../src/engine/combat.ts';
import { invariantViolations } from '../src/engine/invariants.ts';
import { addMinionToHand, addSpellToHand, doubleStats, endOfTurn, take } from '../src/engine/recruit.ts';
import { MAX_STAT, makeMinion } from '../src/engine/minion.ts';
import { createRng } from '../src/engine/rng.ts';
import { CARD_BY_ID, TOKENS } from '../src/data/cards.ts';
import { CASSEROLE_BY_ID } from '../src/data/casseroles.ts';
import { PARAMS } from '../src/data/params.ts';
import type { Camp, CombatEvent, Effect, Keyword, Minion } from '../src/engine/types.ts';

/**
 * La re-spécification du 7 novembre 2026 : des règles qui se lisent comme on les joue (R16 à R18), et des mécaniques
 * plus explosives. Chaque test réduit une règle à sa plus petite partie.
 */

let uid = 1;
function unit(atk: number, hp: number, keywords: Keyword[] = [], effects: Effect[] = []): Minion {
  return { ...makeMinion({ id: 'test', name: 'Test', camp: 'civile', tier: 1, atk, hp, keywords }, uid++), keywords, effects };
}

function fight(a: Minion[], b: Minion[], seed = 1) {
  return resolveCombat(
    { minions: a, mods: {}, hp: 30 },
    { minions: b, mods: {}, hp: 30 },
    { params: PARAMS, ctx: null, rng: createRng(seed), log: true },
  );
}

function attacks(log: CombatEvent[]): Extract<CombatEvent, { e: 'attaque' }>[] {
  return log.filter((e): e is Extract<CombatEvent, { e: 'attaque' }> => e.e === 'attaque');
}

// R16 : la Polémique se perd au premier coup qui blesse.

test('R16 : une Polémique qui tue par ses dégâts se perd quand même', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const venom = unit(5, 100, ['polemique']);
    const r = fight([venom], [unit(1, 3, ['porte_parole']), unit(1, 30)], seed);
    assert.ok(r.log.some((e) => e.e === 'mot_cle' && e.uid === venom.uid && e.keyword === 'polemique' && !e.gain), `graine ${seed} : la Polémique tombe`);
    assert.equal(r.log.filter((e) => e.e === 'polemique').length, 0, `graine ${seed} : le second ennemi n'est pas tué d'un coup`);
  }
});

test('R16 : une Immunité qui pare le coup laisse la Polémique', () => {
  const venom = unit(2, 100, ['polemique']);
  const shielded = unit(1, 50, ['immunite', 'porte_parole']);
  const r = fight([venom, unit(1, 100)], [shielded], 3);
  const kill = r.log.findIndex((e) => e.e === 'polemique' && e.uid === shielded.uid);
  assert.ok(kill > 0, 'le coup d\'après tue, la Polémique était restée');
});

// R17 : revenu, il compte comme neuf.

test('R17 : un attaquant tombé puis revenu attaque de nouveau au tour suivant de son camp', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const phoenix = unit(3, 1, ['retour']);
    const wall = unit(1, 50, ['porte_parole']);
    const foe = unit(1, 200);
    const r = fight([phoenix, wall], [foe], seed);
    const back = r.log.findIndex((e) => e.e === 'retour' && e.uid === phoenix.uid);
    assert.ok(back > 0, `graine ${seed} : il revient`);
    const nextOurs = attacks(r.log.slice(back)).find((e) => e.from !== foe.uid);
    assert.equal(nextOurs?.from, phoenix.uid, `graine ${seed} : le revenant, le plus à gauche, attaque avant le Porte-parole`);
  }
});

test('R17 : tombé pendant son Cumul des mandats, son second coup est perdu', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const phoenix = unit(3, 1, ['retour', 'cumul']);
    const foe = unit(1, 200);
    const r = fight([phoenix, unit(1, 50, ['porte_parole'])], [foe], seed);
    const back = r.log.findIndex((e) => e.e === 'retour' && e.uid === phoenix.uid);
    const next = attacks(r.log.slice(back))[0];
    assert.equal(next?.from, foe.uid, `graine ${seed} : c'est à l'adversaire de jouer`);
  }
});

// R18 : les relances suivent les multiplicateurs.

const CAMPS: Camp[] = ['ecologistes', 'macronie', 'republicains', 'socialistes', 'reconquete'];

function table(camps: Camp[] = CAMPS, seed = 7): Game {
  const game = createGame({ seed, seats: 2, heroes: ['philippe', 'philippe'], activeCamps: camps });
  game.players[0].budget = 500;
  return game;
}

function lay(game: Game, cardId: string): Minion {
  assert.ok(take(game, cardId), `${cardId} en réserve`);
  const m = addMinionToHand(game, game.players[0], cardId) as Minion;
  const played = applyAction(game, 0, { t: 'play', uid: m.uid });
  assert.equal(played.ok, true, `${cardId} posé : ${played.ok ? '' : played.error}`);
  return game.players[0].board.find((x) => x.uid === m.uid) ?? m;
}

function cast(game: Game, spellId: string, target?: Minion): void {
  const p = game.players[0];
  addSpellToHand(game, p, spellId);
  const held = p.spells.find((s) => s.spellId === spellId) as { uid: number };
  const r = applyAction(game, 0, { t: 'cast', uid: held.uid, ...(target ? { target: target.uid } : {}) });
  assert.equal(r.ok, true, `${spellId} lancé : ${r.ok ? '' : r.error}`);
}

test('R18 : avec Lassalle, Conseil des ministres joue chaque Fin de tour deux fois', () => {
  const game = table();
  const kazib = lay(game, 'kazib');
  lay(game, 'piolle');
  lay(game, 'lassalle');
  const before = [kazib.atk, kazib.hp];
  cast(game, 'conseil_des_ministres');
  assert.deepEqual([kazib.atk - before[0], kazib.hp - before[1]], [2, 2], 'la Fin de tour de Piolle, relancée deux fois');
});

test('R18 : avec Mitterrand, Tribune libre rejoue l\'Héritage deux fois', () => {
  const game = table(['socialistes', 'macronie', 'republicains', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  const bouamrane = lay(game, 'bouamrane');
  lay(game, 'mitterrand');
  const before = p.board.length;
  cast(game, 'tribune_libre', bouamrane);
  assert.equal(p.board.length - before, 2, 'deux Suppléants');
});

test('R18 : en combat, Glucksmann relance les Héritages deux fois quand Mitterrand vit', () => {
  const unitOf = (id: string) => makeMinion(CARD_BY_ID[id], uid++);
  const count = (withMitterrand: boolean) => {
    const ours = [unitOf('glucksmann'), unitOf('bouamrane'), withMitterrand ? unitOf('mitterrand') : unitOf('kazib')];
    const r = fight(ours, [unit(1, 500)], 5);
    const firstDeath = r.log.findIndex((e) => e.e === 'mort');
    const upTo = firstDeath < 0 ? r.log : r.log.slice(0, firstDeath);
    return upTo.filter((e) => e.e === 'invocation' && e.side === 0).length;
  };
  assert.equal(count(false), 1);
  assert.equal(count(true), 2);
});

// Doublez : les clés de voûte des légendes (section 3 et 4 de la re-spécification).

function startTable(camps: Camp[], seed = 7): Game {
  const game = table(camps, seed);
  game.players[0].tier = 6;
  return game;
}

test('Cohn-Bendit : à la Fin de tour, ses voisins doublent', () => {
  const game = startTable(['ecologistes', 'macronie', 'republicains', 'socialistes', 'reconquete']);
  const p = game.players[0];
  const left = lay(game, 'kazib');
  lay(game, 'cohn_bendit');
  const right = lay(game, 'cheminade');
  const far = lay(game, 'gueant');
  const before = [left.atk, left.hp, right.atk, right.hp];
  const farBefore = [far.atk, far.hp];
  endOfTurn(game, p);
  assert.deepEqual([left.atk, left.hp, right.atk, right.hp], before.map((v) => v * 2));
  assert.deepEqual([far.atk, far.hp], farBefore, 'ses voisins seulement');
});

test('Mélenchon : à la Fin de tour, vos Tracts donnent le double, puis un Tract sur chaque Insoumis', () => {
  const game = startTable(['insoumis', 'macronie', 'republicains', 'socialistes', 'reconquete']);
  const p = game.players[0];
  const leaument = lay(game, 'leaument');
  lay(game, 'melenchon');
  const before = leaument.atk;
  endOfTurn(game, p);
  assert.deepEqual(p.tract, { atk: 2, hp: 2 });
  assert.equal(leaument.atk, before + 2, 'le Tract joué ensuite donne déjà le double');
});

test('Hollande : sacrifié au recrutement, ses autres Socialistes doublent', () => {
  const game = startTable(['socialistes', 'macronie', 'republicains', 'ecologistes', 'reconquete']);
  const thevenoud = lay(game, 'thevenoud');
  const kazib = lay(game, 'kazib');
  const hollande = lay(game, 'hollande');
  const before = [thevenoud.atk, thevenoud.hp, kazib.atk];
  cast(game, 'primaire', hollande);
  assert.deepEqual([thevenoud.atk, thevenoud.hp], [before[0] * 2, before[1] * 2]);
  assert.equal(kazib.atk, before[2], 'la Société civile ne double pas');
});

test('Hollande : mort au combat, ses Socialistes doublent tout de suite, et pour de bon', () => {
  const hollande = makeMinion(CARD_BY_ID.hollande, uid++);
  const valls = makeMinion(CARD_BY_ID.valls, uid++);
  const r = fight([{ ...hollande, hp: 1, keywords: ['porte_parole'] }, valls], [unit(5, 100)], 2);
  assert.deepEqual(r.persist[0].doubles, [valls.uid]);
});

test('Macron : chaque Ralliement double son hôte', () => {
  const game = startTable(['macronie', 'socialistes', 'republicains', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  lay(game, 'macron');
  const host = lay(game, 'kazib');
  assert.ok(take(game, 'castaner'));
  const rally = addMinionToHand(game, p, 'castaner') as Minion;
  const expected = [(host.atk + rally.atk) * 2, (host.hp + rally.hp) * 2];
  assert.equal(applyAction(game, 0, { t: 'play', uid: rally.uid, onto: host.uid }).ok, true);
  assert.deepEqual([host.atk, host.hp], expected);
});

test('Sarkozy : un allié qui reçoit une casserole double, avantage compris', () => {
  const game = startTable(['republicains', 'macronie', 'socialistes', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  lay(game, 'sarkozy');
  const kazib = lay(game, 'kazib');
  const homards = CASSEROLE_BY_ID.homards;
  const expected = [(kazib.atk + (homards.atk ?? 0)) * 2, (kazib.hp + (homards.hp ?? 0)) * 2];
  p.casseroleOffer = 'homards';
  assert.equal(applyAction(game, 0, { t: 'buy_casserole' }).ok, true);
  const held = p.spells.find((s) => s.casseroleId === 'homards') as { uid: number };
  assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: kazib.uid }).ok, true);
  assert.deepEqual([kazib.atk, kazib.hp], expected);
});

test('Marine Le Pen : chaque débauché donne ses stats à tout le RN, pour la partie', () => {
  const game = startTable(['rn', 'macronie', 'republicains', 'socialistes', 'reconquete']);
  const p = game.players[0];
  lay(game, 'lepen');
  const mariani = lay(game, 'odoul');
  p.shop = ['chirac'];
  const chirac = CARD_BY_ID.chirac;
  const before = [mariani.atk, mariani.hp];
  lay(game, 'houssin');
  assert.deepEqual([mariani.atk, mariani.hp], [before[0] + chirac.atk, before[1] + chirac.hp]);
  assert.ok(p.campBuffs.some((g) => g.camp === 'rn' && g.atk === chirac.atk && g.hp === chirac.hp), 'pour la partie : ceux à venir aussi');
});

test('Zemmour grandit au carré : +1/+1 par actualisation faite cette partie', () => {
  const game = startTable(['reconquete', 'macronie', 'republicains', 'socialistes', 'ecologistes']);
  const p = game.players[0];
  const zemmour = lay(game, 'zemmour');
  const before = zemmour.atk;
  for (let i = 0; i < 3; i++) assert.equal(applyAction(game, 0, { t: 'roll' }).ok, true);
  const rolls = p.counters.actualisations;
  assert.equal(zemmour.atk - before, rolls * (rolls + 1) / 2 - (rolls - 3) * (rolls - 2) / 2, '1 + 2 + 3 pour trois actualisations de suite');
});

test('Giscard : sa Chaise vide tient ses PV', () => {
  const giscard = { ...makeMinion(CARD_BY_ID.giscard, uid++), keywords: [], atk: 1, hp: 1 } as Minion;
  const r = fight([{ ...giscard, hp: 1 }, unit(1, 100)], [unit(3, 100, ['porte_parole'])], 4);
  const chair = r.log.find((e) => e.e === 'invocation' && e.unit.cardId === 'chaise_vide');
  assert.ok(chair && chair.e === 'invocation');
  assert.ok(r.log.some((e) => e.e === 'stats' && e.uid === chair.unit.uid && e.hp >= TOKENS.chaise_vide.hp), 'au moins ses PV de jeton');
});

test('Schiappa grandit tous les deux sorts', () => {
  const game = startTable(['macronie', 'insoumis', 'republicains', 'socialistes', 'reconquete']);
  const schiappa = lay(game, 'schiappa');
  const kazib = lay(game, 'kazib');
  const before = schiappa.atk;
  cast(game, 'tract', kazib);
  assert.equal(schiappa.atk, before, 'un sort : rien');
  cast(game, 'tract', kazib);
  assert.equal(schiappa.atk, before + 1, 'deux sorts : +1/+1');
});

// Le débauchage et les casseroles.

test('le débauché est remplacé en boutique', () => {
  const game = startTable(['rn', 'macronie', 'republicains', 'socialistes', 'reconquete']);
  const p = game.players[0];
  const size = p.shop.length;
  assert.ok(size > 0);
  lay(game, 'houssin');
  assert.equal(p.shop.length, size);
});

test('une casserole qui coûte des sondages les prend à chaque manche du scandale, jamais sous 1', () => {
  const game = table(['macronie', 'republicains', 'socialistes', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  const kazib = lay(game, 'kazib');
  for (const id of ['benalla', 'homards']) {
    p.casseroleOffer = id;
    assert.equal(applyAction(game, 0, { t: 'buy_casserole' }).ok, true);
    const held = p.spells.find((s) => s.casseroleId === id) as { uid: number };
    assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: kazib.uid }).ok, true);
  }
  assert.equal(kazib.scandal?.polls, CASSEROLE_BY_ID.benalla.pollsPerRound);
  p.hp = 3;
  startRound(game);
  assert.equal(p.hp, 1);
  assert.deepEqual(invariantViolations(game), []);
});

test('une casserole qui fait taire l\'attaque : en scandale, il n\'attaque plus, puis attaque de nouveau après l\'oubli', () => {
  const game = table(['macronie', 'republicains', 'socialistes', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  const kazib = lay(game, 'kazib');
  for (const id of ['costumes', 'homards']) {
    p.casseroleOffer = id;
    assert.equal(applyAction(game, 0, { t: 'buy_casserole' }).ok, true);
    const held = p.spells.find((s) => s.casseroleId === id) as { uid: number };
    assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: kazib.uid }).ok, true);
  }
  assert.equal(kazib.noAttack, true);
  assert.deepEqual(invariantViolations(game), []);
  for (let i = 0; i < 2; i++) startRound(game);
  assert.equal(kazib.scandal, undefined);
  assert.equal(kazib.noAttack, false);
});

test('les stats plafonnent à un milliard', () => {
  const m = unit(MAX_STAT - 1, MAX_STAT - 1);
  doubleStats(m, 3);
  assert.deepEqual([m.atk, m.hp], [MAX_STAT, MAX_STAT]);
});
