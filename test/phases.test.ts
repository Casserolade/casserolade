import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, chooseRemainingHeroes, createGame, finishRound, finalRanking, resolveRound, startCombats, viewFor } from '../src/engine/game.ts';
import { PARAMS } from '../src/data/params.ts';
import { HERO_BY_ID } from '../src/data/heroes.ts';
import { PLATEAUX, SECOND_TOUR } from '../src/data/plateaux.ts';
import { ANIMATEURS, animateurFor } from '../src/data/animateurs.ts';

test('without hero selection, the game starts straight in recruitment', () => {
  const game = createGame({ seed: 1 });
  assert.equal(game.phase, 'recrutement');
  assert.equal(game.round, 1);
});

test('hero selection offers the configured number of heroes and holds the round', () => {
  const game = createGame({ seed: 1, heroSelection: true });
  assert.equal(game.phase, 'choix_heros');
  assert.equal(game.round, 0);
  const view = viewFor(game, 0);
  assert.equal(view.heroOffers?.length, PARAMS.heroChoices);
  assert.equal(view.shop.length, 0);
  assert.deepEqual(applyAction(game, 0, { t: 'roll' }), { ok: false, error: 'Choisissez d\'abord votre héros.' });
});

test('during selection, nobody can see what another seat was offered', () => {
  const game = createGame({ seed: 1, heroSelection: true });
  const view = viewFor(game, 0);
  for (const row of view.table) assert.equal(row.heroId, null);
  assert.ok(!JSON.stringify(view).includes(JSON.stringify(game.players[1].heroOffers)));
});

test('choosing a hero sets it and its sondages; the round starts when all have chosen', () => {
  const game = createGame({ seed: 2, heroSelection: true, seats: 2 });
  const heroId = game.players[0].heroOffers?.[1] as string;
  assert.deepEqual(applyAction(game, 0, { t: 'hero', i: 1 }), { ok: true });
  assert.equal(game.players[0].hero.id, heroId);
  assert.equal(game.players[0].hp, PARAMS.startHp + HERO_BY_ID[heroId].hpBonus);
  assert.equal(game.phase, 'choix_heros');
  assert.deepEqual(applyAction(game, 0, { t: 'hero', i: 0 }), { ok: false, error: 'Héros déjà choisi.' });
  assert.deepEqual(applyAction(game, 1, { t: 'hero', i: 9 }), { ok: false, error: 'Choix invalide.' });
  applyAction(game, 1, { t: 'hero', i: 0 });
  assert.equal(game.phase, 'recrutement');
  assert.equal(game.round, 1);
  assert.equal(viewFor(game, 1).shop.length, PARAMS.shopSize[1]);
  assert.deepEqual(applyAction(game, 1, { t: 'hero', i: 0 }), { ok: false, error: 'Le choix du héros est terminé.' });
});

test('when the timer runs out, the remaining seats take their first offer', () => {
  const game = createGame({ seed: 3, heroSelection: true, seats: 3 });
  applyAction(game, 0, { t: 'hero', i: 1 });
  const expected = game.players[2].heroOffers?.[0];
  chooseRemainingHeroes(game);
  assert.equal(game.players[2].hero.id, expected);
  assert.equal(game.phase, 'recrutement');
});

test('imposed heroes are not offered: story mode can mix both', () => {
  const game = createGame({ seed: 3, heroSelection: true, seats: 2, heroes: ['attal', undefined] });
  assert.equal(game.players[0].heroOffers, null);
  assert.equal(game.players[0].hero.id, 'attal');
  assert.equal(game.phase, 'choix_heros');
  const all = createGame({ seed: 3, heroSelection: true, seats: 2, heroes: ['attal', 'macron'] });
  assert.equal(all.phase, 'recrutement');
});

test('combat and next round are two separate steps', () => {
  const game = createGame({ seed: 5 });
  startCombats(game);
  assert.equal(game.phase, 'combat');
  assert.equal(game.round, 1);
  assert.equal(game.roundCombats.length, 4);
  assert.deepEqual(applyAction(game, 0, { t: 'roll' }), { ok: false, error: 'Le recrutement est terminé.' });
  startCombats(game);
  assert.equal(game.round, 1, 'a second call must not replay the combats');
  finishRound(game);
  assert.equal(game.phase, 'recrutement');
  assert.equal(game.round, 2);
  finishRound(game);
  assert.equal(game.round, 2, 'finishRound does nothing outside the combat phase');
});

test('resolveRound still chains both steps, and a game still ends', () => {
  const game = createGame({ seed: 6, seats: 2, heroes: ['attal', 'attal'] });
  for (let guard = 0; game.phase === 'recrutement' && guard < 60; guard++) resolveRound(game);
  assert.equal(game.phase, 'fini');
  const ranking = finalRanking(game);
  assert.deepEqual(ranking.map((r) => r.place), [1, 2]);
});

test('the view carries the phase, and a host for every plateau', () => {
  const game = createGame({ seed: 7 });
  const view = viewFor(game, 0);
  assert.equal(view.phase, 'recrutement');
  assert.equal(view.animateur.plateau, 'france3');
  // A real host on every plateau (the user's rule, 3 November 2026): the info ticker is only a fallback.
  for (const plateau of [...PLATEAUX, SECOND_TOUR]) assert.ok(animateurFor(plateau.id).reel, `${plateau.id} n'a pas de vrai animateur`);
  for (const a of ANIMATEURS) if (a.plateau) assert.equal(animateurFor(a.plateau).id, a.id, `${a.id} n'est pas le seul sur ${a.plateau}`);
});

test('the view shares no mutable array with the game', () => {
  const game = createGame({ seed: 8, seats: 2, heroes: ['attal', 'attal'] });
  applyAction(game, 0, { t: 'buy', slot: 0 });
  applyAction(game, 1, { t: 'buy', slot: 0 });
  resolveRound(game);
  const view = viewFor(game, 0);
  assert.equal(view.seen.length, 1);
  view.seen[0].board[0].atk = 999;
  view.seen.pop();
  assert.equal(game.players[0].seen.length, 1);
  assert.notEqual(game.players[0].seen[0].board[0].atk, 999);
});

test('no two seats end up with the same hero, and nobody is left without a choice', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const game = createGame({ seed, heroSelection: true });
    for (let seat = 7; seat >= 0; seat--) {
      const offers = game.players[seat].heroOffers;
      assert.ok(offers && offers.length >= 1, `seed ${seed}, seat ${seat} has no choice left`);
      assert.equal(new Set(offers).size, offers.length);
      // A solo player chooses after the 7 bots: they must always get a real choice.
      if (seat === 0) assert.equal(offers.length, PARAMS.heroChoices, `seed ${seed}`);
      applyAction(game, seat, { t: 'hero', i: seed % 2 });
    }
    assert.equal(new Set(game.players.map((p) => p.hero.id)).size, 8, `seed ${seed}`);
  }
});

test('the timer path gives distinct heroes too', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const game = createGame({ seed, heroSelection: true });
    chooseRemainingHeroes(game);
    assert.equal(new Set(game.players.map((p) => p.hero.id)).size, 8, `seed ${seed}`);
  }
});
