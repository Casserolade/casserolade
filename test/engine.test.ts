import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combatBonuses, resolveCombat } from '../src/engine/combat.ts';
import { isCamp } from '../src/engine/camps.ts';
import { addSpellToHand, offerCasserole, refillShop } from '../src/engine/recruit.ts';
import { applyAction, createGame, resolveRound, startCombats, viewFor } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { makeMinion } from '../src/engine/minion.ts';
import { createRng } from '../src/engine/rng.ts';
import type { Card, Effect, Keyword, Minion } from '../src/engine/types.ts';
import { CARDS, CARD_BY_ID, TOKENS } from '../src/data/cards.ts';
import { CASSEROLES } from '../src/data/casseroles.ts';
import { HEROES } from '../src/data/heroes.ts';
import { PARAMS } from '../src/data/params.ts';
import { SPELLS } from '../src/data/sorts.ts';
import { PLATEAUX, SECOND_TOUR, plateauFor } from '../src/data/plateaux.ts';
import { playGame } from '../src/sim/simulate.ts';

let uid = 1;
function unit(atk: number, hp: number, keywords: Keyword[] = [], camp: Card['camp'] = 'civile', effects: Effect[] = []): Minion {
  return { ...makeMinion({ id: 'test', name: 'Test', camp, tier: 1, atk, hp, keywords }, uid++), keywords, effects };
}

function fight(a: Minion[], b: Minion[], seed = 1) {
  return resolveCombat(
    { minions: a, mods: {}, hp: 10 },
    { minions: b, mods: {}, hp: 20 },
    { params: PARAMS, ctx: null, rng: createRng(seed), log: true },
  );
}

/** Un joueur avec du budget, et une boutique qu'on remplit à la main. */
function setup(seed = 13): { game: Game; p: Game['players'][number]; buy: (cardId: string, main?: boolean) => void } {
  const game = createGame({ seed, heroes: Array(8).fill('attal') });
  const p = game.players[0];
  p.budget = 100;
  const buy = (cardId: string, main = false) => {
    p.shop = [cardId];
    assert.equal(applyAction(game, 0, { t: 'buy', slot: 0, ...(main ? { main } : {}) }).ok, true, `achat de ${cardId}`);
  };
  return { game, p, buy };
}

/** Achète une casserole précise et la pose sur ce serviteur. */
function poseCasserole(game: Game, id: string, target: Minion) {
  const p = game.players[0];
  p.casseroleOffer = id;
  assert.equal(applyAction(game, 0, { t: 'buy_casserole' }).ok, true);
  const held = p.spells.find((s) => s.casseroleId === id) as { uid: number };
  return applyAction(game, 0, { t: 'cast', uid: held.uid, target: target.uid });
}

// Le combat.

test('à graine égale le même combat ; les cibles changent avec la graine', () => {
  const a = [unit(3, 3), unit(2, 4), unit(4, 2)];
  const b = [unit(3, 3), unit(2, 4), unit(4, 2)];
  assert.deepEqual(fight(a, b, 7).log, fight(a, b, 7).log);
  const seen = new Set<string>();
  for (let seed = 0; seed < 40; seed++) seen.add(JSON.stringify(fight(a, b, seed).log.filter((e) => e.e === 'attaque')));
  assert.ok(seen.size > 1);
});

test('le camp le plus nombreux commence, puis le moins bien placé', () => {
  assert.equal(fight([unit(1, 1), unit(1, 1)], [unit(1, 1)]).first, 0);
  assert.equal(fight([unit(1, 1)], [unit(1, 1)]).first, 0);
  const result = resolveCombat(
    { minions: [unit(1, 1)], mods: {}, hp: 20 },
    { minions: [unit(1, 1)], mods: {}, hp: 10 },
    { params: PARAMS, ctx: null, rng: createRng(1) },
  );
  assert.equal(result.first, 1);
});

test('un Porte-parole vivant prend toutes les attaques', () => {
  for (let seed = 0; seed < 20; seed++) {
    const shield = unit(0, 1000, ['porte_parole']);
    const r = resolveCombat(
      { minions: [unit(2, 50)], mods: {}, hp: 5 },
      { minions: [unit(0, 3), shield, unit(0, 3)], mods: {}, hp: 5 },
      { params: PARAMS, ctx: null, rng: createRng(seed), log: true },
    );
    const attacks = r.log.filter((e) => e.e === 'attaque');
    assert.ok(attacks.every((e) => e.e === 'attaque' && e.to === shield.uid));
  }
});

test('Immunité annule le premier coup ; Polémique tue une fois, puis se perd', () => {
  assert.equal(fight([unit(3, 1, ['immunite'])], [unit(3, 3)]).winner, 0);
  assert.equal(fight([unit(3, 1)], [unit(3, 3)]).winner, null);
  const r = fight([unit(1, 50, ['polemique'])], [unit(0, 1000), unit(0, 1000)]);
  assert.equal(r.log.filter((e) => e.e === 'polemique').length, 1);
  assert.equal(r.survivors[1], 1);
  const blocked = fight([unit(1, 1, ['polemique'])], [unit(5, 100, ['immunite'])]);
  assert.equal(blocked.winner, 1);
});

test('Retour en politique ramène le serviteur une seule fois avec 1 PV', () => {
  assert.equal(fight([unit(1, 1, ['retour'])], [unit(1, 3)]).winner, 1);
  assert.equal(fight([unit(1, 1, ['retour'])], [unit(1, 1)]).winner, 0);
});

test('plus d\'Alliance : deux voisins du même camp gardent leurs stats', () => {
  assert.deepEqual(combatBonuses([unit(1, 1, [], 'rn'), unit(1, 1, [], 'rn')]), [0, 0]);
});

test('Ni droite ni gauche compte pour chaque camp, sauf la Société civile', () => {
  const m = unit(1, 1, ['ni_droite_ni_gauche'], 'macronie');
  assert.equal(isCamp(m, 'rn'), true);
  assert.equal(isCamp(m, 'civile'), false);
  assert.equal(isCamp(unit(1, 1, [], 'rn'), 'reconquete', true), true, 'fer à cheval');
});

test('le combat ne modifie pas les plateaux', () => {
  const a = [unit(3, 3)];
  const b = [unit(3, 3)];
  fight(a, b);
  assert.equal(a[0].hp, 3);
  assert.equal(b[0].hp, 3);
});

test('la Célébration : la Vedette survivante la plus à gauche, sinon le survivant le plus à gauche', () => {
  const plain = unit(5, 50);
  const star = unit(5, 50, ['vedette']);
  const r = fight([plain, star], [unit(1, 1)]);
  assert.equal(r.celebrant?.uid, star.uid);
  assert.equal(r.log.at(-1)?.e === 'celebration' || r.log.at(-2)?.e === 'celebration', true);
  const noStar = fight([plain, unit(5, 50)], [unit(1, 1)]);
  assert.equal(noStar.celebrant?.uid, plain.uid);
  assert.equal(fight([unit(1, 1)], [unit(1, 1)]).celebrant, null, 'pas de vainqueur, pas de Célébration');
});

test('chaque Vedette survivante applique sa Célébration, une seule prononce sa phrase (3 novembre 2026)', async () => {
  const { applyAction, createGame, startCombats } = await import('../src/engine/game.ts');
  const { addMinionToHand } = await import('../src/engine/recruit.ts');
  const game = createGame({ seed: 4, seats: 2, heroes: ['philippe', 'philippe'], activeCamps: ['reconquete', 'insoumis', 'rn', 'socialistes', 'ecologistes'], combatLog: true });
  const p = game.players[0];
  p.budget = 20;
  for (const id of ['boyard', 'villiers']) {
    const m = addMinionToHand(game, p, id);
    assert.ok(m && applyAction(game, 0, { t: 'play', uid: m.uid }).ok);
  }
  const tracts = p.spells.filter((s) => s.spellId === 'tract').length;
  startCombats(game);
  const record = game.roundCombats[0];
  assert.equal(record.result.winner, 0);
  assert.equal(record.result.celebrants.length, 2, 'Boyard et Villiers célèbrent tous les deux');
  assert.equal(record.result.log.filter((e) => e.e === 'celebration').length, 1, 'une seule petite phrase');
  assert.equal(p.freeRolls, 2, 'les actualisations de Villiers, même derrière Boyard');
  assert.ok(p.spells.filter((s) => s.spellId === 'tract').length > tracts, 'le Tract de Boyard');
});

test('le Droit de réponse : le perdant le plus à gauche qui en a un répond', () => {
  const answer = unit(1, 1, [], 'civile', [{ when: 'droit_de_reponse', to: 'joueur', do: 'budget', value: 1, plus_tard: true }]);
  const r = fight([unit(1, 1), answer], [unit(10, 100)]);
  assert.equal(r.winner, 1);
  assert.equal(r.responder?.uid, answer.uid);
});

test('Mitterrand double les Héritages, tant qu\'il est vivant', () => {
  const heritage: Effect = { when: 'heritage', to: 'joueur', do: 'carte', card: 'tract', count: 1 };
  const dies = unit(1, 1, [], 'socialistes', [heritage]);
  const mitterrand = { ...makeMinion(CARD_BY_ID.mitterrand, uid++) };
  const r = fight([dies, mitterrand], [unit(1, 100)]);
  assert.equal(r.persist[0].cards.length >= 2, true);
});

// Le recrutement.

test('la vue est une copie, et ne montre ni les plateaux adverses ni la réserve', () => {
  const game = createGame({ seed: 7 });
  const view = viewFor(game, 0) as unknown as Record<string, unknown>;
  assert.equal('pool' in view, false);
  assert.equal('players' in view, false);
  const table = view.table as Record<string, unknown>[];
  assert.equal(table.some((t) => 'board' in t || 'shop' in t), false);
  game.players[0].budget = 10;
  applyAction(game, 0, { t: 'buy', slot: 0 });
  const mine = viewFor(game, 0);
  mine.board[0].atk = 999;
  assert.notEqual(game.players[0].board[0].atk, 999);
});

test('les actions illégales sont refusées sans rien changer', () => {
  const game = createGame({ seed: 3, heroes: Array(8).fill('attal') });
  const p = game.players[0];
  p.budget = 0;
  const before = JSON.stringify([p.board, p.hand, p.spells]);
  for (const a of [{ t: 'buy', slot: 0 }, { t: 'buy', slot: 99 }, { t: 'upgrade' }, { t: 'sell', uid: 123456 }, { t: 'cast', uid: 5 }, { t: 'buy_spell', slot: 0 }] as const) {
    assert.equal(applyAction(game, 0, a).ok, false, JSON.stringify(a));
  }
  assert.equal(applyAction(game, 99, { t: 'roll' }).ok, false);
  assert.equal(JSON.stringify([p.board, p.hand, p.spells]), before);
  assert.equal(p.budget, 0);
});

test('le budget suit la règle et le plafond', () => {
  const game = createGame({ seed: 5, heroes: Array(8).fill('attal') });
  assert.equal(game.players[0].budget, 3);
  resolveRound(game);
  assert.equal(game.players[0].budget, 4);
});

test('la boutique propose un sort, qui va en main et se lance', () => {
  const { game, p, buy } = setup();
  buy('kazib');
  p.shopSpells = ['sondage_flatteur'];
  assert.equal(applyAction(game, 0, { t: 'buy_spell', slot: 0 }).ok, true);
  const before = { atk: p.board[0].atk, hp: p.board[0].hp };
  assert.equal(applyAction(game, 0, { t: 'cast', uid: p.spells.find((s) => s.spellId === 'sondage_flatteur')!.uid, target: p.board[0].uid }).ok, true);
  assert.deepEqual({ atk: p.board[0].atk, hp: p.board[0].hp }, { atk: before.atk + 1, hp: before.hp + 2 });
});

test('Roussel : après chaque sort, vos serviteurs gagnent +1/+0', () => {
  const { game, p, buy } = setup();
  buy('roussel');
  buy('kazib'); // Annonce : un Tract.
  const atk = p.board[0].atk;
  applyAction(game, 0, { t: 'cast', uid: p.spells[0].uid, target: p.board[0].uid });
  assert.equal(p.board[0].atk, atk + 1 + 1, 'le Tract, puis Roussel');
});

test('une casserole s\'achète, va en main, et vaut double sur son propriétaire', () => {
  const { game, p, buy } = setup(9);
  buy('sarkozy');
  buy('kazib');
  const [sarko, kazib] = p.board;
  poseCasserole(game, 'ecoutes', sarko);
  poseCasserole(game, 'ecoutes', kazib);
  const perCasserole = (CARD_BY_ID.sarkozy.effects ?? []).find((e) => e.when === 'casserole_recue') as Effect & { atk: number };
  assert.equal(sarko.atk, CARD_BY_ID.sarkozy.atk + 6 + 2 * perCasserole.atk, 'double, plus Sarkozy qui grandit à chaque casserole posée');
  // « Ne bouge plus » est un défaut : il dort tant qu'il n'y a pas de scandale.
  assert.equal(sarko.locked, false);
  poseCasserole(game, 'homards', sarko);
  assert.ok(sarko.scandal);
  assert.equal(sarko.locked, true);
  assert.equal(applyAction(game, 0, { t: 'move', uid: sarko.uid, to: 1 }).ok, false);
});

/** Joue le combat de la manche et passe à la suivante. */
function manche(game: Game): void {
  resolveRound(game);
}

test('une casserole seule : son avantage tout de suite, son défaut dort', () => {
  const { game, p, buy } = setup(11);
  buy('cheminade');
  const m = p.board[0];
  const avant = { atk: m.atk, hp: m.hp };
  poseCasserole(game, 'homards', m);
  assert.deepEqual({ atk: m.atk, hp: m.hp }, { atk: avant.atk + 3, hp: avant.hp + 3 });
  assert.equal(m.scandal, undefined);
  assert.equal(m.budgetPerRound, 0, 'le budget perdu dort tant qu\'il n\'y a pas de scandale');
});

test('deux casseroles : scandale deux manches, puis l\'oubli du peuple efface les défauts et garde les avantages', () => {
  const { game, p, buy } = setup(11);
  buy('cheminade');
  const m = p.board[0];
  const avant = { atk: m.atk, hp: m.hp };
  for (let i = 0; i < 2; i++) poseCasserole(game, 'homards', m);
  assert.equal(viewFor(game, 0).scandalThreshold, 2);
  assert.ok(m.scandal);
  assert.equal(m.budgetPerRound, -2, 'pendant le scandale, les deux défauts s\'appliquent');
  assert.equal(p.board.includes(m), true, 'le scandale ne l\'éloigne pas du plateau');
  manche(game);
  assert.ok(m.scandal, 'encore en scandale à la deuxième manche');
  manche(game);
  assert.equal(m.scandal, undefined);
  assert.equal(m.budgetPerRound, 0);
  assert.equal(m.oublie, 2);
  assert.equal(m.charges, 0);
  assert.deepEqual({ atk: m.atk, hp: m.hp }, { atk: avant.atk + 6, hp: avant.hp + 6 }, 'les avantages restent');
  // Une nouvelle casserole repart seule : pas de scandale.
  poseCasserole(game, 'homards', m);
  assert.equal(m.scandal, undefined);
});

test('un scandale qui réduit au silence rend ses effets à l\'oubli', () => {
  const { game, p, buy } = setup(11);
  buy('roussel');
  const m = p.board[0];
  const effets = m.effects;
  assert.ok(effets.length > 0);
  poseCasserole(game, 'blancos', m);
  assert.deepEqual(m.effects, effets, 'seule, la casserole ne le fait pas taire');
  poseCasserole(game, 'homards', m);
  assert.deepEqual(m.effects, []);
  manche(game);
  manche(game);
  assert.deepEqual(m.effects, effets);
});

test('un Ralliement posé sur un politique en scandale, réduit au silence, garde ses effets (décision du 3 novembre 2026)', () => {
  const { game, p, buy } = setup(11);
  buy('roussel');
  const m = p.board[0];
  const siens = m.effects;
  poseCasserole(game, 'blancos', m);
  poseCasserole(game, 'homards', m);
  assert.ok(m.scandal);
  assert.deepEqual(m.effects, [], 'ses propres effets se taisent');
  buy('tache', true);
  assert.equal(applyAction(game, 0, { t: 'play', uid: p.hand[0].uid, onto: m.uid }).ok, true);
  const rallies = CARD_BY_ID.tache.effects ?? [];
  assert.ok(rallies.every((e) => m.effects.includes(e)), 'le Tract de fin de tour de Taché joue pendant le scandale');
  manche(game);
  manche(game);
  assert.equal(m.scandal, undefined);
  assert.ok([...siens, ...rallies].every((e) => m.effects.includes(e)), 'après l\'oubli : ses effets et ceux du rallié');
});

test('le Bracelet électronique fait oublier un scandale tout de suite, mais il ne bouge plus', () => {
  const { game, p, buy } = setup(11);
  buy('cheminade');
  const m = p.board[0];
  p.spells.push({ uid: 9001, spellId: 'bracelet_electronique' });
  assert.equal(applyAction(game, 0, { t: 'cast', uid: 9001 }).ok, false, 'aucun scandale');
  for (let i = 0; i < 2; i++) poseCasserole(game, 'homards', m);
  assert.equal(applyAction(game, 0, { t: 'cast', uid: 9001 }).ok, true);
  assert.equal(m.scandal, undefined);
  assert.equal(m.budgetPerRound, 0);
  assert.equal(m.locked, true);
});

test('le Bracelet suit les scandales : il arrive en boutique quand il sert, même à l\'échelon 1', () => {
  const { game, p, buy } = setup(11);
  buy('cheminade');
  const m = p.board[0];
  const vus = (n: number) => {
    let bracelets = 0;
    for (let i = 0; i < n; i++) {
      refillShop(game, p);
      if (p.shopSpells[0] === 'bracelet_electronique') bracelets++;
    }
    return bracelets;
  };
  assert.equal(p.tier, 1);
  assert.equal(vus(200), 0, 'à l\'échelon 1 sans scandale, jamais');
  for (let i = 0; i < 2; i++) poseCasserole(game, 'homards', m);
  assert.ok(m.scandal);
  const pendant = vus(400);
  assert.ok(pendant > 140 && pendant < 260, `une boutique sur deux pendant un scandale : ${pendant} sur 400`);
});

test('les casseroles à la une sortent plus souvent que les autres', () => {
  const { game, p } = setup(11);
  const une = new Set(CASSEROLES.filter((c) => c.une).map((c) => c.id));
  assert.ok(une.has('valise_libyenne') && une.size >= 6 && une.size <= 12);
  game.round = game.params.casseroleFromRound;
  let tirages = 0;
  for (let i = 0; i < 6000; i++) {
    offerCasserole(game, p);
    if (une.has(p.casseroleOffer as string)) tirages++;
  }
  const attendu = (une.size * PARAMS.uneWeight) / (une.size * PARAMS.uneWeight + CASSEROLES.length - une.size);
  assert.ok(Math.abs(tirages / 6000 - attendu) < 0.03, `${tirages / 6000} au lieu de ${attendu}`);
});

test('Fillon repousse le scandale, et « Quel compte Facebook ? » fait tout oublier', () => {
  const { game, p, buy } = setup(11);
  buy('fillon');
  buy('cheminade');
  const m = p.board.find((x) => x.cardId === 'cheminade') as Minion;
  for (let i = 0; i < 2; i++) poseCasserole(game, 'homards', m);
  assert.equal(m.scandal, undefined, 'avec Fillon, il en faut trois');

  const autre = setup(12);
  autre.buy('cheminade');
  const n = autre.p.board[0];
  for (let i = 0; i < 2; i++) poseCasserole(autre.game, 'homards', n);
  assert.ok(n.scandal);
  poseCasserole(autre.game, 'quel_facebook', n);
  assert.equal(n.scandal, undefined, 'ni vu ni connu');
  assert.equal(n.budgetPerRound, 0);
});

test('un triple d\'un serviteur en scandale ne garde pas de défaut orphelin', () => {
  const { game, p, buy } = setup(11);
  buy('cheminade');
  const m = p.board[0];
  for (let i = 0; i < 2; i++) poseCasserole(game, 'homards', m);
  assert.ok(m.scandal);
  buy('cheminade', true);
  buy('cheminade', true);
  const dore = [...p.hand, ...p.board].find((x) => x.golden) as Minion;
  assert.ok(dore);
  // Ses deux casseroles pas oubliées refont scandale sur le doré, avec leurs défauts, une seule fois.
  assert.ok(dore.scandal);
  assert.equal(dore.budgetPerRound, -2);
});

test('les casseroles suivent leurs propriétaires, changent à l\'actualisation et restent au gel', () => {
  const { game, p, buy } = setup(11);
  game.params.casseroleOwnerChance = 1;
  buy('sarkozy');
  game.round = Math.max(game.round, game.params.casseroleFromRound);
  const sarkozy = new Set(CASSEROLES.filter((c) => c.owner === 'sarkozy').map((c) => c.id));
  for (let i = 0; i < 10; i++) {
    assert.equal(applyAction(game, 0, { t: 'roll' }).ok, true);
    assert.ok(sarkozy.has(p.casseroleOffer as string), 'Actualiser tire une nouvelle casserole, ici toujours de Sarkozy');
  }
  game.params.casseroleOwnerChance = 0;
  const vues = new Set<string>();
  for (let i = 0; i < 30; i++) {
    applyAction(game, 0, { t: 'roll' });
    vues.add(p.casseroleOffer as string);
  }
  assert.ok([...vues].some((id) => !sarkozy.has(id)), 'sans le réglage, toutes les casseroles sortent');
  const gelee = p.casseroleOffer;
  applyAction(game, 0, { t: 'freeze' });
  resolveRound(game);
  if (p.alive) assert.equal(p.casseroleOffer, gelee);
});

test('une casserole qui compte pour deux fait scandale à elle seule', () => {
  const { game, p, buy } = setup(11);
  buy('cheminade');
  const m = p.board[0];
  poseCasserole(game, 'mandat_depot', m);
  assert.ok(m.scandal);
  assert.equal(p.board.includes(m), true, 'plus de prison : il reste sur le plateau');
});

test('Je traverse la rue trouve un politique gratuit de l\'échelon du joueur', () => {
  const { game, p, buy } = setup();
  buy('cheminade');
  poseCasserole(game, 'traverser_la_rue', p.board[0]);
  const found = p.hand[0];
  assert.ok(found);
  assert.ok(CARD_BY_ID[found.cardId].tier <= p.tier);
});

test('le Ralliement fusionne avec l\'allié : stats, mots-clés et effets', () => {
  const { game, p, buy } = setup();
  buy('cheminade');
  buy('dupond_moretti', true);
  const host = p.board[0];
  const [atk, hp] = [host.atk, host.hp];
  assert.equal(applyAction(game, 0, { t: 'play', uid: p.hand[0].uid, onto: host.uid }).ok, true);
  assert.equal(p.board.length, 1);
  assert.deepEqual([host.atk, host.hp], [atk + 3, hp + 3]);
  assert.equal(host.keywords.includes('immunite'), true);
  assert.equal(host.merged.includes('dupond_moretti'), true);
  buy('arthaud', true);
  assert.equal(applyAction(game, 0, { t: 'play', uid: p.hand[0].uid, onto: host.uid }).ok, false, 'pas sans Ralliement');
});

test('l\'échelon 6, le Panthéon : De Gaulle fait de tous vos politiques des Ni droite ni gauche, Giscard laisse sa chaise vide', () => {
  assert.equal(PARAMS.tierMax, 6);
  const legendes = CARDS.filter((c) => c.tier === 6);
  assert.ok(legendes.length >= 4 && legendes.every((c) => c.camp === 'civile'), 'au-dessus des partis');
  const { game, p, buy } = setup();
  buy('boyard');
  buy('houssin');
  buy('de_gaulle');
  assert.ok(p.board.every((m) => m.keywords.includes('ni_droite_ni_gauche')));
  const g = createGame({ seed: 3, heroes: Array(8).fill('attal') });
  const q = g.players[0];
  q.budget = 100;
  q.shop = ['giscard'];
  assert.equal(applyAction(g, 0, { t: 'buy', slot: 0 }).ok, true);
  const giscard = q.board[0];
  assert.ok(giscard.keywords.includes('retour'));
  assert.deepEqual(TOKENS.chaise_vide.keywords, ['porte_parole']);
  assert.ok(giscard.effects.some((e) => e.when === 'heritage' && e.do === 'invoquer' && e.token === 'chaise_vide'));
});

test('Lafont : chaque actualisation lui donne +2/+0, et la boutique reste tirée au hasard', () => {
  const { game, p, buy } = setup();
  assert.ok(game.camps.includes('reconquete'));
  buy('lafont');
  const lafont = p.board.find((m) => m.cardId === 'lafont') as Minion;
  const [atk, hp] = [lafont.atk, lafont.hp];
  for (let i = 0; i < 3; i++) assert.equal(applyAction(game, 0, { t: 'roll' }).ok, true);
  assert.deepEqual([lafont.atk, lafont.hp], [atk + 6, hp]);
});

test('le débauchage prend les stats du serviteur de la boutique, gains compris', () => {
  const { game, p, buy } = setup();
  buy('arthaud'); // Annonce : la boutique a +1/+1 pour la partie.
  buy('houssin', true);
  p.shop = ['chirac'];
  applyAction(game, 0, { t: 'play', uid: p.hand[0].uid });
  const houssin = p.board.find((m) => m.cardId === 'houssin') as Minion;
  // Houssin a lui-même +1/+1 de la boutique, et prend Chirac (3/6) avec son +1/+1.
  assert.deepEqual([houssin.atk, houssin.hp], [2 + 4, 2 + 7]);
  assert.equal(p.shop.length, 0);
  assert.equal(p.counters.debauchages, 1);
});

test('Primaire : détruire un allié déclenche son Héritage au recrutement, puis découvre son camp', () => {
  const { game, p, buy } = setup();
  buy('bouamrane'); // Héritage : invoque un Suppléant.
  p.spells.push({ uid: 9001, spellId: 'primaire' });
  assert.equal(applyAction(game, 0, { t: 'cast', uid: 9001, target: p.board[0].uid }).ok, true);
  assert.equal(p.board[0].cardId, 'suppleant');
  assert.ok(p.discover && p.discover.options.length > 0);
});

test('Lassalle double les Fins de tour', () => {
  const { game, p, buy } = setup();
  buy('doucet');
  buy('lassalle');
  const doucet = p.board[0];
  const before = doucet.atk;
  startCombats(game);
  assert.equal(doucet.atk, before + 2);
});

test('Jadot relance la Fin de tour de ses voisins, une seule fois par manche (règle R4)', () => {
  const { game, p, buy } = setup();
  buy('doucet');
  buy('jadot');
  buy('lassalle');
  const doucet = p.board[0];
  const before = doucet.atk;
  startCombats(game);
  // Doucet joue deux fois (Lassalle), Jadot le relance une fois, malgré Lassalle.
  assert.equal(doucet.atk, before + 3);
});

test('Hollande : son Héritage rend le camp plus fort pour de bon, même en combat', () => {
  const { game, p, buy } = setup();
  buy('hollande');
  buy('thevenoud');
  const thevenoud = p.board[1];
  const before = thevenoud.atk;
  for (const q of game.players.slice(1)) q.board = [makeMinion(CARD_BY_ID.chirac, 50000 + q.seat), { ...makeMinion(CARD_BY_ID.mitterrand, 60000 + q.seat), atk: 30, hp: 30 }];
  startCombats(game);
  assert.ok(thevenoud.atk >= before + 2, 'Hollande meurt deux fois (Retour)');
});

test('Durif, à chaque fin de tour, donne +1/+1 à un autre allié', () => {
  const { game, p, buy } = setup();
  buy('durif');
  buy('cheminade');
  const target = p.board[1];
  resolveRound(game);
  assert.equal(target.atk, CARD_BY_ID.cheminade.atk + 1);
});

test('la Dépense : Rugy grandit chaque fois que vous avez dépensé 5', () => {
  const { game, p, buy } = setup();
  buy('rugy');
  const rugy = p.board[0];
  const atk = rugy.atk;
  for (let i = 0; i < 4; i++) applyAction(game, 0, { t: 'roll' });
  buy('cheminade');
  const perStep = (CARD_BY_ID.rugy.effects ?? [])[0] as Effect & { atk: number };
  assert.equal(rugy.atk, atk + 2 * perStep.atk, 'dépensé 3, puis 4 actualisations et un achat : les tranches de 5 et de 10');
});

test('les cartes « cette partie » : Trouvé grandit à chaque Tract, même arrivée tard', () => {
  const { game, p, buy } = setup();
  buy('kazib');
  applyAction(game, 0, { t: 'cast', uid: p.spells[0].uid, target: p.board[0].uid });
  assert.equal(p.counters.tracts, 1);
  buy('trouve');
  const trouve = p.board.find((m) => m.cardId === 'trouve') as Minion;
  assert.equal(trouve.atk, CARD_BY_ID.trouve.atk + 1);
});

test('un Tract gagné main pleine se joue sur le premier serviteur (règle R5)', () => {
  const { game, p, buy } = setup();
  buy('cheminade');
  for (const id of ['durif', 'lalanne', 'arthaud', 'branco', 'roussel', 'poutou', 'lassalle', 'chirac', 'mitterrand', 'cahuzac']) buy(id, true);
  assert.equal(p.hand.length + p.spells.length, PARAMS.handSize);
  const front = p.board[0];
  const atk = front.atk;
  assert.equal(addSpellToHand(game, p, 'tract'), false);
  assert.equal(front.atk, atk + 1);
  assert.equal(p.counters.tracts, 1, 'il compte comme un sort lancé');
});

test('la lassitude termine les parties où plus personne ne gagne', () => {
  const game = createGame({ seed: 21, seats: 2, heroes: ['attal', 'attal'] });
  let guard = 0;
  while (game.phase === 'recrutement' && guard++ < 60) resolveRound(game);
  assert.equal(game.phase, 'fini');
  assert.ok(guard < 60);
});

test('les plateaux montent de France 3 jusqu\'au débat de TF1, réservé aux deux derniers', () => {
  assert.equal(plateauFor(1, 8).id, 'france3');
  assert.equal(plateauFor(2, 8).id, 'hanouna');
  assert.equal(plateauFor(3, 8).id, 'cnews');
  assert.equal(plateauFor(99, 3).id, PLATEAUX[PLATEAUX.length - 1].id);
  assert.equal(plateauFor(5, 2), SECOND_TOUR);
  for (let round = 1; round < 30; round++) assert.notEqual(plateauFor(round, 3), SECOND_TOUR);
  assert.equal(viewFor(createGame({ seed: 1 }), 0).plateau.id, 'france3');
});

test('les données sont cohérentes', () => {
  const ids = new Set(CARDS.map((c) => c.id));
  assert.equal(ids.size, CARDS.length, 'identifiants de cartes uniques');
  for (const s of SPELLS) assert.equal(ids.has(s.id), false, `${s.id} : un sort a le nom d'une carte`);
  for (const c of CARDS) {
    assert.ok(c.tier >= 1 && c.tier <= PARAMS.tierMax, c.id);
    assert.ok(c.atk >= 0 && c.hp > 0, c.id);
    for (const e of c.effects ?? []) {
      if (e.do === 'invoquer') assert.ok(TOKENS[e.token], `${c.id} : jeton inconnu`);
      if (e.to === 'cible') assert.ok(['annonce', 'permanence'].includes(e.when), `${c.id} : une cible choisie hors Annonce et Permanence`);
    }
  }
  for (const c of CASSEROLES) {
    assert.ok(ids.has(c.owner), `${c.id} : propriétaire inconnu`);
    assert.ok(c.statut.length > 0, `${c.id} : statut manquant`);
    assert.ok(c.blague.length > 0, `${c.id} : blague manquante`);
    assert.ok(c.fait.length > 0, `${c.id} : fait manquant`);
    if (c.summon) assert.ok(TOKENS[c.summon], `${c.id} : jeton inconnu`);
  }
  assert.ok(HEROES.length >= 8);
});

test('chaque camp a au moins une Vedette avec une Célébration', () => {
  const camps = new Set(CARDS.map((c) => c.camp));
  for (const camp of camps) {
    const stars = CARDS.filter((c) => c.camp === camp && c.keywords?.includes('vedette') && c.effects?.some((e) => e.when === 'celebration'));
    assert.ok(stars.length > 0, camp);
  }
});

test('des parties complètes se terminent avec un classement valide', () => {
  for (let seed = 1; seed <= 4; seed++) {
    for (const level of ['facile', 'moyen', 'difficile'] as const) {
      const r = playGame({ seed, levels: Array(8).fill(level) });
      assert.equal(r.truncated, false, `partie ${seed} ${level} tronquée`);
      assert.equal(r.rejected, 0, `partie ${seed} ${level} : actions refusées`);
      const places = r.seats.map((s) => s.place).sort((a, b) => a - b);
      assert.deepEqual(places, [1, 2, 3, 4, 5, 6, 7, 8]);
    }
  }
});

test('une même graine donne la même partie', () => {
  const levels = Array(8).fill('moyen');
  assert.deepEqual(playGame({ seed: 42, levels }), playGame({ seed: 42, levels }));
});

test('la Fin de tour est notée effet par effet, et part avec la vue du combat (3 novembre 2026)', async () => {
  const { applyAction, combatViewFor, createGame, startCombats } = await import('../src/engine/game.ts');
  const { addMinionToHand } = await import('../src/engine/recruit.ts');
  const game = createGame({ seed: 9, seats: 2, heroes: ['tondelier', 'philippe'], activeCamps: ['ecologistes', 'macronie', 'insoumis', 'rn', 'socialistes'], combatLog: true });
  const p = game.players[0];
  p.budget = 20;
  const placed = ['doucet', 'macron'].map((id) => {
    const m = addMinionToHand(game, p, id);
    assert.ok(m && applyAction(game, 0, { t: 'play', uid: m.uid }).ok);
    return m;
  });
  const [doucet, macron] = placed;
  const before = { atk: p.board[0].atk, hp: p.board[0].hp };
  startCombats(game);
  const steps = p.endOfTurnSteps;
  const grow = steps.find((s) => s.source === doucet.uid);
  assert.ok(grow, 'Doucet joue sa Fin de tour');
  assert.deepEqual(grow.changes.map((c) => c.uid), [doucet.uid]);
  const idle = steps.find((s) => s.source === macron.uid);
  assert.ok(idle && idle.changes.length === 0 && idle.notes.length === 0, 'Macron sans doré : rien à faire, et ça se voit');
  const hero = steps.find((s) => s.source === null);
  assert.ok(hero, 'le pouvoir de Tondelier est une étape');
  assert.deepEqual(hero.changes[0], { uid: p.board[0].uid, atk: before.atk + 2, hp: before.hp + 2, keywords: p.board[0].keywords }, 'Doucet +1/+1, puis Tondelier +1/+1 sur le premier');
  const view = combatViewFor(game, 0);
  assert.equal(view?.endOfTurn.length, steps.length);
  assert.ok(!view?.log.some((e) => e.e === 'effet' && e.when === 'fin_tour'), 'le combat ne rejoue plus la Fin de tour');
});
