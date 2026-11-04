import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createGame, resolveRound, viewFor } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { createRng } from '../src/engine/rng.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { PARAMS } from '../src/data/params.ts';

function setup(seed = 5) {
  const game = createGame({ seed, heroes: Array(8).fill('attal') });
  const p = game.players[0];
  p.budget = 100;
  const buy = (cardId: string, extra: { to?: number; main?: boolean } = {}) => {
    p.shop = [cardId];
    return applyAction(game, 0, { t: 'buy', slot: 0, ...extra });
  };
  const tracts = () => p.spells.find((s) => s.spellId === 'tract')?.count ?? 0;
  return { game, p, buy, tracts };
}

test('un achat va sur le plateau par défaut, en main sur demande, et en main si le plateau est plein', () => {
  const { p, buy } = setup();
  assert.equal(buy('kazib').ok, true);
  assert.equal(p.board.length, 1);
  assert.equal(buy('cheminade', { main: true }).ok, true);
  assert.equal(p.board.length, 1);
  assert.equal(p.hand.length, 1);
  for (const id of ['durif', 'lalanne', 'arthaud', 'roussel', 'poutou', 'chirac']) buy(id);
  assert.equal(p.board.length, PARAMS.boardSize);
  assert.equal(buy('lassalle').ok, true);
  assert.equal(p.hand.map((m) => m.cardId).includes('lassalle'), true);
});

test('une carte en main ne combat pas, et reste d\'une manche à l\'autre', () => {
  const { game, p, buy } = setup();
  buy('kazib', { main: true });
  const uid = p.hand[0].uid;
  resolveRound(game);
  assert.equal(p.hand[0].uid, uid);
  assert.equal(p.board.length, 0);
});

test('poser une carte choisit sa place, et son Annonce vise l\'allié choisi', () => {
  const { game, p, buy } = setup();
  buy('kazib');
  buy('cheminade');
  buy('valls', { main: true }); // Annonce : donne Retour en politique à un autre allié.
  const cheminade = p.board[1];
  assert.equal(applyAction(game, 0, { t: 'play', uid: p.hand[0].uid, to: 1, target: cheminade.uid }).ok, true);
  assert.deepEqual(p.board.map((m) => m.cardId), ['kazib', 'valls', 'cheminade']);
  assert.equal(cheminade.keywords.includes('retour'), true);
  assert.equal(p.board[0].keywords.includes('retour'), false);
});

test('une cible qui n\'est pas sur le plateau est refusée, sans rien changer', () => {
  const { game, p, buy } = setup();
  buy('kazib');
  buy('valls', { main: true });
  const before = JSON.stringify([p.board, p.hand]);
  assert.equal(applyAction(game, 0, { t: 'play', uid: p.hand[0].uid, target: 999 }).ok, false);
  assert.equal(JSON.stringify([p.board, p.hand]), before);
});

test('l\'Annonce ne se déclenche qu\'à la pose, et les Tracts s\'empilent en une carte', () => {
  const { game, p, buy, tracts } = setup();
  buy('kazib', { main: true }); // Annonce : ajoutez un Tract.
  assert.equal(tracts(), 0);
  assert.equal(applyAction(game, 0, { t: 'play', uid: p.hand[0].uid }).ok, true);
  assert.equal(tracts(), 1);
  buy('kazib');
  assert.equal(tracts(), 2);
  assert.equal(p.spells.length, 1, 'une seule carte pour la pile');
  const target = p.board[0];
  const [atk, hp] = [target.atk, target.hp];
  assert.equal(applyAction(game, 0, { t: 'cast', uid: p.spells[0].uid, target: target.uid }).ok, true);
  assert.deepEqual([target.atk, target.hp], [atk + 1, hp + 1]);
  assert.equal(tracts(), 1);
});

test('main pleine : on ne prend plus, sauf si la fusion libère la place', () => {
  const { p, buy } = setup();
  for (const id of ['kazib', 'kazib', 'cheminade', 'durif', 'lalanne', 'arthaud', 'branco', 'roussel', 'poutou', 'lassalle']) buy(id, { main: true });
  assert.equal(p.hand.length, PARAMS.handSize);
  const before = JSON.stringify([p.hand, p.board, p.budget]);
  assert.equal(buy('chirac', { main: true }).ok, false);
  assert.equal(JSON.stringify([p.hand, p.board, p.budget]), before);
  assert.equal(buy('kazib', { main: true }).ok, true);
  assert.equal(p.hand.filter((m) => m.golden).length, 1);
  assert.equal(p.hand.length, PARAMS.handSize - 1);
});

test('le triple se compte sur la main et le plateau, le troisième exemplaire ne déclenche pas son Annonce, et le doré double ses effets', () => {
  const { game, p, buy, tracts } = setup();
  buy('kazib');
  buy('kazib', { main: true });
  assert.equal(tracts(), 1);
  buy('kazib');
  assert.equal(tracts(), 1);
  assert.equal(p.board.length, 0);
  assert.equal(p.hand.length, 1);
  assert.equal(p.hand[0].golden, true);
  applyAction(game, 0, { t: 'play', uid: p.hand[0].uid });
  assert.equal(tracts(), 3, 'doré : deux Tracts');
  assert.equal(p.spells.some((s) => s.spellId === 'investiture'), true);
});

test('l\'Investiture se fixe à la pose du doré : le garder pour monter d\'abord donne un meilleur choix', () => {
  const { game, p, buy } = setup();
  for (let i = 0; i < 3; i++) buy('kazib', { main: true });
  const uid = p.hand[0].uid;
  applyAction(game, 0, { t: 'upgrade' });
  applyAction(game, 0, { t: 'upgrade' });
  assert.equal(p.tier, 3);
  applyAction(game, 0, { t: 'play', uid });
  const investiture = p.spells.find((s) => s.spellId === 'investiture');
  assert.equal(investiture?.tier, 4);
  applyAction(game, 0, { t: 'upgrade' });
  assert.equal(applyAction(game, 0, { t: 'cast', uid: investiture!.uid }).ok, true);
  for (const id of p.discover?.options ?? []) assert.equal(CARD_BY_ID[id].tier, 4, 'l\'échelon reste celui de la pose');
});

test('un doré créé par un effet ne donne pas d\'Investiture', () => {
  const { game, p, buy } = setup();
  buy('kazib');
  buy('philippe', { main: true }); // Annonce : rend doré un autre serviteur d'échelon 3 ou moins.
  applyAction(game, 0, { t: 'play', uid: p.hand[0].uid, target: p.board[0].uid });
  assert.equal(p.board[0].golden, true);
  assert.equal(p.spells.some((s) => s.spellId === 'investiture'), false);
});

test('une découverte ne propose jamais la carte qui la déclenche : vendre Poisson ne le redécouvre pas', () => {
  // Avant, vendre Poisson (+1) le redécouvrait : on le posait, on revendait, et le budget montait sans fin.
  for (let seed = 1; seed <= 20; seed++) {
    const game = createGame({ seed, heroes: Array(8).fill('attal'), activeCamps: ['reconquete', 'rn', 'macronie', 'republicains', 'insoumis'] });
    const p = game.players[0];
    p.tier = 2;
    p.shop = ['poisson'];
    p.budget = 3;
    applyAction(game, 0, { t: 'buy', slot: 0 });
    assert.equal(applyAction(game, 0, { t: 'sell', uid: p.board[0].uid }).ok, true);
    const offered = p.discover?.options ?? [];
    assert.equal(offered.length, 3, `graine ${seed} : ${offered}`);
    assert.ok(!offered.includes('poisson'), `graine ${seed} : Poisson se redécouvre (${offered})`);
  }
});

test('le choix est réservé : les autres ne peuvent pas le vider, et on rend ce qu\'on ne prend pas', () => {
  const { game, p, buy } = setup();
  for (let i = 0; i < 3; i++) buy('kazib', { main: true });
  applyAction(game, 0, { t: 'play', uid: p.hand[0].uid });
  const investiture = p.spells.find((s) => s.spellId === 'investiture') as { uid: number };
  applyAction(game, 0, { t: 'cast', uid: investiture.uid });
  const offered = [...(p.discover?.options ?? [])];
  assert.equal(offered.length, 3);
  const during = offered.map((id) => game.pool.get(id) as number);
  assert.equal(applyAction(game, 0, { t: 'roll' }).ok, false, 'le choix bloque les autres actions');
  applyAction(game, 0, { t: 'discover', i: 0 });
  assert.equal(p.hand.at(-1)?.cardId, offered[0]);
  assert.equal(game.pool.get(offered[0]), during[0]);
  assert.equal(game.pool.get(offered[1]), during[1] + 1);
});

test('une carte de la main se renvoie, et un bracelet garde sa place quand on pose à côté', () => {
  const { game, p, buy } = setup();
  buy('kazib');
  buy('cheminade');
  p.board[0].locked = true;
  buy('durif', { main: true });
  const uid = p.hand[0].uid;
  assert.equal(applyAction(game, 0, { t: 'play', uid, to: 0 }).ok, false);
  assert.equal(applyAction(game, 0, { t: 'play', uid, to: 1 }).ok, true);
  assert.equal(p.board[0].cardId, 'kazib');
  assert.equal(p.board[1].cardId, 'durif');
  buy('lalanne', { main: true });
  const budget = p.budget;
  assert.equal(applyAction(game, 0, { t: 'sell', uid: p.hand[0].uid }).ok, true);
  assert.equal(p.hand.length, 0);
  assert.equal(p.budget, budget + 1);
});

test('la vue montre sa main, jamais celle des autres', () => {
  const { game, buy } = setup();
  buy('kazib', { main: true });
  const moi = viewFor(game, 0);
  assert.equal(moi.hand.length, 1);
  moi.hand[0].atk = 999;
  assert.notEqual(game.players[0].hand[0].atk, 999);
  const autre = viewFor(game, 1) as unknown as Record<string, unknown>;
  assert.deepEqual(autre.hand, []);
  for (const t of autre.table as Record<string, unknown>[]) assert.equal('hand' in t, false);
});

/** Tous les exemplaires de la partie, où qu'ils soient. Les copies simples et les jetons n'en sont pas. */
function census(game: Game): Map<string, number> {
  const count = new Map<string, number>();
  const add = (id: string, n: number) => count.set(id, (count.get(id) ?? 0) + n);
  for (const [id, n] of game.pool) add(id, n);
  for (const p of game.players) {
    if (!p.alive) continue;
    for (const id of p.shop) add(id, 1);
    for (const offer of [p.discover, ...p.discoverQueue]) {
      if (offer?.kind === 'serviteur') for (const id of offer.options) add(id, 1);
    }
    for (const m of [...p.board, ...p.hand]) {
      if (m.copies > 0) add(m.cardId, m.copies);
      for (const id of m.merged) add(id, 1);
    }
  }
  return count;
}

test('fuzz : aucun exemplaire ne se perd, et une action refusée ne change rien', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rng = createRng(seed * 101);
    const game = createGame({ seed });
    const total = census(game);
    while (game.phase === 'recrutement' && game.round < 30) {
      for (const p of game.players) {
        if (!p.alive) continue;
        p.budget += rng.int(4);
        for (let n = 0; n < 14; n++) {
          const uids = [...p.board, ...p.hand].map((m) => m.uid);
          const uid = uids.length ? rng.pick(uids) : 1;
          const other = uids.length ? rng.pick(uids) : 2;
          const spell = p.spells.length ? rng.pick(p.spells).uid : 1;
          const actions = [
            { t: 'buy', slot: rng.int(6) },
            { t: 'buy', slot: rng.int(6), main: true },
            { t: 'buy', slot: rng.int(6), to: rng.int(8) },
            { t: 'buy_spell', slot: rng.int(2) },
            { t: 'buy_casserole' },
            { t: 'play', uid, to: rng.int(8) },
            { t: 'play', uid, target: other },
            { t: 'play', uid, onto: other },
            { t: 'cast', uid: spell, target: other },
            { t: 'cast', uid: spell },
            { t: 'sell', uid },
            { t: 'move', uid, to: rng.int(7) },
            { t: 'roll' },
            { t: 'freeze' },
            { t: 'upgrade' },
            { t: 'discover', i: rng.int(4) },
          ] as const;
          const action = rng.pick(actions);
          const before = JSON.stringify([p, [...game.pool], game.nextUid]);
          const res = applyAction(game, p.seat, action);
          if (!res.ok) assert.equal(JSON.stringify([p, [...game.pool], game.nextUid]), before, `refus qui modifie l'état : ${JSON.stringify(action)}`);
          assert.ok(p.budget >= 0);
          assert.ok(p.board.length <= PARAMS.boardSize);
          assert.ok(p.hand.length + p.spells.length <= PARAMS.handSize, 'main trop grande');
          const uidsNow = [...p.board, ...p.hand].map((m) => m.uid);
          assert.equal(new Set(uidsNow).size, uidsNow.length, 'identifiants en double');
          for (const m of p.hand) assert.ok(!m.token, 'un jeton en main');
          const now = census(game);
          for (const [id, count] of total) assert.equal(now.get(id) ?? 0, count, `exemplaires de ${id} perdus ou créés après ${JSON.stringify(action)}`);
        }
      }
      resolveRound(game);
      const now = census(game);
      for (const [id, n] of total) assert.equal(now.get(id) ?? 0, n, `exemplaires de ${id} après la manche ${game.round}`);
    }
  }
});
