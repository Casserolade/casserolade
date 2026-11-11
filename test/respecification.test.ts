import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createGame, startRound, viewFor } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { resolveCombat } from '../src/engine/combat.ts';
import { invariantViolations } from '../src/engine/invariants.ts';
import { addMinionToHand, addSpellToHand, applyPersist, doubleStats, endOfTurn, take } from '../src/engine/recruit.ts';
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

// Les clés de voûte des légendes : des effets en attaquant et des synergies qui gonflent ; le doublement, avec
// parcimonie (Sarkozy). Sections 3 et 4 de la re-spécification.

function startTable(camps: Camp[], seed = 7): Game {
  const game = table(camps, seed);
  game.players[0].tier = 6;
  return game;
}

test('Cohn-Bendit : à la Fin de tour, vos Écologistes gagnent +1/+1 par Écologiste du plateau', () => {
  const game = startTable(['ecologistes', 'macronie', 'republicains', 'socialistes', 'reconquete']);
  const p = game.players[0];
  const lucas = lay(game, 'lucas');
  lay(game, 'cohn_bendit');
  const kazib = lay(game, 'kazib');
  const before = [lucas.atk, lucas.hp, kazib.atk];
  endOfTurn(game, p);
  assert.deepEqual([lucas.atk, lucas.hp], [before[0] + 2, before[1] + 2], 'deux Écologistes : +2/+2');
  assert.equal(kazib.atk, before[2], 'la Société civile ne pousse pas');
});

test('Mélenchon : vos « Quand il attaque » jouent deux fois, et chacune de ses attaques fait gonfler les Insoumis', () => {
  // Mélenchon ne tombe pas : le multiplicateur ne joue que s'il est vivant.
  const melenchon = { ...makeMinion(CARD_BY_ID.melenchon, uid++), hp: 1000 };
  const leaument = { ...makeMinion(CARD_BY_ID.leaument, uid++), hp: 1000 };
  const guedj = makeMinion(CARD_BY_ID.guedj, uid++);
  const r = fight([melenchon, leaument, guedj], [unit(1, 500)], 3);
  const attacks = r.log.filter((e) => e.e === 'attaque' && e.from === melenchon.uid).length;
  assert.ok(attacks > 0);
  const tracts = r.persist[0].buffs.filter((g) => g.uid === leaument.uid);
  assert.equal(tracts.length, 2 * attacks, 'un Tract pour de bon à chaque Insoumis, deux fois par attaque');
  const guedjAttacks = r.log.filter((e) => e.e === 'attaque' && e.from === guedj.uid).length;
  const guedjGains = r.persist[0].buffs.filter((g) => g.uid === guedj.uid).length;
  assert.equal(guedjGains, 2 * guedjAttacks, 'le « Quand il attaque » de Guedj aussi');
});

test('les Tracts gagnés en combat restent pour la partie', () => {
  const game = startTable(['insoumis', 'macronie', 'republicains', 'socialistes', 'reconquete']);
  const p = game.players[0];
  const before = { ...p.tract };
  applyPersist(game, p, { buffs: [], handBuffs: [], campBuffs: [], cards: [], copies: [], doubles: [], tractBonus: { atk: 4, hp: 4 } });
  assert.deepEqual(p.tract, { atk: before.atk + 4, hp: before.hp + 4 });
});

test('Guedj grandit pour de bon en attaquant, et avec son Retour il attaque de nouveau', () => {
  const guedj = makeMinion(CARD_BY_ID.guedj, uid++);
  const r = fight([{ ...guedj, hp: 1 }, unit(1, 80, ['porte_parole'])], [unit(1, 300)], 6);
  const gains = r.persist[0].buffs.filter((g) => g.uid === guedj.uid);
  assert.ok(gains.length >= 2, 'une attaque, un Retour, et une autre attaque');
  assert.ok(gains.every((g) => g.atk === 1 && g.hp === 0));
});

test('Strauss-Kahn : quand il attaque, il gagne +1/+1 pour de bon par Socialiste de votre plateau', () => {
  const dsk = makeMinion(CARD_BY_ID.strauss_kahn, uid++);
  const thevenoud = makeMinion(CARD_BY_ID.thevenoud, uid++);
  const r = fight([dsk, { ...thevenoud, hp: 200 }, unit(1, 200)], [unit(0, 400)], 3);
  const gains = r.persist[0].buffs.filter((g) => g.uid === dsk.uid);
  assert.ok(gains.length >= 1, 'au moins une attaque');
  assert.ok(gains.every((g) => g.atk === 2 && g.hp === 2), 'lui et Thévenoud : deux Socialistes');
});

test('Strauss-Kahn : son Héritage lègue son attaque à vos autres Socialistes, pour de bon, et à eux seuls', () => {
  const dsk = { ...makeMinion(CARD_BY_ID.strauss_kahn, uid++), hp: 1 };
  const thevenoud = { ...makeMinion(CARD_BY_ID.thevenoud, uid++), hp: 300 };
  const other = unit(1, 300);
  const r = fight([dsk, thevenoud, other], [unit(4, 500)], 4);
  assert.ok(r.log.some((e) => e.e === 'mort' && e.uid === dsk.uid), 'il tombe');
  const heirs = r.persist[0].buffs.filter((g) => g.uid === thevenoud.uid);
  assert.ok(heirs.some((g) => g.atk >= CARD_BY_ID.strauss_kahn.atk && g.hp === 0), 'Thévenoud hérite de son attaque');
  assert.equal(r.persist[0].buffs.filter((g) => g.uid === other.uid).length, 0, 'pas un politique d\'un autre camp');
});

test('Strauss-Kahn : sacrifié au recrutement, il lègue son attaque aux Socialistes du plateau, et à eux seuls', () => {
  const game = table(['socialistes', 'rn', 'macronie', 'republicains', 'reconquete']);
  const p = game.players[0];
  const dsk = lay(game, 'strauss_kahn');
  const vallaud = lay(game, 'vallaud');
  const durif = lay(game, 'durif');
  const before = [vallaud.atk, vallaud.hp, durif.atk, durif.hp];
  assert.ok(take(game, 'hidalgo'));
  const hidalgo = addMinionToHand(game, p, 'hidalgo') as Minion;
  assert.equal(applyAction(game, 0, { t: 'play', uid: hidalgo.uid, target: dsk.uid }).ok, true);
  assert.ok(!p.board.some((m) => m.uid === dsk.uid), 'Hidalgo l\'a sacrifié');
  assert.deepEqual([vallaud.atk, vallaud.hp, durif.atk, durif.hp], [before[0] + dsk.atk, before[1], before[2], before[3]]);
});

test('Jean-Marie Le Pen ne lègue toujours qu\'à l\'allié suivant', () => {
  const jmlp = makeMinion(CARD_BY_ID.jmlp, uid++);
  const r = fight([{ ...jmlp, hp: 1 }, unit(1, 200), unit(1, 200)], [unit(4, 500)], 5);
  assert.ok(r.log.some((e) => e.e === 'mort' && e.uid === jmlp.uid));
  const heirs = new Set(r.persist[0].buffs.filter((g) => g.uid !== jmlp.uid).map((g) => g.uid));
  assert.equal(heirs.size, 1, 'un seul héritier');
});

test('Hollande : chaque allié tombé fait gonfler les Socialistes, partout, pour la partie', () => {
  const hollande = makeMinion(CARD_BY_ID.hollande, uid++);
  const r = fight([hollande, { ...makeMinion(CARD_BY_ID.thevenoud, uid++), hp: 1 }, unit(1, 1)], [unit(3, 500)], 2);
  const deaths = r.log.filter((e) => e.e === 'mort' && e.uid !== hollande.uid).length;
  assert.ok(deaths > 0);
  assert.ok(r.persist[0].campBuffs.length >= 1);
  assert.ok(r.persist[0].campBuffs.every((g) => g.camp === 'socialistes' && g.atk === 1 && g.hp === 1));
});

test('Macron : chaque Ralliement fait gonfler son hôte, d\'autant plus qu\'il en a reçu', () => {
  const game = startTable(['macronie', 'socialistes', 'republicains', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  lay(game, 'macron');
  const host = lay(game, 'kazib');
  const gains: number[] = [];
  for (const id of ['castaner', 'berge']) {
    assert.ok(take(game, id));
    const rally = addMinionToHand(game, p, id) as Minion;
    const before = host.atk + rally.atk;
    assert.equal(applyAction(game, 0, { t: 'play', uid: rally.uid, onto: host.uid }).ok, true);
    gains.push(host.atk - before);
  }
  assert.deepEqual(gains, [4, 8], '+4/+4 par Ralliement reçu');
});

test('Darmanin rallié apprend à son hôte à grandir en attaquant', () => {
  const game = startTable(['macronie', 'socialistes', 'republicains', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  const host = lay(game, 'kazib');
  assert.ok(take(game, 'darmanin'));
  const rally = addMinionToHand(game, p, 'darmanin') as Minion;
  assert.equal(applyAction(game, 0, { t: 'play', uid: rally.uid, onto: host.uid }).ok, true);
  assert.ok(host.effects.some((e) => e.when === 'meeting' && e.do === 'buff' && e.perma));
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

test('Sarkozy ne double qu\'une fois par manche : la deuxième casserole donne son avantage, sans doubler', () => {
  const game = startTable(['republicains', 'macronie', 'socialistes', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  const sarkozy = lay(game, 'sarkozy');
  const kazib = lay(game, 'kazib');
  const lucas = lay(game, 'lucas');
  const pose = (id: string, m: Minion) => {
    p.casseroleOffer = id;
    p.budget = 10;
    assert.equal(applyAction(game, 0, { t: 'buy_casserole' }).ok, true);
    const held = p.spells.find((s) => s.casseroleId === id) as { uid: number };
    assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: m.uid }).ok, true);
  };
  pose('homards', kazib);
  const key = `${sarkozy.uid}:${sarkozy.effects.findIndex((e) => e.do === 'doubler_stats')}`;
  assert.deepEqual(viewFor(game, 0).onceThisRound, [key], 'la vue dit que le doublement est joué');
  const before = [lucas.atk, lucas.hp];
  const ecoutes = CASSEROLE_BY_ID.ecoutes;
  pose('ecoutes', lucas);
  assert.deepEqual([lucas.atk, lucas.hp], [before[0] + (ecoutes.atk ?? 0), before[1] + (ecoutes.hp ?? 0)], 'pas de second doublement');
  p.onceThisRound = new Set();
  const again = [kazib.atk, kazib.hp];
  pose('benalla', kazib);
  const benalla = CASSEROLE_BY_ID.benalla;
  assert.deepEqual([kazib.atk, kazib.hp], [(again[0] + (benalla.atk ?? 0)) * 2, (again[1] + (benalla.hp ?? 0)) * 2], 'la manche suivante, il double de nouveau');
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

// Une relance perdue est refusée : le sort reste en main (7 novembre 2026, Seconde délibération sur De Gaulle).

test('Seconde délibération refuse un politique déjà relancé cette manche, et reste en main', () => {
  const game = startTable(['macronie', 'socialistes', 'republicains', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  lay(game, 'kazib');
  const deGaulle = lay(game, 'de_gaulle');
  lay(game, 'chirac'); // Son Annonce relance celle de De Gaulle.
  assert.ok(p.retriggered.has(deGaulle.uid));
  addSpellToHand(game, p, 'seconde_deliberation');
  const held = p.spells.find((s) => s.spellId === 'seconde_deliberation') as { uid: number };
  const refused = applyAction(game, 0, { t: 'cast', uid: held.uid, target: deGaulle.uid });
  assert.equal(refused.ok, false);
  assert.match(refused.ok ? '' : refused.error, /une fois par manche/);
  assert.ok(p.spells.some((s) => s.spellId === 'seconde_deliberation'), 'le sort reste en main');
  assert.deepEqual(viewFor(game, 0).relaunched, [...p.retriggered], 'la vue le dit, pour ne pas proposer la cible');
});

test('à la manche suivante, la relance repart', () => {
  const game = startTable(['macronie', 'socialistes', 'republicains', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  const kazib = lay(game, 'kazib');
  const deGaulle = lay(game, 'de_gaulle');
  cast(game, 'seconde_deliberation', deGaulle);
  startRound(game);
  p.budget = 500;
  const before = kazib.atk;
  cast(game, 'seconde_deliberation', deGaulle);
  assert.equal(kazib.atk - before, 4, 'l\'Annonce de De Gaulle, +4/+4 à vos politiques');
});

test('Conseil des ministres sans Fin de tour à relancer est refusé', () => {
  const game = startTable(['macronie', 'socialistes', 'republicains', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  lay(game, 'kazib');
  addSpellToHand(game, p, 'conseil_des_ministres');
  const held = p.spells.find((s) => s.spellId === 'conseil_des_ministres') as { uid: number };
  assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid }).ok, false);
  assert.ok(p.spells.some((s) => s.spellId === 'conseil_des_ministres'));
});

test('l\'écran ne propose pas une relance sur un politique déjà relancé', async () => {
  const { spellTargets } = await import('../src/client/tools/playTargets.ts');
  const deGaulle = makeMinion(CARD_BY_ID.de_gaulle, 41);
  const kazib = makeMinion(CARD_BY_ID.kazib, 42);
  const held = { uid: 1, spellId: 'seconde_deliberation' };
  assert.deepEqual(spellTargets(held, [deGaulle, kazib]), [41, 42]);
  assert.deepEqual(spellTargets(held, [deGaulle, kazib], { shopSize: 3, boardLimit: 7, relaunched: [41] }), [42]);
});

test('un sort perdu est refusé et reste en main : mot-clé déjà là, boutique vide, invocation sans place', () => {
  const refused = (game: Game, spellId: string, target?: Minion) => {
    const p = game.players[0];
    addSpellToHand(game, p, spellId);
    const held = p.spells.find((s) => s.spellId === spellId) as { uid: number };
    const r = applyAction(game, 0, { t: 'cast', uid: held.uid, ...(target ? { target: target.uid } : {}) });
    return !r.ok && p.spells.some((s) => s.uid === held.uid);
  };
  const game = startTable(['macronie', 'socialistes', 'republicains', 'ecologistes', 'reconquete']);
  const p = game.players[0];
  const gueant = lay(game, 'gueant');
  assert.ok(refused(game, 'immunite_parlementaire', gueant), 'il a déjà l\'Immunité');
  assert.ok(!refused(game, 'elements_de_langage', gueant), 'Éléments de langage donne aussi +0/+2 : jamais perdu');
  p.shop = [];
  assert.ok(refused(game, 'debauchage', gueant), 'personne à débaucher');
  const full = startTable(['socialistes', 'macronie', 'republicains', 'ecologistes', 'reconquete']);
  const bouamrane = lay(full, 'bouamrane');
  for (const id of ['kazib', 'cheminade', 'durif', 'lalanne', 'gueant', 'poutou']) lay(full, id);
  assert.ok(refused(full, 'tribune_libre', bouamrane), 'son Suppléant n\'aurait pas de place');
});

test('keywordsAlreadyThere ne vise que les sorts qui ne donnent que des mots-clés', async () => {
  const { keywordsAlreadyThere } = await import('../src/engine/keywordsAlreadyThere.ts');
  const { SPELL_BY_ID } = await import('../src/data/sorts.ts');
  assert.equal(keywordsAlreadyThere(SPELL_BY_ID.immunite_parlementaire.effects, ['immunite']), true);
  assert.equal(keywordsAlreadyThere(SPELL_BY_ID.immunite_parlementaire.effects, []), false);
  assert.equal(keywordsAlreadyThere(SPELL_BY_ID.elements_de_langage.effects, ['porte_parole']), false);
  assert.equal(keywordsAlreadyThere(SPELL_BY_ID.temps_de_parole.effects, ['porte_parole']), false);
  assert.equal(keywordsAlreadyThere(SPELL_BY_ID.sondage_flatteur.effects, []), false);
});

// R19 : un seul exil par joueur et par combat, sur l'ennemi le plus faible (10 novembre 2026).

test('R19 : plusieurs 49.3 qui exilent n\'exilent qu\'une fois, et visent l\'ennemi le plus faible', () => {
  const pierre = CASSEROLE_BY_ID.saint_pierre;
  const exile = (pierre.effects ?? [])[0];
  assert.equal(exile.do, 'exiler');
  assert.equal(exile.to, 'ennemi_plus_faible');
  for (let seed = 1; seed <= 6; seed++) {
    const exilers = [unit(2, 6, [], [exile]), unit(2, 6, [], [exile]), unit(2, 6, [], [exile, exile])];
    // L'ennemi le plus faible est au milieu ; à égalité, le plus à gauche part.
    const foes = [unit(5, 5), unit(1, 2), unit(3, 3), unit(2, 1), unit(4, 6)];
    const { log } = fight(exilers, foes, seed);
    const gone = log.filter((e): e is Extract<CombatEvent, { e: 'exil' }> => e.e === 'exil');
    assert.deepEqual(gone.map((e) => e.uid), [foes[1].uid], `graine ${seed}`);
    const exileEffects = log.filter((e) => e.e === 'effet' && 'effect' in e && e.effect.do === 'exiler');
    assert.equal(exileEffects.length, 1, 'les autres 49.3 qui exilent se taisent');
  }
});

test('R19 : chaque joueur a son exil', () => {
  const exile = (CASSEROLE_BY_ID.saint_pierre.effects ?? [])[0];
  const a = [unit(5, 5, [], [exile]), unit(1, 1)];
  const b = [unit(5, 5, [], [exile]), unit(1, 2)];
  const { log } = fight(a, b);
  const gone = log.filter((e): e is Extract<CombatEvent, { e: 'exil' }> => e.e === 'exil').map((e) => e.uid);
  assert.deepEqual(gone.sort((x, y) => x - y), [a[1].uid, b[1].uid].sort((x, y) => x - y));
});
