import test from 'node:test';
import assert from 'node:assert/strict';
import { createBot, decide } from '../src/bots/bots.ts';
import { HEROES } from '../src/data/heroes.ts';
import { PERSONNALITES } from '../src/data/personnalites.ts';
import { REPLIQUES } from '../src/data/repliques.ts';
import { applyAction, createGame, viewFor } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { addMinionToHand, addSpellToHand, take } from '../src/engine/recruit.ts';
import type { Camp, Minion, PlayerAction } from '../src/engine/types.ts';
import { playGame } from '../src/sim/simulate.ts';

const PERSONNAGES = Array(8).fill({ personnage: true });

function partiesAvecHeros(heroId: string, autre: string, games = 40) {
  const seats = [];
  for (let i = 0; i < games; i++) {
    const heroes = [heroId, autre, autre, autre, autre, autre, autre, autre].map((h, s) => (s === 0 ? h : HEROES[(s + i) % HEROES.length].id));
    seats.push(playGame({ seed: 3 + i * 7919, levels: Array(8).fill('moyen'), styles: PERSONNAGES, heroes }).seats[0]);
  }
  return seats;
}

const moyenne = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

test('chaque héros a un personnage et ses répliques', () => {
  for (const h of HEROES) {
    assert.ok(PERSONNALITES[h.id], `personnalité de ${h.id}`);
    for (const e of ['debut', 'victoire', 'defaite', 'elimine'] as const) assert.ok(REPLIQUES[h.id]?.[e], `${h.id} : ${e}`);
  }
});

test('un personnage n\'a jamais une action refusée, à aucun niveau', () => {
  for (const level of ['debutant', 'facile', 'moyen', 'difficile'] as const) {
    for (let i = 0; i < 6; i++) {
      const r = playGame({ seed: 50 + i, levels: Array(8).fill(level), styles: PERSONNAGES });
      assert.equal(r.rejected, 0, level);
      assert.equal(r.truncated, false, level);
    }
  }
});

test('la même graine donne les mêmes décisions, personnages compris', () => {
  const a = playGame({ seed: 77, levels: Array(8).fill('difficile'), styles: PERSONNAGES });
  const b = playGame({ seed: 77, levels: Array(8).fill('difficile'), styles: PERSONNAGES });
  assert.deepEqual(a.seats, b.seats);
});

test('le bot choisit un héros proposé, sans lire autre chose que sa vue', () => {
  const game = createGame({ seed: 5, heroSelection: true });
  const view = viewFor(game, 0);
  const action = decide(view, createBot('moyen', 1, { personnage: true }));
  assert.equal(action?.t, 'hero');
  assert.ok((action as { i: number }).i < (view.heroOffers as string[]).length);
});

test('Balkany revend plus que les autres : il exploite son pouvoir', () => {
  const balkany = moyenne(partiesAvecHeros('balkany', 'lepen').map((s) => s.actions.sell ?? 0));
  const retailleau = moyenne(partiesAvecHeros('retailleau', 'lepen').map((s) => s.actions.sell ?? 0));
  assert.ok(balkany > retailleau, `${balkany} contre ${retailleau}`);
});

test('Lassalle actualise plus que les autres, et Sarkozy pose plus de casseroles', () => {
  const lassalle = moyenne(partiesAvecHeros('lassalle', 'lepen').map((s) => s.actions.roll ?? 0));
  const philippe = moyenne(partiesAvecHeros('philippe', 'lepen').map((s) => s.actions.roll ?? 0));
  assert.ok(lassalle > philippe, `${lassalle} contre ${philippe}`);
  const sarkozy = moyenne(partiesAvecHeros('sarkozy', 'lepen').map((s) => s.casseroles));
  const tondelier = moyenne(partiesAvecHeros('tondelier', 'lepen').map((s) => s.casseroles));
  assert.ok(sarkozy > tondelier, `${sarkozy} contre ${tondelier}`);
});

test('Zemmour tient son camp quand il est en jeu', () => {
  let tenu = 0;
  let parties = 0;
  for (let i = 0; i < 40; i++) {
    const r = playGame({ seed: 9 + i * 7919, levels: Array(8).fill('moyen'), styles: PERSONNAGES, heroes: ['zemmour'], activeCamps: ['reconquete', 'rn', 'insoumis', 'macronie', 'socialistes'] });
    parties++;
    if (r.seats[0].camp === 'reconquete') tenu++;
  }
  assert.ok(tenu / parties > 0.7, `${tenu} sur ${parties}`);
});

test('la hiérarchie des niveaux tient : un moyen domine une table de faciles', () => {
  let places = 0;
  const games = 120;
  for (let i = 0; i < games; i++) {
    places += playGame({ seed: 5 + i * 7919, levels: ['moyen', ...Array(7).fill('facile')] }).seats[0].place;
  }
  assert.ok(places / games < 3.2, `place ${places / games}`);
});

// Les combos du difficile (10 novembre 2026) : la casserole du doublement de Sarkozy, et le Bracelet qui efface le scandale.

/** Une table où le siège 0 a Sarkozy, un petit politique et un gros, sans boutique ni sorts à acheter. */
function tableSarkozy(): { game: Game; small: Minion; big: Minion } {
  const game = createGame({ seed: 11, seats: 2, heroes: ['philippe', 'philippe'], activeCamps: ['republicains', 'macronie', 'socialistes', 'ecologistes', 'reconquete'] });
  const p = game.players[0];
  p.tier = 6;
  p.budget = 50;
  const lay = (id: string) => {
    assert.ok(take(game, id));
    const m = addMinionToHand(game, p, id) as Minion;
    assert.equal(applyAction(game, 0, { t: 'play', uid: m.uid }).ok, true);
    return p.board.find((x) => x.uid === m.uid) as Minion;
  };
  lay('sarkozy');
  const small = lay('kazib');
  const big = lay('lucas');
  big.atk = 40;
  big.hp = 40;
  p.shop = [];
  p.shopSpells = [];
  return { game, small, big };
}

/** Le tour du bot, action par action. */
function botTurn(game: Game, combos: boolean): PlayerAction[] {
  const bot = createBot('difficile', 5, { combos });
  const done: PlayerAction[] = [];
  for (let n = 0; n < 40; n++) {
    const action = decide(viewFor(game, 0), bot);
    if (!action) break;
    assert.equal(applyAction(game, 0, action).ok, true, JSON.stringify(action));
    done.push(action);
  }
  return done;
}

test('combos : la casserole du doublement de Sarkozy va sur le plus gros politique', () => {
  const { game, big } = tableSarkozy();
  const p = game.players[0];
  p.casseroleOffer = 'homards';
  p.budget = 2;
  botTurn(game, true);
  assert.equal(p.casseroleOffer, null, 'la casserole est achetée');
  assert.ok(big.casseroles.includes('homards'), 'posée sur le gros');
  assert.ok(big.atk >= 80, `doublé : ${big.atk}/${big.hp}`);
});

test('combos : avec un Bracelet en main, le scandale du doublement est effacé dans la même manche', () => {
  const { game, big } = tableSarkozy();
  const p = game.players[0];
  big.casseroles.push('scooter');
  big.charges = 1;
  addSpellToHand(game, p, 'bracelet_electronique');
  p.casseroleOffer = 'homards';
  p.budget = 2;
  const actions = botTurn(game, true);
  assert.ok(big.casseroles.includes('homards'), 'la casserole va sur le gros malgré le scandale');
  assert.ok(big.atk >= 80, 'doublé');
  assert.ok(!big.scandal, 'le Bracelet a effacé le scandale');
  assert.ok(big.bracelet, 'il est sous bracelet');
  assert.ok(!p.spells.some((s) => s.spellId === 'bracelet_electronique'), 'Bracelet lancé');
  assert.ok(actions.findIndex((a) => a.t === 'buy_casserole') < actions.findLastIndex((a) => a.t === 'cast'));
});

// Ce que sait le difficile (10 et 11 novembre 2026) : le gel, le voisinage, la force des cartes. Et le facile distrait.

/** Une table nue pour le siège 0 : échelon 6, sans boutique, avec ces politiques posés. */
function tableAvec(ids: string[], camps: Camp[] = ['ecologistes', 'macronie', 'socialistes', 'republicains', 'reconquete']): { game: Game; board: Minion[] } {
  const game = createGame({ seed: 13, seats: 2, heroes: ['philippe', 'philippe'], activeCamps: camps });
  const p = game.players[0];
  p.tier = 6;
  p.budget = 50;
  for (const id of ids) {
    assert.ok(take(game, id), id);
    const m = addMinionToHand(game, p, id) as Minion;
    assert.equal(applyAction(game, 0, { t: 'play', uid: m.uid }).ok, true, id);
  }
  p.shop = [];
  p.shopSpells = [];
  p.casseroleOffer = null;
  p.budget = 0;
  return { game, board: p.board };
}

test('difficile : Jadot se place entre deux Fins de tour', () => {
  const voisins = (combos: boolean) => {
    const { game } = tableAvec(['jadot', 'kazib', 'piolle', 'lucas', 'doucet']);
    botTurn(game, combos);
    const order = game.players[0].board.map((m) => m.cardId);
    const i = order.indexOf('jadot');
    return [order[i - 1], order[i + 1]].sort().join(', ');
  };
  assert.equal(voisins(true), 'doucet, piolle');
  assert.notEqual(voisins(false), 'doucet, piolle', 'sans les combos, il ne regarde que le combat');
});

test('difficile : sans budget, il gèle la boutique qui complète un triple', () => {
  const { game } = tableAvec(['lucas', 'lucas']);
  const p = game.players[0];
  p.shop = ['lucas', 'kazib'];
  const actions = botTurn(game, true);
  assert.ok(actions.some((a) => a.t === 'freeze'), JSON.stringify(actions));
  assert.equal(p.frozen, true);
  const sans = tableAvec(['lucas', 'lucas']);
  sans.game.players[0].shop = ['lucas', 'kazib'];
  assert.ok(!botTurn(sans.game, false).some((a) => a.t === 'freeze'), 'sans les combos, jamais');
});

test('difficile : il sait que Zemmour gagne des parties, plus que Mitterrand que la formule préfère', () => {
  const choix = (combos: boolean) => {
    const { game } = tableAvec(['maillard', 'ndiaye'], ['macronie', 'reconquete', 'socialistes', 'republicains', 'ecologistes']);
    const p = game.players[0];
    p.shop = ['mitterrand', 'zemmour'];
    p.budget = 3;
    botTurn(game, combos);
    return [...p.board, ...p.hand].map((m) => m.cardId).find((id) => id === 'mitterrand' || id === 'zemmour');
  };
  assert.equal(choix(true), 'zemmour');
  assert.equal(choix(false), 'mitterrand', 'sans la table de force, la formule prend Mitterrand');
});

test('facile distrait : il oublie ses derniers sous, sans rien refuser', () => {
  const game = createGame({ seed: 17, seats: 2, heroes: ['philippe', 'philippe'] });
  const view = viewFor(game, 0);
  const bot = createBot('facile', 3);
  bot.round = view.round;
  bot.forgets = view.budget;
  assert.equal(decide(view, bot), null, 'distrait, il garde son budget');
  bot.forgets = 0;
  const action = decide(view, bot);
  assert.ok(action && action.t === 'buy', JSON.stringify(action));
});
