import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, finishRound, startCombats } from '../src/engine/game.ts';

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
