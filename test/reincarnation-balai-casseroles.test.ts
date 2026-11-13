import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCombat } from '../src/engine/combat.ts';
import { applyAction, createGame, startRound } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { makeMinion } from '../src/engine/minion.ts';
import { addSpellToHand } from '../src/engine/recruit.ts';
import { createRng } from '../src/engine/rng.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { CASSEROLES } from '../src/data/casseroles.ts';
import { PARAMS } from '../src/data/params.ts';
import type { CombatEvent, Effect, HeroMods, Keyword, Minion } from '../src/engine/types.ts';

/**
 * La réincarnation (R20) : le politique meurt pour de bon, son Héritage joue, puis il se réincarne à sa place, s'il y
 * a la place (13 novembre 2026).
 */

let uid = 1;
function unit(atk: number, hp: number, keywords: Keyword[] = [], effects: Effect[] = []): Minion {
  return { ...makeMinion({ id: 'test', name: 'Test', camp: 'civile', tier: 1, atk, hp, keywords }, uid++), keywords, effects };
}

function fight(a: Minion[], b: Minion[], seed = 1, mods: HeroMods = {}) {
  return resolveCombat(
    { minions: a, mods, hp: 30 },
    { minions: b, mods: {}, hp: 30 },
    { params: PARAMS, ctx: null, rng: createRng(seed), log: true },
  );
}

type Of<K extends CombatEvent['e']> = Extract<CombatEvent, { e: K }>;
const isRetour = (e: CombatEvent): e is Of<'retour'> => e.e === 'retour';

test('Retour en politique : il meurt pour de bon, son Héritage joue, puis il se réincarne à sa place', () => {
  const bouamrane = { ...makeMinion(CARD_BY_ID.bouamrane, uid++), keywords: ['retour'] as Keyword[], hp: 1 };
  const r = fight([unit(1, 50, ['porte_parole']), bouamrane], [unit(3, 300)], 4);
  const death = r.log.findIndex((e) => e.e === 'mort' && e.uid === bouamrane.uid);
  const summon = r.log.findIndex((e, i) => i > death && e.e === 'invocation' && e.unit.cardId === 'suppleant');
  const back = r.log.findIndex((e) => isRetour(e) && e.from === bouamrane.uid);
  assert.ok(death > 0, 'il meurt');
  assert.ok(summon > death && back > summon, 'son Suppléant arrive avant sa réincarnation');
  const reborn = r.log[back] as Of<'retour'>;
  assert.notEqual(reborn.unit.uid, bouamrane.uid, 'une nouvelle incarnation');
  assert.equal(reborn.unit.hp, 1);
  assert.ok(!reborn.unit.keywords.includes('retour'));
  const placed = r.log[summon] as Of<'invocation'>;
  assert.equal(reborn.index, placed.index, 'il reprend sa place, le Suppléant passe à sa droite');
});

test('Retour en politique : sans place sur le plateau, pas de réincarnation', () => {
  const giscard = { ...makeMinion(CARD_BY_ID.giscard, uid++), hp: 1, keywords: ['retour', 'porte_parole'] as Keyword[] };
  // Mitterrand double l'Héritage : deux chaises vides remplissent les places.
  const mitterrand = { ...makeMinion(CARD_BY_ID.mitterrand, uid++), hp: 900 };
  const filler = Array.from({ length: 5 }, () => unit(0, 500));
  const r = fight([giscard, mitterrand, ...filler], [unit(5, 900)], 2);
  assert.ok(r.log.some((e) => e.e === 'mort' && e.uid === giscard.uid), 'Giscard tombe');
  assert.equal(r.log.filter((e) => e.e === 'invocation' && e.unit.cardId === 'chaise_vide').length, 1, 'une seule chaise trouve sa place');
  assert.equal(r.log.filter(isRetour).length, 0, 'plateau plein : il ne revient pas');
});

test('Retour en politique : il revient tel qu\'il est entré en combat, Polémique comprise', () => {
  let seen = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const venom = unit(4, 1, ['polemique', 'retour']);
    const r = fight([venom], [unit(1, 5), unit(1, 5), unit(1, 5)], seed);
    const back = r.log.find((e): e is Of<'retour'> => isRetour(e) && e.from === venom.uid);
    if (!back) continue;
    seen++;
    assert.ok(back.unit.keywords.includes('polemique'), `graine ${seed} : sa Polémique de départ revient`);
    assert.equal(back.unit.atk, 4, `graine ${seed} : son attaque de départ`);
  }
  assert.ok(seen > 0);
});

test('Retour en politique : les gains du combat ne survivent pas à la mort, ceux pour de bon restent au politique du plateau', () => {
  const guedj = makeMinion(CARD_BY_ID.guedj, uid++);
  const r = fight([{ ...guedj, hp: 1 }, unit(1, 80, ['porte_parole'])], [unit(5, 300)], 6);
  const back = r.log.find((e): e is Of<'retour'> => isRetour(e) && e.from === guedj.uid);
  assert.ok(back, 'il revient');
  assert.equal(back.unit.atk, guedj.atk, 'sa réincarnation a l\'attaque de son entrée en combat');
  assert.ok(r.persist[0].buffs.filter((g) => g.uid === guedj.uid).length >= 2, 'ses gains pour de bon vont au Guedj du plateau');
});

test('le premier mort qui revient (pouvoir de héros) ne se consomme que s\'il revient', () => {
  const r = fight([unit(1, 1), unit(1, 1)], [unit(5, 200)], 3, { firstDeathRetour: true });
  assert.equal(r.log.filter(isRetour).length, 1);
});

test('une réincarnation qui survit célèbre pour le politique du plateau', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const thevenoud = { ...makeMinion(CARD_BY_ID.thevenoud, uid++), atk: 30, hp: 1 };
    const r = fight([thevenoud], [unit(1, 1), unit(0, 1)], seed);
    const back = r.log.find((e): e is Of<'retour'> => isRetour(e) && e.from === thevenoud.uid);
    if (!back || r.winner !== 0) continue;
    assert.deepEqual(r.celebrants, [{ side: 0, uid: thevenoud.uid }]);
    return;
  }
  assert.fail('aucune graine ne fait célébrer une réincarnation');
});

// Le Coup de balai : ses attaques touchent aussi les voisins de sa cible.

test('Coup de balai : la cible et ses voisins prennent le coup, seule la cible riposte', () => {
  const sweeper = unit(3, 50, ['balai']);
  const left = unit(1, 10);
  const middle = unit(2, 10, ['porte_parole']);
  const right = unit(1, 10);
  const far = unit(1, 10);
  const r = fight([sweeper], [left, middle, right, far], 1);
  const first = r.log.findIndex((e) => e.e === 'attaque' && e.from === sweeper.uid);
  assert.ok(first >= 0);
  const blows = r.log.slice(first + 1).filter((e): e is Of<'degats'> => e.e === 'degats').slice(0, 4);
  assert.deepEqual(blows.map((e) => e.uid).sort(), [left.uid, middle.uid, right.uid, sweeper.uid].sort(), 'trois ennemis et la riposte de la cible');
  assert.ok(blows.every((e) => e.uid === sweeper.uid ? e.value === 2 : e.value === 3));
  assert.ok(!blows.some((e) => e.uid === far.uid), 'le voisin du voisin n\'est pas touché');
});

test('Coup de balai : une Immunité voisine pare le coup', () => {
  const sweeper = unit(3, 50, ['balai']);
  const shielded = unit(0, 10, ['immunite']);
  const middle = unit(0, 10, ['porte_parole']);
  const r = fight([sweeper], [shielded, middle], 1);
  const first = r.log.findIndex((e) => e.e === 'attaque' && e.from === sweeper.uid);
  assert.ok(r.log.slice(first).some((e) => e.e === 'immunite' && e.uid === shielded.uid));
  const firstHits = r.log.slice(first + 1, first + 4);
  assert.ok(!firstHits.some((e) => e.e === 'degats' && e.uid === shielded.uid), 'pas de dégâts derrière l\'Immunité');
});

test('Coup de balai et Polémique : tous ceux que le coup blesse tombent, puis la Polémique se perd', () => {
  const sweeper = unit(1, 50, ['balai', 'polemique']);
  const foes = [unit(0, 30), unit(0, 30, ['porte_parole']), unit(0, 30)];
  const r = fight([sweeper], foes, 1);
  assert.equal(r.log.filter((e) => e.e === 'polemique').length, 3);
  assert.equal(r.winner, 0);
});

// Les casseroles : un vrai défaut, l'éclaboussure, et l'oubli du peuple qui paie.

test('chaque casserole a un défaut qui coûte à tout porteur (sauf les deux qui font tout oublier)', () => {
  const soft = CASSEROLES.filter((c) => !c.forgetsAll && !((c.budgetPerRound ?? 0) < 0 || c.pollsPerRound || c.noAttack || c.splash || c.hpLossOnDeath));
  assert.deepEqual(soft.map((c) => c.id), [], '« perd ses effets » ou « ne bouge plus » seuls ne coûtent rien à certains porteurs');
});

function table(seed = 21): { game: Game; p: Game['players'][number]; buy: (id: string) => Minion; pose: (id: string, m: Minion) => void } {
  const game = createGame({ seed, heroes: Array(8).fill('attal') });
  const p = game.players[0];
  p.budget = 200;
  const buy = (id: string) => {
    p.shop = [id];
    assert.equal(applyAction(game, 0, { t: 'buy', slot: 0 }).ok, true, `achat de ${id}`);
    return p.board[p.board.length - 1];
  };
  const pose = (id: string, m: Minion) => {
    p.casseroleOffer = id;
    assert.equal(applyAction(game, 0, { t: 'buy_casserole' }).ok, true);
    const held = p.spells.find((x) => x.casseroleId === id) as { uid: number };
    assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: m.uid }).ok, true, `pose de ${id}`);
  };
  return { game, p, buy, pose };
}

test('un scandale qui éclabousse : ses voisins ont -2/-2 en combat, pas lui, et rien ne reste après', () => {
  const { p, buy, pose } = table();
  const left = buy('lucas');
  const marine = buy('lepen');
  const right = buy('doucet');
  pose('assistants_rn', marine);
  pose('homards', marine);
  assert.equal(marine.scandal?.splash, 2);
  const r = resolveCombat({ minions: p.board, mods: {}, hp: 30 }, { minions: [unit(0, 50)], mods: {}, hp: 30 }, { params: PARAMS, ctx: null, rng: createRng(1), log: true });
  const opening = r.log[0] as Of<'debut'>;
  assert.deepEqual(opening.sides[0].map((u) => u.atk), [left.atk, marine.atk, right.atk], 'le début montre le plateau');
  const fin = r.log.find((e): e is Of<'fin'> => e.e === 'fin');
  const after = new Map(fin?.sides[0].map((u) => [u.uid, u]));
  assert.equal(after.get(left.uid)?.atk, Math.max(0, left.atk - 2));
  assert.equal(after.get(right.uid)?.atk, Math.max(0, right.atk - 2));
  assert.equal(after.get(marine.uid)?.atk, marine.atk);
  assert.ok(r.log.some((e) => e.e === 'effet' && e.uid === marine.uid && e.casserole === 'assistants_rn'), 'on voit qui éclabousse');
});

test('Juppé : quand le peuple oublie un scandale, ce politique revient plus fort, avec l\'Immunité', () => {
  const { game, p, buy, pose } = table();
  buy('juppe');
  const target = buy('cope');
  pose('homards', target);
  pose('pain_au_chocolat', target);
  assert.ok(target.scandal);
  const before = { atk: target.atk, hp: target.hp };
  addSpellToHand(game, p, 'bracelet_electronique');
  const bracelet = p.spells.find((x) => x.spellId === 'bracelet_electronique') as { uid: number };
  assert.equal(applyAction(game, 0, { t: 'cast', uid: bracelet.uid }).ok, true);
  assert.equal(target.scandal, undefined);
  assert.deepEqual({ atk: target.atk, hp: target.hp }, { atk: before.atk + 4, hp: before.hp + 4 });
  assert.ok(target.keywords.includes('immunite'));
});

test('Juppé et sa casserole : le scandale à lui seul, puis l\'oubli du peuple à sa date', () => {
  const { game, p, buy, pose } = table();
  const juppe = buy('juppe');
  pose('meilleur_d_entre_nous', juppe);
  assert.ok(juppe.scandal && juppe.noAttack, 'inéligible : il n\'attaque plus');
  const until = juppe.scandal.until;
  while (game.round < until) startRound(game);
  assert.equal(juppe.scandal, undefined);
  assert.equal(juppe.noAttack, false);
  assert.ok(juppe.keywords.includes('immunite'), 'il revient avec l\'Immunité');
  assert.equal(p.stats.forgotten, 1);
});

// Les 49.3.

test('Borne : vos 49.3 se déclenchent deux fois, le sien compris', () => {
  const borne = makeMinion(CARD_BY_ID.borne, uid++);
  const other = unit(1, 10);
  const r = fight([borne, other], [unit(0, 50)], 1);
  const gains = r.log.filter((e): e is Of<'stats'> => e.e === 'stats' && e.uid === other.uid);
  assert.equal(gains[0]?.atk, 3);
  assert.equal(gains[1]?.atk, 5, 'deux fois +2/+2 à son voisin');
});

test('Barnier : son 49.3 gonfle les autres, puis il est censuré, se réincarne, et Borne double tout', () => {
  const barnier = makeMinion(CARD_BY_ID.barnier, uid++);
  const other = unit(1, 10);
  const r = fight([barnier, other], [unit(0, 50)], 1);
  assert.ok(r.log.some((e) => e.e === 'mort' && e.uid === barnier.uid), 'censuré');
  assert.ok(r.log.some((e) => e.e === 'retour' && e.from === barnier.uid), 'puis réélu : il se réincarne');
  const statsOf = (log: CombatEvent[], id: number) => log.filter((e): e is Of<'stats'> => e.e === 'stats' && e.uid === id);
  assert.equal(statsOf(r.log, other.uid).at(-1)?.atk, 3, '+2/+2');
  // Borne, voisine de l'autre, double le 49.3 de Barnier et le sien.
  const withBorne = fight([makeMinion(CARD_BY_ID.barnier, uid++), makeMinion(CARD_BY_ID.borne, uid++), other], [unit(0, 80)], 1);
  assert.equal(statsOf(withBorne.log, other.uid).at(-1)?.atk, 1 + 2 + 2 + 2 + 2, 'Barnier deux fois, Borne deux fois');
});
