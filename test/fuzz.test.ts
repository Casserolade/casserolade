import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ROUNDS, census, checkCombats, checkGame, newCoverage, runFuzzGame } from './fuzzHarness.ts';
import { applyAction, createGame, finishRound, startCombats } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { addMinionToHand, addSpellToHand, take } from '../src/engine/recruit.ts';
import { CARDS, PARTY_CAMPS } from '../src/data/cards.ts';
import { CASSEROLES } from '../src/data/casseroles.ts';
import { SPELLS } from '../src/data/sorts.ts';

/**
 * Le fuzz du moteur (banc dans fuzzHarness.ts). Par défaut, la suite reste courte.
 * Pour la nuit : FUZZ_GAMES=2000 node --test test/fuzz.test.ts (FUZZ_SEED décale les graines).
 */
const GAMES = Number(process.env.FUZZ_GAMES ?? 0) || 36;
const SEED0 = Number(process.env.FUZZ_SEED ?? 0) || 1;

test(`fuzz du moteur : ${GAMES} parties, toutes les actions, valides ou non`, () => {
  const cov = newCoverage();
  let unfinished = 0;
  for (let i = 0; i < GAMES; i++) {
    const r = runFuzzGame(SEED0 + i, cov);
    if (!r.finished) unfinished++;
  }
  assert.equal(unfinished, 0, `${unfinished} parties sans fin en ${MAX_ROUNDS} manches`);
  assert.deepEqual(cov.botRefusals, [], 'un bot propose une action refusée');
  assert.deepEqual(cov.stalls, [], 'un bot tourne en rond');
  if (GAMES >= 200) {
    const cards = CARDS.map((c) => c.id).filter((id) => !cov.played.has(id));
    const spells = SPELLS.map((s) => s.id).filter((id) => !cov.cast.has(id));
    const casseroles = CASSEROLES.map((c) => c.id).filter((id) => !cov.casseroles.has(id));
    assert.deepEqual(cards, [], 'des cartes jamais jouées par le fuzz');
    assert.deepEqual(spells, [], 'des sorts jamais lancés par le fuzz');
    assert.deepEqual(casseroles, [], 'des casseroles jamais posées par le fuzz');
  }
  if (process.env.FUZZ_GAMES) {
    console.log(`fuzz : ${GAMES} parties, ${cov.combats} combats, ${cov.combatCaps} au plafond d'attaques`);
    console.log(`situations vérifiées : ${JSON.stringify(cov.events)}`);
  }
});

test('fuzz : même graine, mêmes actions, même partie', () => {
  for (const seed of [SEED0 + 1000, SEED0 + 1001, SEED0 + 1002]) {
    const a = runFuzzGame(seed, newCoverage());
    const b = runFuzzGame(seed, newCoverage());
    assert.deepEqual(a.trace, b.trace, `graine ${seed}`);
  }
});

/** Un geste, puis tous les invariants. */
function act(game: Game, total: Map<string, number>, seat: number, a: Parameters<typeof applyAction>[2], where: string): boolean {
  const ok = applyAction(game, seat, a).ok;
  checkGame(game, total, `${where} ${JSON.stringify(a)}`);
  return ok;
}

test('chaque carte, chaque sort et chaque casserole passent dans le moteur, invariants compris', () => {
  const cov = newCoverage();
  const spells = SPELLS.map((s) => s.id);
  CARDS.forEach((card, i) => {
    const others = PARTY_CAMPS.filter((c) => c !== card.camp).slice(0, 4);
    const game = createGame({ seed: 500 + i, seats: 2, heroes: ['attal', 'sarkozy'], activeCamps: card.camp === 'civile' ? others : [card.camp, ...others], combatLog: true, params: { casseroleFromRound: 1 } });
    const total = census(game);
    const where = `${card.id}`;
    for (let round = 0; round < 4 && game.phase === 'recrutement'; round++) {
      for (const p of game.players) {
        if (!p.alive) continue;
        p.budget += 30;
        // La carte étudiée, puis des voisins pris dans la réserve, en main puis sur le plateau.
        const ids = [card.id, ...CARDS.filter((c, j) => (j + round + p.seat) % 13 === 0).map((c) => c.id)].slice(0, 3);
        for (const id of ids) if (p.hand.length + p.spells.length < game.params.handSize && take(game, id)) addMinionToHand(game, p, id);
        checkGame(game, total, `${where} main`);
        for (const m of [...p.hand]) {
          if (p.discover) act(game, total, p.seat, { t: 'discover', i: 0 }, where);
          const other = p.board.find((x) => x !== m);
          const rally = m.keywords.includes('ralliement') && other && round % 2 === 1;
          if (act(game, total, p.seat, rally ? { t: 'play', uid: m.uid, onto: other.uid } : { t: 'play', uid: m.uid, ...(other ? { target: other.uid } : {}) }, where)) {
            cov.played.add(m.cardId);
          }
        }
        // Un sort et une casserole par manche, chacun son tour.
        const spellId = spells[(i * 4 + round * 2 + p.seat) % spells.length];
        const casseroleId = CASSEROLES[(i * 4 + round * 2 + p.seat) % CASSEROLES.length].id;
        addSpellToHand(game, p, spellId, spellId === 'investiture' ? 2 : undefined);
        const held = p.spells.find((s) => s.spellId === spellId);
        if (p.discover) act(game, total, p.seat, { t: 'discover', i: 0 }, where);
        if (held && act(game, total, p.seat, { t: 'cast', uid: held.uid, ...(p.board[0] ? { target: p.board[0].uid } : {}) }, where)) cov.cast.add(spellId);
        for (const target of [p.board[0], p.board[0], p.board[1]]) {
          if (!target || p.discover) continue;
          p.casseroleOffer = casseroleId;
          act(game, total, p.seat, { t: 'buy_casserole' }, where);
          const c = p.spells.find((s) => s.casseroleId === casseroleId);
          if (c && act(game, total, p.seat, { t: 'cast', uid: c.uid, target: target.uid }, where)) cov.casseroles.add(casseroleId);
        }
        act(game, total, p.seat, { t: 'sell', uid: p.board[p.board.length - 1]?.uid ?? -1 }, where);
        act(game, total, p.seat, { t: 'roll' }, where);
      }
      const aliveBefore = game.players.filter((p) => p.alive).map((p) => p.seat);
      startCombats(game);
      checkCombats(game, cov, `${where} combat`, aliveBefore);
      checkGame(game, total, `${where} combat`);
      finishRound(game);
    }
  });
  assert.deepEqual(CARDS.map((c) => c.id).filter((id) => !cov.played.has(id)), [], 'des cartes jamais jouées');
  assert.deepEqual(spells.filter((id) => !cov.cast.has(id)), [], 'des sorts jamais lancés');
  assert.deepEqual(CASSEROLES.map((c) => c.id).filter((id) => !cov.casseroles.has(id)), [], 'des casseroles jamais posées');
});
