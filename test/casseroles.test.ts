import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createGame } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { addMinionToHand } from '../src/engine/recruit.ts';
import { CARD_BY_ID, PARTY_CAMPS } from '../src/data/cards.ts';
import { CASSEROLES } from '../src/data/casseroles.ts';
import type { Casserole, Minion } from '../src/engine/types.ts';

/**
 * Les casseroles, une par une. Retour de partie (3 novembre 2026) : « L'immunité ouvrière »
 * ne valait rien, même ×2 sur Poutou, et la casserole de Zemmour ne lui donnait rien : il avait déjà
 * sa Polémique. Chaque casserole doit faire quelque chose, et plus encore sur son propriétaire.
 */

/** Une partie où le camp du propriétaire est en jeu, et un politique sans effet pour comparer. */
function table(owner: string): Game {
  const camp = CARD_BY_ID[owner].camp;
  const camps = [...new Set([camp === 'civile' ? 'socialistes' : camp, ...PARTY_CAMPS])].slice(0, 5);
  const game = createGame({ seed: 5, seats: 2, heroes: ['philippe', 'philippe'], activeCamps: camps as never });
  game.players[0].budget = 50;
  return game;
}

/** Posé avec des stats confortables : un malus de PV ne se perd pas sous le plancher de 1 PV. */
function play(game: Game, cardId: string): Minion {
  const p = game.players[0];
  const m = addMinionToHand(game, p, cardId) as Minion;
  assert.ok(applyAction(game, 0, { t: 'play', uid: m.uid }).ok, `${cardId} ne se pose pas`);
  const placed = p.board.find((x) => x.uid === m.uid) as Minion;
  placed.atk += 5;
  placed.hp += 5;
  return placed;
}

/** Le politique de comparaison : ni mot-clé ni effet, qui n'est le propriétaire de rien. */
function playPlain(game: Game, owner: string): Minion {
  const plain = play(game, PLAIN === owner ? 'bouamrane' : PLAIN);
  plain.keywords = [];
  plain.effects = [];
  return plain;
}

/** Une casserole qui fait oublier ne sert que sur un politique en scandale : on lui en donne un. */
function scandalize(game: Game, target: Minion, c: Casserole): void {
  if (!c.chargesRemoved) return;
  const filler = CASSEROLES.find((x) => x.id === 'homards') as Casserole;
  pose(game, target, filler);
  pose(game, target, filler);
  assert.ok(target.scandal, 'le politique de test devait être en scandale');
}

/** Ce que la casserole a rapporté à ce politique et à son joueur, en une mesure comparable. */
function pose(game: Game, target: Minion, c: Casserole): number {
  const p = game.players[0];
  const before = { atk: target.atk, hp: target.hp, keywords: target.keywords.length, effects: target.effects.length, budget: p.budget + p.nextBudgetBonus, perRound: target.budgetPerRound, hand: p.hand.length, board: p.board.length, bonus: target.bonusDamage + target.aloneBonus, charges: target.charges };
  p.spells.push({ uid: game.nextUid++, casseroleId: c.id });
  const held = p.spells[p.spells.length - 1];
  assert.ok(applyAction(game, 0, { t: 'cast', uid: held.uid, target: target.uid }).ok, `${c.id} ne se pose pas`);
  return (target.atk - before.atk) + (target.hp - before.hp) + 3 * (target.keywords.length - before.keywords) + 3 * (target.effects.length - before.effects)
    + (p.budget + p.nextBudgetBonus - before.budget) + 3 * (target.budgetPerRound - before.perRound) + 3 * (p.hand.length - before.hand) + 3 * (p.board.length - before.board)
    + (target.bonusDamage + target.aloneBonus - before.bonus) + (before.charges > target.charges ? 1 : 0);
}

/** Le politique de comparaison, avant qu'on lui retire mots-clés et effets. */
const PLAIN = 'thevenoud';

test('aucune casserole ne donne à son propriétaire un mot-clé qu\'il a déjà', () => {
  for (const c of CASSEROLES) {
    const own = CARD_BY_ID[c.owner]?.keywords ?? [];
    const twice = (c.keywords ?? []).filter((k) => own.includes(k));
    assert.deepEqual(twice, [], `« ${c.name} » donne ${twice} à ${c.owner}, qui l'a déjà`);
  }
});

test('chaque casserole a un propriétaire en jeu, et rien n\'y est une valeur de blague', () => {
  for (const c of CASSEROLES) {
    assert.ok(CARD_BY_ID[c.owner], `« ${c.name} » : propriétaire ${c.owner} inconnu`);
    for (const key of ['atk', 'hp'] as const) assert.ok(Math.abs(c[key] ?? 0) <= 8, `« ${c.name} » : ${key} ${c[key]}`);
  }
});

test('posée sur un politique ordinaire, chaque casserole change quelque chose', () => {
  for (const c of CASSEROLES) {
    const game = table(c.owner);
    const plain = playPlain(game, c.owner);
    play(game, 'bouamrane');
    scandalize(game, plain, c);
    assert.ok(pose(game, plain, c) !== 0, `« ${c.name} » ne change rien`);
  }
});

test('sur son propriétaire, chaque casserole rapporte plus que sur un autre politique', () => {
  for (const c of CASSEROLES) {
    const plainGame = table(c.owner);
    const other = playPlain(plainGame, c.owner);
    scandalize(plainGame, other, c);
    const elsewhere = pose(plainGame, other, c);
    const ownerGame = table(c.owner);
    const owner = play(ownerGame, c.owner);
    scandalize(ownerGame, owner, c);
    const onOwner = pose(ownerGame, owner, c);
    assert.ok(onOwner > elsewhere, `« ${c.name} » : ${onOwner} sur ${c.owner}, ${elsewhere} ailleurs`);
  }
});

test('une casserole économique ne rapporte pas plus que son prix plus un, ou plus deux avec un défaut', () => {
  for (const c of CASSEROLES) {
    const gain = c.instantBudget ?? 0;
    const hasDefect = (c.budgetPerRound ?? 0) < 0 || c.locked || c.silence || (c.hpLossOnDeath ?? 0) > 0;
    assert.ok(gain <= c.cost + (hasDefect ? 2 : 1), `« ${c.name} » coûte ${c.cost} et rapporte ${gain} tout de suite`);
  }
});
