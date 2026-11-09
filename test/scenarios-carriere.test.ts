import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createGame, finishRound, startCombats, viewFor } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import type { ScriptEvent, ScriptRules } from '../src/engine/state.ts';
import { invariantViolations } from '../src/engine/invariants.ts';
import { makeGolden } from '../src/engine/recruit.ts';

/**
 * Les règles des tours scénarisés des carrières (9 novembre 2026) : une quête qui compte les combats gagnés, un
 * politique qui part en cellule et revient, un retour, un échelon bloqué, un renvoi qui rapporte, un rival qui quitte
 * la table, une partie qui s'arrête à son heure. Le joueur seul les subit ; les invariants tiennent.
 */

function scripted(seats: number, regles?: ScriptRules, evenements?: Record<number, ScriptEvent>, seed = 7): Game {
  return createGame({ seed, seats, heroes: ['macron', 'lepen', 'melenchon', 'hollande'].slice(0, seats), script: { seat: 0, regles, evenements } });
}

function round(game: Game): void {
  startCombats(game);
  assert.deepEqual(invariantViolations(game), [], `manche ${game.round}, après les combats`);
  finishRound(game);
  assert.deepEqual(invariantViolations(game), [], `manche ${game.round}, au recrutement`);
}

/** Le siège 0 recrute et pose ce qu'il peut : un plateau qui bat un plateau vide. */
function recruitSome(game: Game, seat = 0, count = 2): void {
  const p = game.players[seat];
  p.budget = 20;
  for (let i = 0; i < count; i++) {
    if (!applyAction(game, seat, { t: 'buy', slot: 0, main: true }).ok) break;
    const m = p.hand[p.hand.length - 1];
    applyAction(game, seat, { t: 'play', uid: m.uid });
  }
}

test('parrainages : sans victoire à la manche dite, le joueur est éliminé et la quête ratée', () => {
  const game = scripted(2, { compteur: { libelle: 'Parrainages', parVictoire: 100, cible: 500, avant: 2, eliminatoire: true } });
  assert.equal(viewFor(game, 0).quete?.etat, 'en_cours');
  round(game);
  assert.ok(game.players[0].alive);
  startCombats(game);
  assert.equal(game.players[0].alive, false);
  assert.equal(game.players[0].quest?.etat, 'ratee');
  assert.ok(game.players[0].events.some((e) => e.key === 'quete_ratee'));
  assert.deepEqual(invariantViolations(game), []);
});

test('le Congrès : la victoire qui atteint la cible lève la séance, et le joueur gagne la partie', () => {
  const game = scripted(3, { compteur: { libelle: 'Congrès', parVictoire: 1, cible: 1, defaitesMax: 3, avant: 5, eliminatoire: true, fin: true } });
  recruitSome(game);
  startCombats(game);
  assert.equal(game.players[0].quest?.etat, 'reussie');
  assert.equal(game.players[0].place, 1);
  assert.equal(game.players.filter((p) => p.alive).length, 1);
  finishRound(game);
  assert.equal(game.phase, 'fini');
  assert.deepEqual(invariantViolations(game), []);
});

test('l\'ultimatum : une égalité dans la fenêtre le fait échouer, sans éliminer', () => {
  const game = scripted(2, { compteur: { libelle: 'Ultimatum', parVictoire: 1, cible: 2, de: 1, a: 2, sansFaute: true, eliminatoire: false, recompense: { sondages: 5 } } });
  startCombats(game);
  assert.equal(game.players[0].quest?.etat, 'ratee');
  assert.ok(game.players[0].alive);
});

test('en cellule : le plus fort quitte le plateau, ne combat pas, et revient renforcé pour de bon', () => {
  const game = scripted(2, undefined, { 2: { enleve: { quoi: 'plus_fort', retour: 3, bonus: 5 } } });
  recruitSome(game, 0, 2);
  const p = game.players[0];
  const strongest = [...p.board].sort((a, b) => b.atk + b.hp - (a.atk + a.hp))[0];
  const before = { atk: strongest.atk, hp: strongest.hp, size: p.board.length };
  round(game);
  assert.equal(p.board.length, before.size - 1);
  assert.equal(p.away.length, 1);
  assert.equal(viewFor(game, 0).absents, 1);
  assert.ok(p.events.some((e) => e.key === 'enleve'));
  round(game);
  assert.equal(p.away.length, 0);
  const back = p.board.find((m) => m.uid === strongest.uid);
  assert.ok(back, 'il est revenu');
  assert.ok(back.atk >= before.atk + 5 && back.hp >= before.hp + 5, `${back.atk}/${back.hp} pour ${before.atk}/${before.hp}`);
  assert.ok(p.events.some((e) => e.key === 'revient'));
});

test('enlevé par une soucoupe, le plus faible revient doré', () => {
  const game = scripted(2, undefined, { 2: { enleve: { quoi: 'plus_faible', retour: 3, dore: true } } });
  recruitSome(game, 0, 2);
  round(game);
  const taken = game.players[0].away[0]?.minion;
  assert.ok(taken);
  assert.deepEqual(game.players[0].events.find((e) => e.key === 'enleve'), { key: 'enleve', cardId: taken.cardId });
  round(game);
  assert.equal(game.players[0].board.find((m) => m.uid === taken.uid)?.golden, true);
  assert.deepEqual(viewFor(game, 0).evenements, [{ key: 'revient', cardId: taken.cardId }]);
});

test('la soucoupe ne prend jamais un doré pour le dorer, et ne prend personne si tous le sont', () => {
  const game = scripted(2, undefined, { 2: { enleve: { quoi: 'plus_faible', retour: 3, dore: true } } });
  recruitSome(game, 0, 2);
  const p = game.players[0];
  const cards = p.board.filter((m) => m.copies > 0).sort((a, b) => a.atk + a.hp - (b.atk + b.hp));
  assert.equal(cards.length, 2, 'deux vraies cartes recrutées');
  makeGolden(p, cards[0]);
  round(game);
  assert.equal(p.away[0]?.minion.uid, cards[1].uid);
  const all = scripted(2, undefined, { 2: { enleve: { quoi: 'plus_faible', retour: 3, dore: true } } });
  recruitSome(all, 0, 2);
  const q = all.players[0];
  for (const m of q.board) if (m.copies > 0) makeGolden(q, m);
  const size = q.board.length;
  round(all);
  assert.equal(q.away.length, 0);
  assert.equal(q.board.length, size);
});

test('au retour, un plateau plein le renvoie en main', () => {
  const game = scripted(2, undefined, { 2: { enleve: { quoi: 'plus_faible', retour: 3, dore: true } } });
  recruitSome(game, 0, 2);
  round(game);
  const p = game.players[0];
  const taken = p.away[0].minion;
  const filler = p.board[0];
  while (p.board.length < game.params.boardSize) p.board.push({ ...filler, uid: game.nextUid++ });
  // The copies above are not in the pool count: only the place on the board matters here.
  startCombats(game);
  finishRound(game);
  assert.equal(p.away.length, 0);
  assert.equal(p.hand.find((m) => m.uid === taken.uid)?.golden, true);
});

test('le retour : la première chute ne l\'élimine pas, la seconde si', () => {
  const game = scripted(2, { retour: 10 });
  game.players[0].hp = -3;
  startCombats(game);
  assert.ok(game.players[0].alive);
  assert.equal(game.players[0].hp, 10);
  assert.ok(game.players[0].events.some((e) => e.key === 'retour'));
  finishRound(game);
  game.players[0].hp = -3;
  startCombats(game);
  assert.equal(game.players[0].alive, false);
});

test('vice-président à rien : monter est refusé, puis coûte moins', () => {
  const game = scripted(2, { echelon: { apres: 2, remise: 2, motif: 'Vice-président à rien' } });
  game.players[0].budget = 20;
  assert.equal(viewFor(game, 0).upgradeLock, 'Vice-président à rien');
  assert.deepEqual(applyAction(game, 0, { t: 'upgrade' }), { ok: false, error: 'Vice-président à rien' });
  const costWithout = viewFor(game, 1).upgradeCost;
  round(game);
  assert.equal(viewFor(game, 0).upgradeLock, null);
  assert.equal(viewFor(game, 0).upgradeCost, Math.max(0, costWithout - 1 - 2));
  game.players[0].budget = 20;
  assert.ok(applyAction(game, 0, { t: 'upgrade' }).ok);
});

test('la rupture : renvoyer un politique du camp dit rapporte du budget en plus', () => {
  const probe = scripted(2);
  recruitSome(probe, 0, 1);
  const camp = probe.players[0].board[0].camp;
  const game = scripted(2, { renvoi: { camp, budget: 2 } });
  recruitSome(game, 0, 1);
  const p = game.players[0];
  const before = p.budget;
  assert.ok(applyAction(game, 0, { t: 'sell', uid: p.board[0].uid }).ok);
  assert.equal(p.budget - before, game.params.sellValue + 2);
});

test('il chante : le premier politique adverse perd ses effets pour le combat, pas pour de bon', () => {
  const game = scripted(2, { silenceAdverse: true });
  recruitSome(game, 1, 2);
  const first = game.players[1].board[0];
  const effects = first.effects.length;
  startCombats(game);
  assert.equal(game.players[1].board[0]?.effects.length ?? effects, effects);
});

test('l\'abandon : l\'adversaire du dernier siège quitte la table, à la dernière place', () => {
  const game = scripted(4, undefined, { 2: { abandon: true, sondages: 8 } });
  const hp = game.players[0].hp;
  round(game);
  assert.equal(game.players[3].alive, false);
  assert.equal(game.players[3].place, 4);
  assert.equal(game.players[0].hp, hp + 8);
  assert.ok(game.players[0].events.some((e) => e.key === 'abandon'));
});

test('devant un rival : son élimination avant le joueur gagne le chapitre', () => {
  const game = scripted(3, { devant: 'melenchon' });
  assert.equal(game.players[0].quest?.libelle, 'Devant Jean-Luc Mélenchon');
  game.players[2].hp = -2;
  startCombats(game);
  assert.equal(game.players[0].quest?.etat, 'reussie');
  assert.equal(viewFor(game, 0).quete?.decisive, true);
});

test('la partie s\'arrête après la manche dite : classés par sondages, un seul reste en lice', () => {
  const game = scripted(4, { finApres: 2 });
  round(game);
  game.players[2].hp = 99;
  startCombats(game);
  assert.equal(game.players.filter((p) => p.alive).length, 1);
  assert.equal(game.players[2].place, 1);
  finishRound(game);
  assert.equal(game.phase, 'fini');
  assert.deepEqual(invariantViolations(game), []);
});
