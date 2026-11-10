import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot, decide } from '../src/bots/bots.ts';
import { applyAction, combatViewFor, createGame, finishRound, startCombats, viewFor } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';

/**
 * Les rencontres de chaque manche. Retour de partie (3 novembre 2026) : « je n'ai jamais croisé
 * mon collègue alors que j'ai croisé 3 fois Bardella ». L'appariement tiré au hasard n'évitait que le
 * dernier adversaire : 22 % des paires ne se croisaient jamais.
 */
function playEmptyRounds(seats: number, rounds: number, seed: number) {
  const game = createGame({ seed, seats });
  for (let r = 0; r < rounds; r++) {
    startCombats(game);
    finishRound(game);
  }
  return game;
}

test('à huit, chacun croise les sept autres en sept manches', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const game = playEmptyRounds(8, 7, seed);
    for (const p of game.players) {
      assert.equal(new Set(p.opponents).size, 7, `graine ${seed}, siège ${p.seat} : ${p.opponents}`);
    }
  }
});

test('on ne retrouve pas un adversaire des trois dernières manches tant qu\'il en reste d\'autres', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const game = playEmptyRounds(8, 14, seed);
    for (const p of game.players) {
      p.opponents.forEach((other, i) => {
        assert.ok(!p.opponents.slice(Math.max(0, i - 3), i).includes(other), `graine ${seed}, siège ${p.seat} : ${p.opponents}`);
      });
    }
  }
});

test('en nombre impair, le fantôme change de victime à chaque manche', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const game = playEmptyRounds(7, 7, seed);
    const ghostBySeat = game.players.map((p) => p.opponents.filter((x) => x === -1).length);
    assert.ok(Math.max(...ghostBySeat) <= 2, `graine ${seed} : ${ghostBySeat}`);
    for (const p of game.players) {
      p.opponents.forEach((other, i) => assert.ok(!(other === -1 && p.opponents[i - 1] === -1), `graine ${seed}, siège ${p.seat} : fantôme deux fois de suite`));
    }
  }
});

/** Each seat still in the game recruits as a bot would, for one round. */
function recruit(game: Game, seed: number): void {
  for (const p of game.players.filter((q) => q.alive)) {
    const bot = createBot('moyen', seed * 31 + p.seat + 1);
    for (let n = 0; n < 60; n++) {
      const action = decide(viewFor(game, p.seat), bot);
      if (!action || !applyAction(game, p.seat, action).ok) break;
    }
  }
}

/** The board of the ghost, as the one who met it saw it. */
function ghostBoardSeenBy(game: Game, seat: number): number[] {
  return (game.players[seat].seen.find((entry) => entry.seat === -1)?.board ?? []).map((m) => m.uid);
}

// Retour de partie du 9 novembre 2026 : à cinq (Hénin-Beaumont, carrière de Mélenchon), un adversaire sans visage, et
// une victoire tout de suite. Avant la première élimination, le fantôme n'avait qu'un plateau vide.
test('table impaire, personne d\'éliminé : le fantôme copie le plateau d\'un autre joueur en lice, plus de victoire gratuite', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const game = createGame({ seed, seats: 5 });
    recruit(game, seed);
    const boards = new Map(game.players.map((p) => [p.hero.id, p.board.map((m) => m.uid)]));
    startCombats(game);
    const record = game.roundCombats.find((c) => c.b === -1);
    assert.ok(record, `graine ${seed} : personne contre le fantôme`);
    const facing = game.players[record.a];
    assert.ok(record.ghostOf && record.ghostOf !== facing.hero.id && boards.has(record.ghostOf), `graine ${seed} : le fantôme copie ${record.ghostOf}`);
    assert.deepEqual(ghostBoardSeenBy(game, facing.seat), boards.get(record.ghostOf));
    assert.ok(ghostBoardSeenBy(game, facing.seat).length > 0, `graine ${seed} : plateau du fantôme vide`);
    assert.deepEqual(combatViewFor(game, facing.seat)?.opponent, { seat: -1, heroId: 'fantome', ghostOf: record.ghostOf });
    finishRound(game);
  }
});

test('table impaire après une élimination : le fantôme est le dernier éliminé, avec son dernier plateau', () => {
  const game = createGame({ seed: 4, seats: 4 });
  recruit(game, 4);
  const dead = game.players[3];
  dead.alive = false;
  game.lastEliminated = { heroId: dead.hero.id, board: dead.board.map((m) => ({ ...m })) };
  startCombats(game);
  const record = game.roundCombats.find((c) => c.b === -1);
  assert.ok(record);
  assert.equal(record.ghostOf, dead.hero.id);
  assert.deepEqual(ghostBoardSeenBy(game, record.a), dead.board.map((m) => m.uid));
});

// 10 novembre 2026 : à Battlegrounds, on sait pendant le recrutement qui l'on affrontera. Les rencontres se tirent donc
// au début du recrutement, et non plus au combat.
test('pendant le recrutement, chacun voit son prochain adversaire, et c\'est bien lui qu\'il affronte', () => {
  for (const seats of [8, 5]) {
    for (let seed = 1; seed <= 10; seed++) {
      const game = createGame({ seed, seats });
      for (let round = 0; round < 4; round++) {
        recruit(game, seed);
        const announced = game.players.map((p) => viewFor(game, p.seat).nextOpponent);
        for (const p of game.players) if (p.alive) assert.ok(announced[p.seat], `${seats} sièges, graine ${seed} : pas d'adversaire annoncé`);
        // Chacun est annoncé à un seul adversaire, qui le voit en retour.
        announced.forEach((next, seat) => next && next.seat >= 0 && assert.equal(announced[next.seat]?.seat, seat));
        startCombats(game);
        game.players.forEach((p, seat) => assert.deepEqual(combatViewFor(game, seat)?.opponent.seat, announced[seat]?.seat, `${seats} sièges, graine ${seed}, manche ${game.round}`));
        assert.equal(viewFor(game, 0).nextOpponent, null, 'hors du recrutement, aucun prochain adversaire');
        finishRound(game);
      }
    }
  }
});

test('le fantôme annoncé a les traits du dernier éliminé, quand il y en a un', () => {
  const game = createGame({ seed: 4, seats: 4 });
  recruit(game, 4);
  startCombats(game);
  const dead = game.players[3];
  dead.hp = 0;
  dead.alive = false;
  game.lastEliminated = { heroId: dead.hero.id, board: dead.board.map((m) => ({ ...m })) };
  finishRound(game);
  const facingGhost = game.players.find((p) => viewFor(game, p.seat).nextOpponent?.seat === -1);
  assert.ok(facingGhost, 'à trois, quelqu\'un affronte le fantôme');
  assert.deepEqual(viewFor(game, facingGhost.seat).nextOpponent, { seat: -1, heroId: 'fantome', ghostOf: dead.hero.id });
  startCombats(game);
  assert.deepEqual(combatViewFor(game, facingGhost.seat)?.opponent, { seat: -1, heroId: 'fantome', ghostOf: dead.hero.id });
});
