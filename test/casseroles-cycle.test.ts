import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createGame, resolveRound } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { invariantViolations } from '../src/engine/invariants.ts';
import { addMinionToHand, take } from '../src/engine/recruit.ts';
import { CARD_BY_ID, PARTY_CAMPS } from '../src/data/cards.ts';
import { CASSEROLES } from '../src/data/casseroles.ts';
import type { Minion } from '../src/engine/types.ts';

/**
 * Chaque casserole, de la pose à l'oubli : sur son propriétaire et sur un autre politique, on pose, on fait
 * scandale, on combat, le peuple oublie, on repose, on fusionne en doré, on met le bracelet, on renvoie.
 * Après chaque geste, tous les invariants du moteur : un politique porte exactement ce que disent ses
 * casseroles (budget, sondages, dégâts, verrou, silence, effets), et la réserve reste juste.
 */

const SECOND = 'homards';
const STRANGER = 'cheminade';

function table(owner: string): Game {
  const camp = CARD_BY_ID[owner]?.camp ?? 'civile';
  const camps = [...new Set([camp === 'civile' ? 'socialistes' : camp, ...PARTY_CAMPS])].slice(0, 5);
  const game = createGame({ seed: 11, seats: 2, heroes: ['philippe', 'philippe'], activeCamps: camps as never });
  game.players[0].budget = 200;
  return game;
}

function check(game: Game, step: string): void {
  assert.deepEqual(invariantViolations(game), [], step);
}

/** A discover waiting blocks every other action: the first card is taken, as a hurried player would. */
function settle(game: Game): void {
  for (let guard = 0; game.players[0].discover && guard < 10; guard++) applyAction(game, 0, { t: 'discover', i: 0 });
}

/** A copy taken from the pool, as a purchase would. */
function recruit(game: Game, cardId: string): Minion | null {
  const p = game.players[0];
  if (!take(game, cardId)) return null;
  return addMinionToHand(game, p, cardId);
}

function lay(game: Game, cardId: string): Minion {
  const m = recruit(game, cardId) as Minion;
  assert.ok(m && applyAction(game, 0, { t: 'play', uid: m.uid }).ok, `${cardId} posé`);
  settle(game);
  return game.players[0].board.find((x) => x.uid === m.uid) ?? m;
}

function pose(game: Game, casseroleId: string, target: Minion, step: string): void {
  const p = game.players[0];
  p.casseroleOffer = casseroleId;
  const bought = applyAction(game, 0, { t: 'buy_casserole' });
  assert.equal(bought.ok, true, `${step} : achat (${bought.ok ? '' : bought.error} ; main ${p.hand.length + p.spells.length}, plateau ${p.board.length})`);
  const held = p.spells.find((s) => s.casseroleId === casseroleId);
  assert.ok(held, `${step} : en main`);
  const result = applyAction(game, 0, { t: 'cast', uid: held.uid, target: target.uid });
  assert.equal(result.ok, true, `${step} : pose (${result.ok ? '' : result.error})`);
  settle(game);
  check(game, step);
}

/** A round, combat included, then the next recruitment: the defects play, the people forget. */
function round(game: Game, step: string): void {
  // Nobody may be eliminated: the game would end before the cycle does.
  for (const p of game.players) p.hp = 999;
  resolveRound(game);
  check(game, step);
  settle(game);
  game.players[0].budget = 200;
}

for (const casserole of CASSEROLES) {
  for (const onOwner of [true, false]) {
    const who = onOwner ? 'propriétaire' : 'autre';
    test(`cycle de vie : ${casserole.id}, sur ${who}`, () => {
      const owner = CARD_BY_ID[casserole.owner] ? casserole.owner : STRANGER;
      const game = table(owner);
      const p = game.players[0];
      const target = lay(game, onOwner ? owner : STRANGER === owner ? 'kazib' : STRANGER);
      lay(game, 'durif');
      check(game, 'départ');

      pose(game, casserole.id, target, 'première casserole');
      if (!p.board.includes(target) && !p.hand.includes(target)) return;
      pose(game, casserole.id === SECOND ? 'lapsus' : SECOND, target, 'deuxième casserole');
      for (let r = 1; r <= 3; r++) round(game, `manche ${r} après le scandale`);
      if (!p.board.includes(target)) return;
      assert.equal(target.scandal, undefined, 'le peuple a oublié');

      pose(game, casserole.id, target, 'reposée après l\'oubli');
      round(game, 'manche après la repose');

      // A triple: two more copies of the target fuse it into a golden one, casseroles and all.
      const copies = [recruit(game, target.cardId), recruit(game, target.cardId)];
      if (copies.every(Boolean)) check(game, 'triple');
      const golden = p.hand.find((m) => m.golden && m.cardId === target.cardId);
      if (golden && p.board.length < 7) {
        const played = applyAction(game, 0, { t: 'play', uid: golden.uid });
        assert.equal(played.ok, true, `doré posé (${played.ok ? '' : played.error})`);
        settle(game);
        check(game, 'doré posé');
      }

      // Scandal again, then the Bracelet, then a sale once it has fallen.
      const carrier = p.board.find((m) => m.cardId === target.cardId) as Minion;
      if (!carrier) return;
      pose(game, SECOND, carrier, 'troisième casserole');
      pose(game, 'lapsus', carrier, 'quatrième casserole');
      if (carrier.scandal) {
        p.spells.push({ uid: 99001, spellId: 'bracelet_electronique' });
        assert.equal(applyAction(game, 0, { t: 'cast', uid: 99001 }).ok, true, 'bracelet');
        settle(game);
        check(game, 'bracelet');
        assert.equal(applyAction(game, 0, { t: 'sell', uid: carrier.uid }).ok, false, 'pas de renvoi sous bracelet');
      }
      round(game, 'manche après le bracelet');
      if (p.board.includes(carrier)) {
        assert.equal(carrier.bracelet, undefined, 'le bracelet est tombé');
        assert.equal(applyAction(game, 0, { t: 'sell', uid: carrier.uid }).ok, true, 'renvoyé');
        check(game, 'renvoyé');
      }
    });
  }
}
