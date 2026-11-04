import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createGame, finishRound, startCombats } from '../src/engine/game.ts';
import { invariantViolations } from '../src/engine/invariants.ts';
import { PHASE_TRANSITIONS, enterPhase } from '../src/engine/phases.ts';
import type { GamePhase } from '../src/engine/state.ts';

const PHASES: GamePhase[] = ['choix_heros', 'recrutement', 'combat', 'fini'];

test('la machine à états ne permet que les transitions de sa table', () => {
  for (const from of PHASES) {
    for (const to of PHASES) {
      const game = createGame({ seed: 1, seats: 2 });
      game.phase = from;
      const allowed = PHASE_TRANSITIONS[from].includes(to);
      if (allowed) {
        enterPhase(game, to);
        assert.equal(game.phase, to);
      } else {
        assert.throws(() => enterPhase(game, to), /Transition interdite/, `${from} → ${to} devrait être refusée`);
        assert.equal(game.phase, from, 'une transition refusée ne change pas la phase');
      }
    }
  }
});

test('une partie suit la machine : recrutement, combat, recrutement… et rien ne s\'y joue hors du recrutement', () => {
  const game = createGame({ seed: 9, seats: 2 });
  assert.equal(game.phase, 'recrutement');
  startCombats(game);
  assert.equal(game.phase, 'combat');
  assert.equal(applyAction(game, 0, { t: 'roll' }).ok, false, 'pas d\'action pendant le combat');
  // Appelés hors de leur phase, les passages de manche ne font rien.
  startCombats(game);
  assert.equal(game.phase, 'combat');
  finishRound(game);
  assert.equal(game.phase, 'recrutement');
  finishRound(game);
  assert.equal(game.phase, 'recrutement');
  assert.equal(createGame({ seed: 9, seats: 2, heroSelection: true }).phase, 'choix_heros');
});

test('les invariants voient une partie corrompue', () => {
  const healthy = createGame({ seed: 4, seats: 2 });
  assert.deepEqual(invariantViolations(healthy), [], 'une partie neuve est saine');

  const leak = createGame({ seed: 4, seats: 2 });
  const cardId = leak.players[0].shop[0];
  leak.pool.set(cardId, (leak.pool.get(cardId) ?? 0) + 1);
  assert.ok(invariantViolations(leak).some((v) => v.includes(`exemplaires de ${cardId}`)), 'un exemplaire créé de rien');

  const broke = createGame({ seed: 4, seats: 2 });
  broke.players[1].budget = -2;
  assert.ok(invariantViolations(broke).some((v) => v.includes('budget -2')), 'un budget négatif');

  const twins = createGame({ seed: 4, seats: 2 });
  applyAction(twins, 0, { t: 'buy', slot: 0 });
  const bought = twins.players[0].board[0] ?? twins.players[0].hand[0];
  assert.ok(bought, 'un politique acheté');
  twins.players[1].board.push({ ...bought });
  assert.ok(invariantViolations(twins).some((v) => v.includes('identifiants en double')), 'deux politiques au même identifiant');

  const stuck = createGame({ seed: 4, seats: 2 });
  stuck.players[0].heroOffers = ['macron'];
  assert.ok(invariantViolations(stuck).some((v) => v.includes('héros à choisir')), 'un héros à choisir en plein recrutement');
});
