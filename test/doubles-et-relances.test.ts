import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createGame, resolveRound } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { invariantViolations } from '../src/engine/invariants.ts';
import { addMinionToHand, addSpellToHand, afterCombatSpeech, applyEffect, endOfTurn, offerCasserole, take } from '../src/engine/recruit.ts';
import { combatBonuses, resolveCombat } from '../src/engine/combat.ts';
import { effectPower, makeMinion } from '../src/engine/minion.ts';
import { createRng } from '../src/engine/rng.ts';
import { CARD_BY_ID, CARDS, TOKENS } from '../src/data/cards.ts';
import { CASSEROLES, CASSEROLE_BY_ID } from '../src/data/casseroles.ts';
import { PARAMS } from '../src/data/params.ts';
import { SPELL_BY_ID } from '../src/data/sorts.ts';
import type { Action, Camp, Effect, Minion, Trigger } from '../src/engine/types.ts';

/**
 * Doubler rapporte toujours (revue du moteur, 5 novembre 2026) : un doré, un multiplicateur, une relance ou une
 * casserole sur son propriétaire font plus que la carte seule. Et une même règle se lit pareil au recrutement et en
 * combat. Chaque test réduit un défaut trouvé à la relecture à sa plus petite partie.
 */

const CAMPS: Camp[] = ['macronie', 'republicains', 'socialistes', 'ecologistes', 'reconquete'];

function table(camps: Camp[] = CAMPS, seed = 7): Game {
  const game = createGame({ seed, seats: 2, heroes: ['philippe', 'philippe'], activeCamps: camps });
  game.players[0].budget = 500;
  return game;
}

function recruit(game: Game, cardId: string): Minion {
  assert.ok(take(game, cardId), `${cardId} en réserve`);
  return addMinionToHand(game, game.players[0], cardId) as Minion;
}

function settle(game: Game): void {
  for (let i = 0; game.players[0].discover && i < 10; i++) applyAction(game, 0, { t: 'discover', i: 0 });
}

function lay(game: Game, cardId: string, extra: { to?: number; target?: number } = {}): Minion {
  const m = recruit(game, cardId);
  const played = applyAction(game, 0, { t: 'play', uid: m.uid, ...extra });
  assert.equal(played.ok, true, `${cardId} posé : ${played.ok ? '' : played.error}`);
  return game.players[0].board.find((x) => x.uid === m.uid) ?? m;
}

/** Trois exemplaires : le doré part en main. */
function golden(game: Game, cardId: string): Minion {
  for (let i = 0; i < 3; i++) recruit(game, cardId);
  return game.players[0].hand.find((m) => m.cardId === cardId && m.golden) as Minion;
}

function pose(game: Game, casseroleId: string, target: Minion): void {
  const p = game.players[0];
  p.casseroleOffer = casseroleId;
  assert.equal(applyAction(game, 0, { t: 'buy_casserole' }).ok, true);
  const held = p.spells.find((s) => s.casseroleId === casseroleId) as { uid: number };
  assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: target.uid }).ok, true, `${casseroleId} posée`);
}

function castSpell(game: Game, spellId: string, target?: Minion) {
  const p = game.players[0];
  addSpellToHand(game, p, spellId);
  const held = p.spells.find((s) => s.spellId === spellId) as { uid: number };
  return applyAction(game, 0, { t: 'cast', uid: held.uid, ...(target ? { target: target.uid } : {}) });
}

function offers(game: Game): number {
  const p = game.players[0];
  return (p.discover ? 1 : 0) + p.discoverQueue.length;
}

// Les relances.

test('Chirac posé à côté d\'Hidalgo ne se détruit plus : une Annonce qui détruit ne se relance pas', () => {
  const game = table(['socialistes', 'macronie', 'republicains', 'rn', 'insoumis']);
  const fodder = lay(game, 'gueant');
  lay(game, 'hidalgo', { target: fodder.uid });
  settle(game);
  lay(game, 'retailleau', { to: 0 });
  const chirac = lay(game, 'chirac', { to: 0 });
  const board = game.players[0].board;
  assert.ok(board.includes(chirac), 'Chirac est toujours là');
  assert.deepEqual(board.map((m) => m.cardId), ['chirac', 'retailleau', 'hidalgo']);
  assert.equal(offers(game), 0, 'aucune découverte : Hidalgo n\'a rien relancé');
});

test('Seconde délibération refuse un politique qui n\'a rien à relancer', () => {
  const game = table(['socialistes', 'macronie', 'republicains', 'rn', 'insoumis']);
  const fodder = lay(game, 'gueant');
  const hidalgo = lay(game, 'hidalgo', { target: fodder.uid });
  settle(game);
  const refused = castSpell(game, 'seconde_deliberation', hidalgo);
  assert.equal(refused.ok, false);
  assert.ok(game.players[0].spells.some((s) => s.spellId === 'seconde_deliberation'), 'le sort reste en main');
  const bertrand = lay(game, 'bertrand', { target: hidalgo.uid });
  assert.equal(castSpell(game, 'seconde_deliberation', bertrand).ok, true);
});

test('une Annonce ciblée relancée ne vise ni le relancé ni le relanceur', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const game = table(['rn', 'macronie', 'republicains', 'socialistes', 'insoumis'], seed);
    const chenu = lay(game, 'chenu');
    const ally = lay(game, 'gueant');
    const before = { atk: ally.atk, hp: ally.hp };
    // Chirac relance les Annonces du plateau en fin de tour (13 novembre 2026).
    const chirac = lay(game, 'chirac');
    endOfTurn(game, game.players[0]);
    assert.deepEqual([chirac.atk, chirac.hp], [CARD_BY_ID.chirac.atk, CARD_BY_ID.chirac.hp], `graine ${seed} : Chirac ne débauche pas pour lui`);
    assert.ok(ally.atk + ally.hp > before.atk + before.hp, `graine ${seed} : l'Annonce de Chenu, relancée, sert l'autre allié`);
    assert.ok(game.players[0].board.includes(chenu));
  }
});

// Les dorés.

test('un Bertrand doré donne l\'Immunité à sa cible et à un autre allié', () => {
  const game = table(['republicains', 'macronie', 'socialistes', 'rn', 'insoumis']);
  const [a, b, c] = [lay(game, 'kazib'), lay(game, 'cheminade'), lay(game, 'durif')];
  const gold = golden(game, 'bertrand');
  assert.equal(applyAction(game, 0, { t: 'play', uid: gold.uid, target: a.uid }).ok, true);
  assert.ok(a.keywords.includes('immunite'), 'sa cible');
  assert.equal([b, c].filter((m) => m.keywords.includes('immunite')).length, 1, 'et un autre allié, un seul');
});

test('Lassalle double la Fin de tour de Lisnard : l\'allié suivant a déjà l\'Immunité, un autre la reçoit', () => {
  const game = table(['republicains', 'macronie', 'socialistes', 'rn', 'insoumis']);
  const p = game.players[0];
  lay(game, 'lisnard');
  const next = lay(game, 'retailleau'); // Porte-parole, Immunité : il l'a déjà.
  const others = [lay(game, 'kazib'), lay(game, 'cheminade'), lay(game, 'lassalle')];
  endOfTurn(game, p);
  assert.ok(next.keywords.includes('immunite'));
  assert.equal(others.filter((m) => m.keywords.includes('immunite')).length, 1, 'la Fin de tour rejouée ne se perd pas');
});

test('les deux Retours de Royal vont à deux alliés différents', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const game = table(['socialistes', 'macronie', 'republicains', 'rn', 'insoumis'], seed);
    const allies = [lay(game, 'kazib'), lay(game, 'cheminade'), lay(game, 'durif')];
    lay(game, 'royal');
    assert.equal(allies.filter((m) => m.keywords.includes('retour')).length, 2, `graine ${seed}`);
  }
});

test('un Philippe doré rend dorés deux alliés', () => {
  const game = table(['macronie', 'republicains', 'socialistes', 'rn', 'insoumis']);
  const allies = [lay(game, 'kazib'), lay(game, 'cheminade'), lay(game, 'durif')];
  const gold = golden(game, 'philippe');
  assert.equal(applyAction(game, 0, { t: 'play', uid: gold.uid, target: allies[0].uid }).ok, true);
  assert.ok(allies[0].golden);
  assert.equal(allies.filter((m) => m.golden).length, 2);
});

test('une Hidalgo dorée découvre deux fois, et Chirac fait redécouvrir sans détruire une deuxième fois', () => {
  const game = table(['socialistes', 'macronie', 'republicains', 'rn', 'insoumis']);
  const p = game.players[0];
  const fodder = lay(game, 'gueant');
  const gold = golden(game, 'hidalgo');
  assert.equal(applyAction(game, 0, { t: 'play', uid: gold.uid, target: fodder.uid }).ok, true);
  assert.equal(offers(game), 2);
  settle(game);

  const other = table(['socialistes', 'macronie', 'republicains', 'rn', 'insoumis']);
  lay(other, 'chirac');
  const victim = lay(other, 'gueant');
  const kept = lay(other, 'kazib');
  lay(other, 'hidalgo', { target: victim.uid });
  assert.equal(offers(other), 2, 'deux découvertes');
  assert.ok(!other.players[0].board.includes(victim) && other.players[0].board.includes(kept), 'une seule victime');
  assert.ok(p.board.length > 0);
});

test('un Jadot doré joue deux fois la Fin de tour de ses voisins', () => {
  const game = table(['ecologistes', 'macronie', 'republicains', 'socialistes', 'insoumis']);
  const doucet = lay(game, 'doucet');
  const gold = golden(game, 'jadot');
  assert.equal(applyAction(game, 0, { t: 'play', uid: gold.uid }).ok, true);
  const before = doucet.atk;
  endOfTurn(game, game.players[0]);
  assert.equal(doucet.atk - before, 3, 'sa propre Fin de tour, puis deux fois relancée');
});

test('un Ralliement garde sa puissance : doré sur un hôte normal, normal sur un hôte doré', () => {
  const game = table(['macronie', 'republicains', 'socialistes', 'rn', 'insoumis']);
  const p = game.players[0];
  const host = lay(game, 'retailleau');
  const gold = golden(game, 'lemaire');
  assert.equal(applyAction(game, 0, { t: 'play', uid: gold.uid, onto: host.uid }).ok, true);
  const income = host.effects.find((e) => e.when === 'debut_tour') as Effect;
  const before = p.budget;
  applyEffect(game, p, host, income);
  assert.equal(p.budget - before, 4, 'le Le Maire doré rallié rapporte le double, 4');

  assert.deepEqual(invariantViolations(game), []);

  const other = table(['macronie', 'republicains', 'socialistes', 'rn', 'insoumis']);
  const goldHost = golden(other, 'retailleau');
  assert.equal(applyAction(other, 0, { t: 'play', uid: goldHost.uid }).ok, true);
  const plain = recruit(other, 'lemaire');
  assert.equal(applyAction(other, 0, { t: 'play', uid: plain.uid, onto: goldHost.uid }).ok, true);
  const plainIncome = goldHost.effects.find((e) => e.when === 'debut_tour') as Effect;
  assert.equal(effectPower(goldHost, plainIncome), 1, 'un Le Maire normal ne double pas sur un hôte doré');
  assert.deepEqual(invariantViolations(other), []);
});

test('une casserole donne la même chose à un doré qu\'aux autres', () => {
  const game = table(['republicains', 'macronie', 'socialistes', 'rn', 'insoumis']);
  const gold = golden(game, 'gueant');
  assert.equal(applyAction(game, 0, { t: 'play', uid: gold.uid }).ok, true);
  pose(game, 'casse_toi', gold);
  const riposte = gold.effects.find((e) => e.when === 'riposte') as Effect;
  assert.equal(effectPower(gold, riposte), 1);
});

// Les casseroles.

test('un Darmanin doré qui porte sa casserole se rallie sans anomalie : son bonus de propriétaire le suit', () => {
  const game = table();
  const darmanin = lay(game, 'darmanin');
  pose(game, 'faux_billets', darmanin);
  assert.equal(darmanin.bonusDamage, 6, 'son affaire, et son bonus de propriétaire');
  const gold = golden(game, 'darmanin');
  assert.deepEqual(gold.ownerCasseroles, ['faux_billets']);
  const host = lay(game, 'retailleau');
  assert.equal(applyAction(game, 0, { t: 'play', uid: gold.uid, onto: host.uid }).ok, true);
  assert.equal(host.bonusDamage, 6);
  assert.deepEqual(invariantViolations(game), []);
});

test('les hologrammes de Mélenchon : son bonus de propriétaire en invoque un deuxième', () => {
  const game = table(['insoumis', 'macronie', 'republicains', 'socialistes', 'rn']);
  const m = lay(game, 'melenchon');
  pose(game, 'hologramme', m);
  assert.equal(game.players[0].board.filter((x) => x.cardId === 'hologramme').length, 2);
  const stranger = lay(game, 'kazib');
  pose(game, 'hologramme', stranger);
  assert.equal(game.players[0].board.filter((x) => x.cardId === 'hologramme').length, 3, 'un seul ailleurs');
});

test('la boutique ne propose que des casseroles dont le propriétaire est dans la partie', () => {
  const game = table(['insoumis', 'socialistes', 'ecologistes', 'macronie', 'reconquete']);
  const p = game.players[0];
  game.round = PARAMS.casseroleFromRound;
  for (let i = 0; i < 300; i++) {
    offerCasserole(game, p);
    const c = CASSEROLE_BY_ID[p.casseroleOffer as string];
    assert.ok(game.poolTotal.has(c.owner), `« ${c.name} » : ${c.owner} n'est pas de la partie`);
  }
});

test('une affaire n\'arrive qu\'une fois : la boutique ne propose pas une casserole qu\'on a déjà', () => {
  const game = table(['socialistes', 'macronie', 'republicains', 'rn', 'insoumis']);
  const p = game.players[0];
  game.round = PARAMS.casseroleFromRound;
  const cahuzac = lay(game, 'cahuzac');
  pose(game, 'compte_suisse', cahuzac);
  p.spells.push({ uid: game.nextUid++, casseroleId: 'homards' });
  for (let i = 0; i < 300; i++) {
    offerCasserole(game, p);
    assert.ok(!['compte_suisse', 'homards'].includes(p.casseroleOffer as string), `${p.casseroleOffer} revient`);
  }
});

// Le scandale.

test('un triple ne relance pas le scandale : il continue jusqu\'à sa date', () => {
  const game = table(['republicains', 'macronie', 'socialistes', 'rn', 'insoumis']);
  const m = lay(game, 'gueant');
  pose(game, 'primes', m);
  pose(game, 'lapsus', m);
  const until = m.scandal?.until;
  assert.equal(until, game.round + PARAMS.scandalRounds);
  resolveRound(game);
  const gold = golden(game, 'gueant');
  assert.equal(gold.scandal?.until, until);
  assert.deepEqual(invariantViolations(game), []);
});

test('un scandale coûte ses deux manches de budget', () => {
  const game = table(['republicains', 'macronie', 'socialistes', 'rn', 'insoumis']);
  const p = game.players[0];
  const m = lay(game, 'gueant');
  pose(game, 'bygmalion', m); // −2 par manche en scandale
  pose(game, 'homards', m); // −2 (re-spécification du 7 novembre 2026 : les défauts font mal)
  const base = (round: number) => Math.min(PARAMS.maxBudget, PARAMS.startBudget + (round - 1) * PARAMS.budgetPerRound) + 1; // + le pouvoir de Philippe
  const paid: number[] = [];
  for (let i = 0; i < 3; i++) {
    resolveRound(game);
    paid.push(base(game.round) - p.budget);
  }
  assert.deepEqual(paid, [4, 4, 0]);
  assert.equal(m.scandal, undefined);
});

test('un politique en main paie aussi son budget par manche', () => {
  const game = table(['socialistes', 'macronie', 'republicains', 'rn', 'insoumis']);
  const p = game.players[0];
  const cahuzac = lay(game, 'cahuzac');
  pose(game, 'compte_suisse', cahuzac);
  golden(game, 'cahuzac');
  assert.equal(p.board.length, 0);
  assert.equal(p.hand[0].budgetPerRound, 4, 'son compte, et son bonus de propriétaire');
  resolveRound(game);
  assert.equal(p.budget, Math.min(PARAMS.maxBudget, PARAMS.startBudget + 1) + 1 + 4);
});

// Les autres règles, lues pareil partout.

test('Bayrou compte un Ralliement pour un, même doré', () => {
  const game = table(['macronie', 'republicains', 'socialistes', 'rn', 'insoumis']);
  const host = lay(game, 'retailleau');
  lay(game, 'bayrou');
  const gold = golden(game, 'castaner');
  assert.equal(applyAction(game, 0, { t: 'play', uid: gold.uid, onto: host.uid }).ok, true);
  assert.equal(host.rallied.length, 1);
  assert.equal(host.merged.length, 3, 'ses trois exemplaires retourneront à la réserve');
  const before = host.atk;
  endOfTurn(game, game.players[0]);
  const perRally = (CARD_BY_ID.bayrou.effects?.[0] as { atk: number }).atk;
  assert.equal(host.atk - before, perRally, 'un Ralliement, une fois son gain');
});

test('l\'Investiture d\'un doré ne se perd pas quand son Annonce remplit la main', () => {
  const game = table(['insoumis', 'republicains', 'rn', 'macronie', 'socialistes']);
  const p = game.players[0];
  const gold = golden(game, 'guette');
  for (const id of ['sondage_flatteur', 'note_de_frais', 'matinale', 'primaire', 'motion_de_censure', 'congres', 'debauchage', 'seconde_chance']) addSpellToHand(game, p, id);
  assert.equal(p.hand.length + p.spells.length, 9);
  assert.equal(applyAction(game, 0, { t: 'play', uid: gold.uid }).ok, true);
  assert.ok(p.spells.some((s) => s.spellId === 'investiture'));
});

test('Congrès est une actualisation : « Quand vous actualisez » joue, la boutique se dégèle', () => {
  const game = table(['reconquete', 'republicains', 'rn', 'insoumis', 'socialistes']);
  const p = game.players[0];
  const lafont = lay(game, 'lafont');
  p.frozen = true;
  const before = lafont.atk;
  assert.equal(castSpell(game, 'congres', lafont).ok, true);
  assert.equal(lafont.atk - before, 2);
  assert.equal(p.frozen, false);
  assert.ok(p.shop.every((id) => CARD_BY_ID[id].camp === 'reconquete'));
});

test('un sacrifice sur la Société civile découvre la Société civile', () => {
  const game = table(['socialistes', 'macronie', 'republicains', 'rn', 'insoumis']);
  const victim = lay(game, 'cheminade');
  assert.equal(castSpell(game, 'primaire', victim).ok, true);
  const options = game.players[0].discover?.options ?? [];
  assert.ok(options.length > 0 && options.every((id) => CARD_BY_ID[id].camp === 'civile'), `${options}`);
});

test('l\'allié suivant fait le tour du plateau au recrutement, comme en combat', () => {
  const game = table(['socialistes', 'macronie', 'republicains', 'rn', 'insoumis']);
  const first = lay(game, 'gueant');
  const royal = lay(game, 'royal');
  settle(game);
  const before = first.atk;
  afterCombatSpeech(game, game.players[0], royal.uid, 'celebration');
  assert.equal(first.atk - before, 2, 'Royal, tout à droite, célèbre le premier');
});

test('des dégâts d\'effet font riposter : le 49.3 de Villiers touche Wauquiez, qui grandit', () => {
  const unit = (id: string, uid: number) => makeMinion(CARD_BY_ID[id], uid);
  const r = resolveCombat(
    { minions: [unit('villiers', 1)], mods: {}, hp: 30 },
    { minions: [unit('wauquiez', 2)], mods: {}, hp: 30 },
    { params: PARAMS, ctx: null, rng: createRng(3), log: true },
  );
  const firstAttack = r.log.findIndex((e) => e.e === 'attaque');
  const riposte = r.log.findIndex((e) => e.e === 'effet' && e.uid === 2 && e.when === 'riposte');
  assert.ok(riposte >= 0 && riposte < firstAttack, 'il riposte au 49.3, avant toute attaque');
});

test('Macron ne double les Célébrations que s\'il a survécu, comme Mitterrand les Héritages', () => {
  const unit = (id: string, uid: number, hp?: number) => ({ ...makeMinion(CARD_BY_ID[id], uid), ...(hp ? { hp } : {}) });
  const fight = (macronHp: number) => resolveCombat(
    { minions: [unit('macron', 1, macronHp), unit('giscard', 2)], mods: {}, hp: 30 },
    { minions: [unit('villiers', 3)], mods: {}, hp: 30 },
    { params: PARAMS, ctx: null, rng: createRng(5), log: true },
  );
  const alive = fight(20);
  assert.equal(alive.winner, 0);
  assert.equal(alive.celebrationRepeats, 2);
  const dead = fight(1);
  assert.equal(dead.winner, 0);
  assert.equal(dead.celebrationRepeats, 1, 'tué par le 49.3, il ne fait pas la fête');
});

test('le bonus de solitude suit les camps : un allié Ni droite ni gauche est de tous les camps', () => {
  const hortefeux = { ...makeMinion(CARD_BY_ID.hortefeux, 1), aloneBonus: 4 };
  assert.deepEqual(combatBonuses([hortefeux, makeMinion(CARD_BY_ID.kazib, 2)]), [4, 0]);
  assert.deepEqual(combatBonuses([hortefeux, makeMinion(CARD_BY_ID.maillard, 2)]), [0, 0]);
  const insoumis = { ...makeMinion(CARD_BY_ID.portes, 3), aloneBonus: 4 };
  assert.deepEqual(combatBonuses([insoumis, makeMinion(CARD_BY_ID.houssin, 4)], true), [0, 0], 'le Fer à cheval');
});

// Les données : ce que le moteur ne saurait pas jouer.

/** Ce que le combat sait jouer (runEffect, combat.ts) : le reste n'a de sens qu'au recrutement. */
const IN_COMBAT: Record<Action['do'], boolean> = {
  buff: true, buff_par_allie: true, buff_par_camp: true, buff_par_ralliement: false, degats: true, invoquer: true, budget: false,
  mot_cle: true, retirer: true, basculer: false, exiler: true, oublier: false, transmettre: true, carte: true, decouvrir: false,
  camp_buff: true, boutique_buff: false, tract_bonus: true, jouer_tract: true, debaucher: false, dorer: false, detruire: true,
  sacrifier: false, declencher: true, doubler: true, compteur: true, scandale_plus: true, actualiser: false, actualisations_gratuites: false,
  budget_max: false, pari_defaite: false, congres: false, butin: true,
  doubler_stats: true, buff_par_membre: true, gain_debauche: false, buff_compteur: false, chaise_vide: true,
};
const COMBAT_TRIGGERS: Trigger[] = ['debut_combat', 'heritage', 'riposte', 'meeting', 'tue', 'revanche', 'immunite_perdue'];

function allEffects(): { owner: string; effect: Effect }[] {
  return [
    ...[...CARDS, ...Object.values(TOKENS)].flatMap((c) => (c.effects ?? []).map((effect) => ({ owner: c.id, effect }))),
    ...CASSEROLES.flatMap((c) => [...(c.effects ?? []), ...(c.ownerBonus.effects ?? [])].map((effect) => ({ owner: c.id, effect }))),
  ];
}

test('la Chaise vide de Giscard a ses stats au recrutement comme en combat', () => {
  const game = table(['socialistes', 'macronie', 'republicains', 'rn', 'insoumis']);
  const p = game.players[0];
  const giscard = lay(game, 'giscard');
  lay(game, 'ndiaye');
  assert.equal(castSpell(game, 'primaire', giscard).ok, true);
  const chair = p.board.find((m) => m.cardId === 'chaise_vide') as Minion;
  assert.ok(chair, 'sa chaise reste');
  assert.deepEqual([chair.atk, chair.hp], [CARD_BY_ID.giscard.atk, CARD_BY_ID.giscard.hp]);

  const fallen = { ...makeMinion(CARD_BY_ID.giscard, 9001), keywords: [] };
  const r = resolveCombat({ minions: [fallen], mods: {}, hp: 30 }, { minions: [{ ...makeMinion(CARD_BY_ID.chirac, 9002), atk: 60, hp: 60 }], mods: {}, hp: 30 }, { params: PARAMS, ctx: null, rng: createRng(1), log: true });
  const summoned = r.log.find((e) => e.e === 'stats' && r.log.some((x) => x.e === 'invocation' && x.unit.cardId === 'chaise_vide' && x.unit.uid === e.uid));
  assert.ok(summoned && summoned.e === 'stats' && summoned.atk === chair.atk, 'la même attaque en combat');
});

test('Chirac relance en fin de tour une Annonce qui rapporte du budget : il arrive à la manche suivante', () => {
  const game = table(['insoumis', 'macronie', 'republicains', 'rn', 'socialistes']);
  const p = game.players[0];
  lay(game, 'coquerel');
  lay(game, 'chirac');
  p.budget = 2;
  p.nextBudgetBonus = 0;
  endOfTurn(game, p);
  // Coquerel donne 3 de budget, deux fois avec Chirac : rien à dépenser ce tour, tout à la manche suivante.
  assert.equal(p.budget, 2);
  assert.equal(p.nextBudgetBonus, 6);
  assert.ok(p.endOfTurnSteps.some((step) => step.notes.includes('budget')), 'la Fin de tour le montre');
});

test('une affaire n\'arrive qu\'une fois : deux découvertes de casseroles ne proposent ni la même, ni celle de la boutique', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const game = table(['macronie', 'republicains', 'socialistes', 'insoumis', 'reconquete'], seed);
    const p = game.players[0];
    game.round = PARAMS.casseroleFromRound;
    offerCasserole(game, p);
    const gold = golden(game, 'lalanne');
    assert.equal(applyAction(game, 0, { t: 'play', uid: gold.uid }).ok, true);
    const first = p.discover?.options ?? [];
    const second = p.discoverQueue[0]?.options ?? [];
    assert.equal(first.length, 3);
    assert.equal(second.length, 3);
    assert.deepEqual(first.filter((id) => second.includes(id)), [], `graine ${seed} : la même casserole dans les deux choix`);
    assert.ok(![...first, ...second].includes(p.casseroleOffer as string), `graine ${seed} : la casserole de la boutique dans un choix`);
    settle(game);
    const held = p.spells.flatMap((s) => (s.casseroleId ? [s.casseroleId] : []));
    assert.equal(new Set(held).size, held.length, `graine ${seed} : une casserole deux fois en main`);
    assert.deepEqual(invariantViolations(game), []);
  }
});

// La règle R4, par relanceur : deux relanceurs s'additionnent, et un multiplicateur fait rejouer le relanceur.

function tracts(game: Game): number {
  return game.players[0].spells.find((s) => s.spellId === 'tract')?.count ?? 0;
}

test('R4 : Seconde délibération et Chirac relancent chacun l\'Annonce du même politique', () => {
  const game = table(['insoumis', 'macronie', 'republicains', 'rn', 'socialistes']);
  const p = game.players[0];
  const kazib = lay(game, 'kazib');
  lay(game, 'chirac');
  const start = tracts(game);
  assert.equal(castSpell(game, 'seconde_deliberation', kazib).ok, true);
  assert.equal(tracts(game) - start, 2, 'le sort relance Kazib, deux fois avec Chirac');
  endOfTurn(game, p);
  assert.equal(tracts(game) - start, 4, 'Chirac le relance encore en fin de tour : le sort n\'est pas perdu');
  assert.equal(castSpell(game, 'seconde_deliberation', kazib).ok, false, 'le même sort ne le relance pas deux fois dans la manche');
});

test('R4 : Lassalle fait rejouer la Fin de tour de Chirac, qui relance encore les Annonces', () => {
  const gained = (withLassalle: boolean) => {
    const game = table(['insoumis', 'macronie', 'republicains', 'rn', 'socialistes']);
    lay(game, 'kazib');
    lay(game, 'chirac');
    if (withLassalle) lay(game, 'lassalle');
    const start = tracts(game);
    endOfTurn(game, game.players[0]);
    return tracts(game) - start;
  };
  assert.equal(gained(false), 2);
  assert.equal(gained(true), 4, 'doubler rapporte toujours');
});

test('R4 : Conseil des ministres rapporte aussi aux voisins de Jadot', () => {
  const grown = (withSpell: boolean) => {
    const game = table(['ecologistes', 'macronie', 'republicains', 'socialistes', 'insoumis']);
    const doucet = lay(game, 'doucet');
    lay(game, 'jadot');
    const start = doucet.atk;
    if (withSpell) assert.equal(castSpell(game, 'conseil_des_ministres').ok, true);
    endOfTurn(game, game.players[0]);
    return doucet.atk - start;
  };
  assert.equal(grown(false), 2, 'sa Fin de tour, puis celle que Jadot relance');
  assert.ok(grown(true) > grown(false), 'le sort ajoute les siennes');
});

test('R4 : deux Jadot côte à côte ne se relancent pas sans fin', () => {
  const game = table(['ecologistes', 'macronie', 'republicains', 'socialistes', 'insoumis']);
  const p = game.players[0];
  const doucet = lay(game, 'doucet');
  lay(game, 'jadot');
  lay(game, 'jadot');
  lay(game, 'lassalle');
  const start = doucet.atk;
  endOfTurn(game, p);
  assert.ok(doucet.atk - start >= 4 && doucet.atk - start <= 30, `Doucet gagne ${doucet.atk - start}`);
  assert.ok(p.retriggered.size <= 3 * 7 * 7, 'un nombre fini de relances');
});

test('une découverte née de la Fin de tour attend le joueur au recrutement suivant', () => {
  const game = table(['insoumis', 'macronie', 'republicains', 'rn', 'socialistes']);
  const p = game.players[0];
  lay(game, 'branco');
  settle(game);
  lay(game, 'chirac');
  settle(game);
  const held = p.spells.length;
  for (const q of game.players) q.hp = 999;
  resolveRound(game);
  assert.equal(game.phase, 'recrutement');
  assert.ok(p.discover && p.discover.kind === 'sort', 'le choix est resté ouvert');
  assert.equal(offers(game), 2, 'Chirac a relancé deux fois l\'Annonce de Branco');
  assert.equal(p.spells.length, held, 'rien n\'a été pris d\'office');
  assert.equal(applyAction(game, 0, { t: 'roll' }).ok, false, 'il choisit d\'abord');
  settle(game);
  assert.equal(p.spells.length, held + 2);
  assert.deepEqual(invariantViolations(game), []);
});

test('les Tracts que Mélenchon joue en combat comptent comme des Tracts lancés', () => {
  const game = table(['insoumis', 'macronie', 'republicains', 'rn', 'socialistes']);
  const p = game.players[0];
  lay(game, 'melenchon');
  const trouve = lay(game, 'trouve');
  const roussel = lay(game, 'roussel');
  const before = { counted: p.counters.tracts, atk: trouve.atk, hp: trouve.hp, roussel: roussel.atk };
  for (const q of game.players) q.hp = 999;
  game.players[1].board = [{ ...makeMinion(CARD_BY_ID.kazib, 9100), atk: 1, hp: 400 }];
  resolveRound(game);
  const played = p.counters.tracts - before.counted;
  assert.ok(played >= 4, `${played} Tracts comptés : deux Insoumis, deux fois par attaque`);
  // Roussel, qui n'est pas Insoumis, ne reçoit aucun Tract : il gagne +1/+0 par sort lancé, comme tout le plateau.
  assert.equal(roussel.atk - before.roussel, played);
  // Trouvé gagne +1/+1 par Tract lancé, en plus des Tracts qu'elle reçoit et du +1/+0 de Roussel.
  assert.ok(trouve.hp - before.hp > played, `Trouvé gagne ${trouve.hp - before.hp} PV pour ${played} Tracts`);
  assert.ok(trouve.atk - before.atk > 2 * played);
});

test('un effet de combat n\'emploie que ce que le combat sait jouer : rien ne s\'y perd sans bruit', () => {
  const lost = allEffects().filter(({ effect }) => COMBAT_TRIGGERS.includes(effect.when) && !IN_COMBAT[effect.do]);
  assert.deepEqual(lost.map(({ owner, effect }) => `${owner} : ${effect.when} → ${effect.do}`), []);
});

test('« Après que vous lancez un sort » ne crée ni ne joue de sort : main pleine, ce serait une boucle sans fin', () => {
  const loops = allEffects().filter(({ effect }) => effect.when === 'sort' && (effect.do === 'jouer_tract' || (effect.do === 'carte' && (effect.card === 'sort_aleatoire' || Boolean(SPELL_BY_ID[effect.card])))));
  assert.deepEqual(loops.map(({ owner }) => owner), []);
});

test('chaque casserole a un bonus de propriétaire', () => {
  for (const c of CASSEROLES) assert.ok(Object.keys(c.ownerBonus).length > 0, c.id);
});
