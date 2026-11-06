import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createGame, resolveRound, startCombats, viewFor } from '../src/engine/game.ts';
import type { Minion } from '../src/engine/types.ts';
import { CARD_BY_ID, TOKENS } from '../src/data/cards.ts';
import { effectOrigin, makeMinion } from '../src/engine/minion.ts';
import { resolveCombat } from '../src/engine/combat.ts';
import { createRng } from '../src/engine/rng.ts';
import { createBot, decide } from '../src/bots/bots.ts';
import { PARAMS } from '../src/data/params.ts';
import { TUTORIEL } from '../src/data/histoire/tutoriel.ts';
import { composerTutoriel } from '../src/histoire/tutoriel.ts';

/**
 * Les bugs de la chasse du 3 novembre 2026, trouvés par le fuzz (test/fuzz.test.ts) ou à la
 * relecture, chacun réduit à sa plus petite partie.
 */

function setup(seed = 11) {
  const game = createGame({ seed, heroes: Array(8).fill('attal') });
  const p = game.players[0];
  p.budget = 100;
  const buy = (cardId: string, main = false) => {
    p.shop = [cardId];
    assert.equal(applyAction(game, 0, { t: 'buy', slot: 0, ...(main ? { main } : {}) }).ok, true, `achat de ${cardId}`);
  };
  const pose = (casseroleId: string, m: Minion) => {
    p.casseroleOffer = casseroleId;
    assert.equal(applyAction(game, 0, { t: 'buy_casserole' }).ok, true);
    const held = p.spells.find((s) => s.casseroleId === casseroleId) as { uid: number };
    assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: m.uid }).ok, true);
  };
  return { game, p, buy, pose };
}

test('la vue ne partage rien de modifiable avec la partie : règles, pouvoir, effets, scandale', () => {
  const { game, p, buy, pose } = setup();
  buy('roussel');
  pose('blancos', p.board[0]);
  pose('homards', p.board[0]);
  assert.ok(p.board[0].scandal);
  const view = viewFor(game, 0);
  view.params.tierCost[2] = 999;
  view.params.handSize = 999;
  (view.mods as Record<string, unknown>).upgradeDiscount = 999;
  (view.board[0].scandal as { until: number }).until = 999;
  view.board[0].effects.push(view.board[0].effects[0]);
  assert.equal(game.params.tierCost[2], PARAMS.tierCost[2]);
  assert.equal(PARAMS.tierCost[2], 4, 'les règles de base, partagées par toutes les parties');
  assert.equal(game.params.handSize, PARAMS.handSize);
  assert.equal(p.hero.mods.upgradeDiscount, 1);
  assert.notEqual(p.board[0].scandal?.until, 999);
  assert.equal(p.board[0].effects.length, 0, 'en scandale, Roussel est réduit au silence');
});

test('un plateau vu en combat ne suit pas le scandale de l\'adversaire après coup', () => {
  const game = createGame({ seed: 4, seats: 2, heroes: ['attal', 'attal'] });
  const [a, b] = game.players;
  a.budget = 100;
  b.budget = 100;
  a.shop = ['cheminade'];
  applyAction(game, 0, { t: 'buy', slot: 0 });
  b.shop = ['cheminade'];
  applyAction(game, 1, { t: 'buy', slot: 0 });
  const pose = (id: string) => {
    a.casseroleOffer = id;
    applyAction(game, 0, { t: 'buy_casserole' });
    applyAction(game, 0, { t: 'cast', uid: a.spells[0].uid, target: a.board[0].uid });
  };
  pose('homards');
  pose('homards');
  assert.ok(a.board[0].scandal);
  resolveRound(game);
  const seen = b.seen[0].board[0].scandal as { budget: number };
  const before = seen.budget;
  a.budget = 100;
  pose('homards'); // Reçue en plein scandale : son défaut s'ajoute, chez a seulement.
  assert.equal(b.seen[0].board[0].scandal?.budget, before);
});

test('un triple qui fait scandale compte comme un scandale : jamais plus d\'oublis que de scandales', () => {
  const { game, p, buy, pose } = setup();
  buy('cheminade');
  buy('cheminade');
  pose('homards', p.board[0]);
  pose('homards', p.board[1]);
  assert.ok(p.board.every((m) => !m.scandal), 'une casserole chacun : pas de scandale');
  buy('cheminade', true);
  const golden = p.hand.find((m) => m.golden) as Minion;
  assert.ok(golden.scandal, 'les deux casseroles réunies sur le doré font scandale');
  assert.equal(p.stats.scandals, 1);
  resolveRound(game);
  resolveRound(game);
  assert.equal(golden.scandal, undefined);
  assert.equal(p.stats.forgotten, 1);
});

test('un triple d\'un serviteur déjà en scandale ne compte pas un second scandale', () => {
  const { p, buy, pose } = setup();
  buy('cheminade');
  pose('homards', p.board[0]);
  pose('homards', p.board[0]);
  assert.equal(p.stats.scandals, 1);
  buy('cheminade', true);
  buy('cheminade', true);
  const golden = p.hand.find((m) => m.golden) as Minion;
  assert.ok(golden.scandal);
  assert.equal(p.stats.scandals, 1, 'le scandale continue sur le doré');
});

test('un doré rallié garde ses casseroles : son hôte les prend, avec leur bonus de budget', () => {
  const { game, p, buy, pose } = setup();
  buy('cheminade');
  buy('lecornu');
  buy('lecornu');
  pose('renault', p.board[1]); // +1 budget par manche, compte pour deux : scandale.
  assert.ok(p.board[1].scandal);
  buy('lecornu', true);
  const golden = p.hand.find((m) => m.golden) as Minion;
  assert.deepEqual(golden.casseroles, ['renault']);
  const host = p.board[0];
  assert.equal(applyAction(game, 0, { t: 'play', uid: golden.uid, onto: host.uid }).ok, true);
  assert.deepEqual(host.casseroles, ['renault'], 'la casserole suit le doré sur son hôte');
  assert.equal(host.charges, 2);
  assert.equal(host.budgetPerRound, 1, 'l\'avantage reste');
  assert.ok(host.scandal, 'le scandale ne s\'efface pas en ralliant');
  assert.equal(p.stats.scandals, 1, 'c\'est le même scandale');
});

test('un triple d\'un serviteur réduit au silence lui rend, à l\'oubli, les effets de ses Ralliements', () => {
  const { game, p, buy, pose } = setup();
  buy('cheminade');
  const host = p.board[0];
  buy('berge', true);
  assert.equal(applyAction(game, 0, { t: 'play', uid: p.hand[0].uid, onto: host.uid }).ok, true);
  const heritage = CARD_BY_ID.berge.effects?.[0];
  assert.ok(heritage && host.effects.map(effectOrigin).includes(heritage), 'l\'Héritage de Bergé passe sur l\'hôte, en copie ralliée');
  pose('blancos', host);
  pose('homards', host);
  assert.deepEqual(host.effects, [], 'réduit au silence');
  buy('cheminade', true);
  buy('cheminade', true);
  const golden = p.hand.find((m) => m.golden) as Minion;
  assert.ok(golden.scandal?.silenced, 'le doré refait scandale, toujours réduit au silence');
  resolveRound(game);
  resolveRound(game);
  assert.equal(golden.scandal, undefined);
  assert.ok(golden.effects.map(effectOrigin).includes(heritage), 'l\'Héritage de Bergé revient avec l\'oubli');
  for (const e of CARD_BY_ID.cheminade.effects ?? []) assert.equal(golden.effects.filter((x) => x === e).length, 1);
});

test('un triple garde chaque Ralliement, même celui d\'une carte sur elle-même', () => {
  const { game, p, buy } = setup();
  buy('berge');
  buy('berge', true);
  assert.equal(applyAction(game, 0, { t: 'play', uid: p.hand[0].uid, onto: p.board[0].uid }).ok, true);
  const heritage = CARD_BY_ID.berge.effects?.[0];
  assert.equal(p.board[0].effects.filter((e) => effectOrigin(e) === heritage).length, 2);
  buy('berge', true);
  buy('berge', true);
  const golden = p.hand.find((m) => m.golden) as Minion;
  assert.equal(golden.effects.filter((e) => effectOrigin(e) === heritage).length, 2, 'son Héritage, et celui de la Bergé ralliée');
});

test('le tutoriel suit son script quelle que soit la graine : ses camps sont toujours en jeu', () => {
  for (let seed = 1; seed <= 120; seed++) {
    const table = composerTutoriel(seed);
    const game = createGame({ seed, seats: table.sieges.length, ...table.game });
    assert.deepEqual(game.players[0].shop, TUTORIEL.boutique[1], `graine ${seed}, camps ${game.camps}`);
    assert.equal(game.camps.length, PARAMS.activeCamps);
  }
});

test('le jeton d\'une casserole reçoit les gains de camp déjà acquis, comme tout serviteur à venir', () => {
  const { p, buy, pose } = setup();
  buy('sarkozy'); // Quand un allié reçoit une casserole : les Républicains ont +2/+1 pour la partie.
  buy('cheminade');
  pose('homards', p.board[1]);
  assert.equal(p.campBuffs.length, 1);
  pose('emploi_fictif', p.board[0]); // Invoque un Assistant fictif, Républicain comme Sarkozy.
  const assistant = p.board.find((m) => m.cardId === 'assistant_fictif') as Minion;
  assert.ok(assistant);
  assert.equal(assistant.camp, 'republicains');
  const gain = p.campBuffs.reduce((s, g) => ({ atk: s.atk + g.atk, hp: s.hp + g.hp }), { atk: 0, hp: 0 });
  assert.deepEqual([assistant.atk, assistant.hp], [TOKENS.assistant_fictif.atk + gain.atk, TOKENS.assistant_fictif.hp + gain.hp]);
});

test('un Suppléant invoqué en combat a les gains de Faure des combats précédents', () => {
  const game = createGame({ seed: 3, seats: 2, heroes: ['attal', 'attal'], combatLog: true });
  const [a, b] = game.players;
  // Faure a déjà fait grandir les Suppléants pour la partie.
  a.campBuffs.push({ card: 'suppleant', atk: 5, hp: 5 });
  a.board = [{ ...makeMinion(CARD_BY_ID.bouamrane, 9001), hp: 1 }];
  b.board = [{ ...makeMinion(CARD_BY_ID.cheminade, 9002), atk: 1, hp: 50 }];
  startCombats(game);
  const log = game.roundCombats[0].result.log;
  const summoned = log.find((e) => e.e === 'invocation');
  assert.ok(summoned && summoned.e === 'invocation');
  assert.deepEqual([summoned.unit.atk, summoned.unit.hp], [TOKENS.suppleant.atk + 5, TOKENS.suppleant.hp + 5]);
});

test('un héros en plus gagné par un succès reste proposé après le choix des bots', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const game = createGame({ seed, heroSelection: true, heroChoices: { 0: 3 } });
    for (let seat = 1; seat < 8; seat++) applyAction(game, seat, { t: 'hero', i: seed % 2 });
    const offers = game.players[0].heroOffers as string[];
    assert.equal(offers.length, 3, `graine ${seed}`);
    const taken = new Set(game.players.slice(1).map((p) => p.hero.id));
    assert.ok(offers.every((id) => !taken.has(id)), `graine ${seed} : un héros déjà pris reste proposé`);
  }
});

test('l\'Héritage d\'un Le Pen père doré, détruit au recrutement, transmet le double, comme en combat', () => {
  const { game, p, buy } = setup();
  for (let i = 0; i < 3; i++) buy('jmlp', true);
  const golden = p.hand.find((m) => m.golden) as Minion;
  assert.equal(applyAction(game, 0, { t: 'play', uid: golden.uid }).ok, true);
  buy('cheminade');
  const next = p.board[1];
  const before = { atk: next.atk, hp: next.hp };
  p.spells.push({ uid: 9001, spellId: 'primaire' });
  assert.equal(applyAction(game, 0, { t: 'cast', uid: 9001, target: golden.uid }).ok, true);
  if (p.discover) applyAction(game, 0, { t: 'discover', i: 0 });
  assert.deepEqual([next.atk, next.hp], [before.atk + golden.atk * 2, before.hp + golden.hp * 2]);
});

test('en combat, l\'Héritage « voisins » d\'un mort vise ses deux voisins, comme au recrutement', () => {
  const card = { id: 'test', name: 'Test', camp: 'civile' as const, tier: 1, atk: 0, hp: 50 };
  const left = { ...makeMinion(card, 1), effects: [] };
  const dying = { ...makeMinion({ ...card, atk: 0, hp: 1 }, 2), effects: [{ when: 'heritage' as const, to: 'voisins' as const, do: 'buff' as const, atk: 7, hp: 0 }] };
  const right = { ...makeMinion(card, 3), effects: [] };
  const far = { ...makeMinion(card, 4), effects: [] };
  const r = resolveCombat(
    { minions: [far, left, dying, right], mods: {}, hp: 10 },
    { minions: [{ ...makeMinion({ ...card, atk: 1, hp: 1 }, 5), keywords: ['cumul' as const] }], mods: {}, hp: 10 },
    { params: PARAMS, ctx: null, rng: createRng(1), log: true },
  );
  const death = r.log.findIndex((e) => e.e === 'mort' && e.uid === 2);
  assert.ok(death > 0, 'le serviteur à Héritage meurt');
  const gains = r.log.slice(death).filter((e) => e.e === 'stats').map((e) => (e as { uid: number }).uid);
  assert.deepEqual(gains.sort(), [1, 3], 'ses deux voisins, pas celui d\'à côté');
});

test('un bot moyen ne rachète et ne revend pas en boucle ce qu\'il vient de poser', () => {
  let sells = 0;
  let resold = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const game = createGame({ seed });
    const bots = game.players.map((_, i) => createBot('moyen', seed * 31 + i + 1));
    while (game.phase === 'recrutement' && game.round < 40) {
      for (const p of game.players) {
        if (!p.alive) continue;
        const played = new Set<number>();
        for (let n = 0; n < 60; n++) {
          const a = decide(viewFor(game, p.seat), bots[p.seat]);
          if (!a) break;
          const before = new Set(p.board.map((m) => m.uid));
          assert.equal(applyAction(game, p.seat, a).ok, true);
          if (a.t === 'play') played.add(a.uid);
          if (a.t === 'buy') for (const m of p.board) if (!before.has(m.uid)) played.add(m.uid);
          if (a.t === 'sell') {
            sells++;
            if (played.has(a.uid)) resold++;
          }
        }
      }
      resolveRound(game);
    }
  }
  // Avant : 17,5 % des ventes revendaient un serviteur posé dans la même manche, en pure perte.
  assert.ok(resold / sells < 0.1, `${resold} reventes sur ${sells} ventes`);
});

test('une copie gagnée en combat se prend dans la réserve ; réserve vide, c\'est une copie simple (règle R3)', () => {
  const setup = (empty: boolean) => {
    const game = createGame({ seed: 3, seats: 2, heroes: ['attal', 'attal'], activeCamps: ['insoumis', 'rn', 'macronie', 'socialistes', 'ecologistes'] });
    const [a, b] = game.players;
    const copie = { when: 'heritage' as const, to: 'joueur' as const, do: 'carte' as const, card: 'copie', count: 1 };
    a.board = [{ ...makeMinion(CARD_BY_ID.cheminade, 9001), hp: 1, effects: [copie] }];
    b.board = [{ ...makeMinion(CARD_BY_ID.durif, 9002), atk: 5, hp: 50 }];
    if (empty) game.pool.set('cheminade', 0);
    const pool = game.pool.get('cheminade') as number;
    startCombats(game);
    return { copy: a.hand.find((m) => m.cardId === 'cheminade'), pool, after: game.pool.get('cheminade') };
  };
  const full = setup(false);
  assert.ok(full.copy, 'la copie arrive en main');
  assert.equal(full.copy.simple, false, 'elle compte pour un triple');
  assert.equal(full.copy.copies, 1);
  assert.equal(full.after, full.pool - 1, 'elle sort de la réserve');
  const empty = setup(true);
  assert.equal(empty.copy?.simple, true, 'réserve vide : une copie simple');
  assert.equal(empty.after, 0);
});

test('trois Lalanne, dont deux gagnés par sa Célébration, font un triple (3 novembre 2026)', async () => {
  const { applyAction, finishRound } = await import('../src/engine/game.ts');
  const { addMinionToHand } = await import('../src/engine/recruit.ts');
  const game = createGame({ seed: 5, seats: 2, heroes: ['attal', 'attal'], activeCamps: ['insoumis', 'rn', 'macronie', 'socialistes', 'ecologistes'] });
  const p = game.players[0];
  p.budget = 20;
  const lalanne = addMinionToHand(game, p, 'lalanne');
  assert.ok(lalanne && applyAction(game, 0, { t: 'play', uid: lalanne.uid }).ok);
  for (let win = 0; win < 2 && !p.hand.concat(p.board).some((m) => m.golden); win++) {
    game.players[1].board = [];
    startCombats(game);
    finishRound(game);
  }
  assert.ok([...p.board, ...p.hand].some((m) => m.cardId === 'lalanne' && m.golden), `pas de triple : ${[...p.board, ...p.hand].map((m) => `${m.cardId}${m.simple ? ' (simple)' : ''}`)}`);
});

test('en combat, les invocations respectent la taille du plateau des règles, pas 7 en dur', () => {
  const params = { ...PARAMS, boardSize: 2 };
  const allie = makeMinion({ id: 'test', name: 'Test', camp: 'civile', tier: 1, atk: 0, hp: 50 }, 2);
  const cazeneuve = { ...makeMinion(CARD_BY_ID.cazeneuve, 1), hp: 1 }; // Héritage : deux Suppléants.
  const r = resolveCombat(
    { minions: [cazeneuve, allie], mods: {}, hp: 10 },
    { minions: [{ ...makeMinion({ id: 'test', name: 'Test', camp: 'civile', tier: 1, atk: 1, hp: 100 }, 3), keywords: [] }], mods: {}, hp: 10 },
    { params, ctx: null, rng: createRng(2), log: true },
  );
  let size = 2;
  for (const e of r.log) {
    if (e.e === 'mort' && !e.revient && e.uid < 100) size--;
    if (e.e === 'invocation' && e.side === 0) size++;
    assert.ok(size <= params.boardSize, `plateau à ${size} en combat`);
  }
});

test('un héros imposé à un siège n\'est jamais proposé aux autres', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const game = createGame({ seed, heroSelection: true, heroes: ['attal', undefined, 'macron'] });
    for (const p of game.players) for (const id of p.heroOffers ?? []) assert.ok(id !== 'attal' && id !== 'macron', `graine ${seed}, siège ${p.seat}`);
  }
});

test('un siège qui perd sa seule proposition en reçoit une libre, pas le héros déjà pris', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const game = createGame({ seed, heroSelection: true, heroChoices: { 7: 1 } });
    const [only] = game.players[7].heroOffers as string[];
    const owner = game.players.find((p) => p.seat !== 7 && p.heroOffers?.includes(only));
    if (!owner) continue;
    applyAction(game, owner.seat, { t: 'hero', i: (owner.heroOffers as string[]).indexOf(only) });
    assert.ok(!game.players[7].heroOffers?.includes(only), `graine ${seed} : ${only} est pris`);
    assert.equal(game.players[7].heroOffers?.length, 1);
  }
});

test('une place, un emplacement ou un uid non entier est refusé sans rien changer, sans exception', () => {
  const { game, p, buy } = setup();
  buy('kazib');
  buy('durif', true);
  const before = JSON.stringify([p.board, p.hand, p.spells, p.budget]);
  for (const a of [
    { t: 'play', uid: p.hand[0].uid, to: 0.5 },
    { t: 'move', uid: p.board[0].uid, to: 0.5 },
    { t: 'buy', slot: 0.5 },
    { t: 'buy', slot: 0, to: Number.NaN },
    { t: 'cast', uid: Number.POSITIVE_INFINITY },
    { t: 'discover', i: 0.5 },
  ] as const) {
    assert.equal(applyAction(game, 0, a).ok, false, JSON.stringify(a));
  }
  assert.equal(JSON.stringify([p.board, p.hand, p.spells, p.budget]), before);
});

test('un Ralliement qui porte des casseroles ne rejoint pas un jeton ; sans casserole, si (fuzz du 6 novembre 2026)', () => {
  // Graine 300017 : Lecornu, Ralliement, revenu en main avec ses casseroles, rejoignait un Électeur fantôme, et le jeton
  // portait des casseroles, contre la règle : le serveur signalait l'anomalie.
  const { game, p, buy, pose } = setup();
  buy('tiberi');
  const token = p.board.find((m) => m.token);
  assert.ok(token, 'Tiberi invoque un Électeur fantôme');
  buy('lecornu');
  const lecornu = p.board.find((m) => m.cardId === 'lecornu') as Minion;
  pose('blancos', lecornu);
  p.board = p.board.filter((m) => m !== lecornu);
  p.hand.push(lecornu);
  const refused = applyAction(game, 0, { t: 'play', uid: lecornu.uid, onto: token.uid });
  assert.deepEqual(refused, { ok: false, error: 'Un jeton ne peut pas porter de casserole.' });
  assert.ok(p.hand.includes(lecornu), 'il reste en main');
  assert.equal(applyAction(game, 0, { t: 'play', uid: lecornu.uid, onto: p.board.find((m) => m.cardId === 'tiberi')?.uid }).ok, true, 'sur un vrai politique, il se rallie');
  buy('lecornu', true);
  const clean = p.hand.find((m) => m.cardId === 'lecornu') as Minion;
  assert.equal(applyAction(game, 0, { t: 'play', uid: clean.uid, onto: token.uid }).ok, true, 'sans casserole, il rejoint le jeton');
  assert.equal(token.casseroles.length, 0);
});
