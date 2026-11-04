import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, combatViewFor, createGame, finishRound, startCombats, viewFor } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { applyCombatEvent } from '../src/engine/replay.ts';
import type { CombatSides } from '../src/engine/replay.ts';
import { createRng } from '../src/engine/rng.ts';
import type { CombatEvent, Rng } from '../src/engine/types.ts';
import { CONTEXTS } from '../src/data/heroes.ts';

/** A scripted player that buys, rolls, upgrades and loads casseroles, to reach as many effects as possible. */
function playRecruitment(game: Game, policy: Rng): void {
  for (const p of game.players) {
    if (!p.alive) continue;
    for (let i = 0; i < 8; i++) {
      const v = viewFor(game, p.seat);
      const roll = policy.int(10);
      if (v.discover) applyAction(game, p.seat, { t: 'discover', i: policy.int(v.discover.length) });
      else if (roll < 4 && v.shop.length) applyAction(game, p.seat, { t: 'buy', slot: policy.int(v.shop.length) });
      else if (roll === 4) applyAction(game, p.seat, { t: 'roll' });
      else if (roll === 5) applyAction(game, p.seat, { t: 'upgrade' });
      else if (roll === 6) applyAction(game, p.seat, { t: 'buy_casserole' });
      else if (roll === 7 && v.spells.length && v.board.length) {
        applyAction(game, p.seat, { t: 'cast', uid: v.spells[policy.int(v.spells.length)].uid, target: v.board[policy.int(v.board.length)].uid });
      } else if (roll === 8 && v.hand.length) applyAction(game, p.seat, { t: 'play', uid: v.hand[0].uid });
    }
  }
}

function replay(log: CombatEvent[]): CombatSides {
  return log.reduce<CombatSides>(applyCombatEvent, [[], []]);
}

function playGames(seeds: number, onRound: (game: Game) => void): void {
  for (let seed = 1; seed <= seeds; seed++) {
    const contextId = CONTEXTS[seed % CONTEXTS.length].id;
    const game = createGame({ seed, contextId, combatLog: true });
    const policy = createRng(seed + 1000);
    for (let guard = 0; game.phase === 'recrutement' && guard < 60; guard++) {
      playRecruitment(game, policy);
      startCombats(game);
      onRound(game);
      finishRound(game);
    }
  }
}

test('replaying a log without simulation reaches the final state, on every combat', () => {
  const seenEvents = new Set<string>();
  let combats = 0;
  playGames(150, (game) => {
    for (const { result } of game.roundCombats) {
      const log = result.log;
      for (const ev of log) seenEvents.add(ev.e);
      assert.equal(log[0].e, 'debut');
      // After the end come only the speeches: the Célébration and the Droit de réponse.
      const end = log.findIndex((ev) => ev.e === 'fin');
      assert.ok(log.slice(end + 1).every((ev) => ev.e === 'celebration' || ev.e === 'reponse' || (ev.e === 'effet' && ev.when === 'celebration')));
      const last = log[end];
      if (last.e !== 'fin') continue;
      // The end event sets the state outright: stop before it, or the check would compare it to itself.
      const replayed = replay(log.slice(0, end));
      assert.deepEqual(replayed, last.sides);
      assert.deepEqual([replayed[0].length, replayed[1].length], result.survivors);
      combats++;
    }
  });
  assert.ok(combats > 500, `only ${combats} combats`);
  // Otherwise the replay check above would prove nothing about these events.
  for (const e of ['degats', 'immunite', 'polemique', 'stats', 'mot_cle', 'effet', 'mort', 'retour', 'invocation', 'penalite', 'celebration', 'reponse']) {
    assert.ok(seenEvents.has(e), `no combat produced the event ${e}`);
  }
});

test('the log shows damage consistent with the attacks', () => {
  playGames(10, (game) => {
    for (const { result } of game.roundCombats) {
      for (const ev of result.log) {
        if (ev.e === 'degats') assert.ok(ev.value > 0);
      }
    }
  });
});

test('every combat with a winner ends with a Célébration by one of its survivors', () => {
  let celebrations = 0;
  playGames(30, (game) => {
    for (const { result } of game.roundCombats) {
      const end = result.log.find((ev) => ev.e === 'fin');
      const speech = result.log.find((ev) => ev.e === 'celebration');
      if (!end || end.e !== 'fin') continue;
      if (end.winner === null) {
        assert.equal(speech, undefined);
        continue;
      }
      assert.ok(speech && speech.e === 'celebration');
      assert.equal(speech.side, end.winner);
      assert.ok(end.sides[end.winner].some((u) => u.uid === speech.uid));
      celebrations++;
    }
  });
  assert.ok(celebrations > 100);
});

test('the simulator pays nothing for the log: it stays empty by default', () => {
  const game = createGame({ seed: 4 });
  applyAction(game, 0, { t: 'buy', slot: 0 });
  startCombats(game);
  for (const c of game.roundCombats) assert.equal(c.result.log.length, 0);
});

test('a seat sees its own combat, from its own side, and only that one', () => {
  playGames(10, (game) => {
    for (const p of game.players) {
      const view = combatViewFor(game, p.seat);
      if (!p.alive && !game.roundCombats.some((c) => c.a === p.seat || c.b === p.seat)) {
        assert.equal(view, null);
        continue;
      }
      assert.ok(view);
      const record = game.roundCombats.find((c) => c.a === p.seat || c.b === p.seat);
      assert.equal(view.log, record?.result.log);
      assert.equal(view.side, record?.a === p.seat ? 0 : 1);
    }
  });
});

test('a combat view carries the damage actually applied to the sondages', () => {
  const game = createGame({ seed: 12, seats: 2, heroes: ['attal', 'attal'], combatLog: true });
  applyAction(game, 0, { t: 'buy', slot: 0 });
  const before = game.players.map((p) => p.hp);
  startCombats(game);
  const view = combatViewFor(game, 0);
  assert.ok(view);
  const own = view.side;
  assert.equal(before[0] - game.players[0].hp, view.damage[own]);
  assert.equal(before[1] - game.players[1].hp, view.damage[own === 0 ? 1 : 0]);
  assert.equal(view.winner, own);
  assert.ok(view.damage[own === 0 ? 1 : 0] > 0);
});
