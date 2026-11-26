import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createGame, resolveRound, viewFor } from '../src/engine/game.ts';
import type { Game, Player } from '../src/engine/game.ts';
import type { Camp, Minion } from '../src/engine/types.ts';
import { heroMods } from '../src/engine/heroPower.ts';
import { stripTempKeywords } from '../src/engine/recruit.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { CASSEROLE_BY_ID } from '../src/data/casseroles.ts';
import { HERO_BY_ID } from '../src/data/heroes.ts';
import { createBot, decide } from '../src/bots/bots.ts';
import { parseClientMessage } from '../src/protocol/parseClientMessage.ts';
import { heroPowerStatus } from '../src/client/tools/heroPowerStatus.ts';
import { heroPowerCaption } from '../src/client/tools/heroPowerCaption.ts';
import { casseroleTallyLabel } from '../src/client/tools/casseroleTallyLabel.ts';
import { aimHint } from '../src/client/tools/aimHint.ts';

/**
 * Les pouvoirs de héros du 26 novembre 2026 : le compteur des casseroles posées, les paliers (Sarkozy, Macron), et les
 * pouvoirs activables, un sort qui reste sur le portrait.
 */

const CAMPS: Camp[] = ['ecologistes', 'republicains', 'macronie', 'socialistes', 'rn'];

function setup(heroId: string, seed = 7) {
  const game = createGame({ seed, seats: 2, heroes: [heroId, 'lepen'], activeCamps: CAMPS });
  const p = game.players[0];
  p.budget = 100;
  const buy = (cardId: string): Minion => {
    p.shop = [cardId];
    assert.equal(applyAction(game, 0, { t: 'buy', slot: 0 }).ok, true, `achat de ${cardId}`);
    return [...p.board].reverse().find((m) => m.cardId === cardId) as Minion;
  };
  const pose = (casseroleId: string, m: Minion) => {
    p.casseroleOffer = casseroleId;
    assert.equal(applyAction(game, 0, { t: 'buy_casserole' }).ok, true);
    const held = p.spells.find((s) => s.casseroleId === casseroleId) as { uid: number };
    assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: m.uid }).ok, true, `pose de ${casseroleId}`);
  };
  return { game, p, buy, pose };
}

/** La manche suivante, sans le combat du second siège qui nous gênerait : son plateau reste vide. */
function nextRound(game: Game, p: Player): void {
  resolveRound(game);
  p.budget = 100;
}

/** Des casseroles de grade 1 à poser, toutes différentes : une casserole ne se pose pas deux fois sur un même politique. */
const SMALL = Object.values(CASSEROLE_BY_ID).filter((c) => c.echelon === 1 && !c.forgetsAll && !c.swapStats && !c.summon).map((c) => c.id);

test('le compteur des casseroles posées est dans la vue, et Rugy y gagne +1/+1 par casserole, même arrivé après', () => {
  const { game, p, buy, pose } = setup('attal');
  const host = buy('gueant');
  pose(SMALL[0], host);
  pose(SMALL[1], host);
  assert.equal(viewFor(game, 0).counters.casseroles, 2);
  const rugy = buy('rugy');
  assert.deepEqual([rugy.atk, rugy.hp], [CARD_BY_ID.rugy.atk + 2, CARD_BY_ID.rugy.hp + 2], 'il rattrape les deux premières');
  pose(SMALL[2], host);
  assert.deepEqual([rugy.atk, rugy.hp], [CARD_BY_ID.rugy.atk + 3, CARD_BY_ID.rugy.hp + 3]);
});

test('Sarkozy : à partir de la 6e casserole posée, chacune donne +2/+2 de plus à celui qui la reçoit', () => {
  const { p, buy, pose } = setup('sarkozy');
  const hosts = [buy('gueant'), buy('morano'), buy('hortefeux')];
  for (let i = 0; i < 5; i++) pose(SMALL[i], hosts[i % 3]);
  assert.equal(heroMods(p).casseroleBonus, undefined, 'pas avant le palier');
  const target = hosts[2];
  const before = target.gains.find((g) => g.source === 'heros:sarkozy');
  assert.equal(before, undefined);
  pose(SMALL[5], target);
  assert.deepEqual(heroMods(p).casseroleBonus, { atk: 2, hp: 2 });
  const line = target.gains.find((g) => g.source === 'heros:sarkozy');
  assert.deepEqual([line?.atk, line?.hp], [2, 2], 'la sixième elle-même donne le bonus');
});

test('Macron : à partir de 5 casseroles posées, la première casserole de chaque manche donne ses stats deux fois', () => {
  const { game, p, buy, pose } = setup('macron');
  const hosts = [buy('gueant'), buy('morano'), buy('hortefeux')];
  for (let i = 0; i < 4; i++) pose(SMALL[i], hosts[i % 3]);
  nextRound(game, p);
  const c = CASSEROLE_BY_ID[SMALL[4]];
  const target = hosts[1];
  const before = { atk: target.atk, hp: target.hp };
  pose(c.id, target);
  assert.equal(target.atk - before.atk, 2 * Math.max(0, c.atk ?? 0), 'la cinquième, première de la manche, compte double');
  const second = CASSEROLE_BY_ID[SMALL[5]];
  const mid = { atk: hosts[0].atk };
  pose(second.id, hosts[0]);
  assert.equal(hosts[0].atk - mid.atk, Math.max(0, second.atk ?? 0), 'la deuxième de la manche, non');
  nextRound(game, p);
  const third = CASSEROLE_BY_ID[SMALL[6]];
  const again = { atk: hosts[2].atk };
  pose(third.id, hosts[2]);
  assert.equal(hosts[2].atk - again.atk, 2 * Math.max(0, third.atk ?? 0), 'la manche suivante, la première double de nouveau');
});

test('Macron : la casserole qui atteint le palier en pleine manche n\'est pas doublée si elle n\'est pas la première', () => {
  const { game, p, buy, pose } = setup('macron');
  const host = buy('gueant');
  for (let i = 0; i < 4; i++) pose(SMALL[i], host);
  const c = CASSEROLE_BY_ID[SMALL[4]];
  const other = buy('hortefeux');
  const before = other.atk;
  pose(c.id, other);
  assert.equal(other.atk - before, Math.max(0, c.atk ?? 0), 'cinquième de la manche, pas première : pas de doublement');
  nextRound(game, p);
  const next = CASSEROLE_BY_ID[SMALL[5]];
  const was = other.atk;
  pose(next.id, other);
  assert.equal(other.atk - was, 2 * Math.max(0, next.atk ?? 0), 'la première de la manche suivante, si');
});

test('Zemmour, Ben voyons : Polémique jusqu\'à la fin du prochain combat, une fois par manche, gratuit', () => {
  const { game, p, buy } = setup('zemmour');
  const m = buy('gueant');
  const budget = p.budget;
  assert.equal(applyAction(game, 0, { t: 'pouvoir', target: m.uid }).ok, true);
  assert.equal(p.budget, budget, 'gratuit');
  assert.ok(m.keywords.includes('polemique'));
  assert.deepEqual(m.tempKeywords, ['polemique']);
  const again = applyAction(game, 0, { t: 'pouvoir', target: m.uid });
  assert.equal(again.ok, false);
  assert.match(again.ok ? '' : again.error, /Déjà servi/);
  nextRound(game, p);
  assert.equal(m.keywords.includes('polemique'), false, 'le combat passé, la Polémique s\'en va');
  assert.equal(m.tempKeywords, undefined);
  assert.equal(m.gains.some((g) => g.keywords.includes('polemique')), false, 'et quitte le registre');
  assert.equal(applyAction(game, 0, { t: 'pouvoir', target: m.uid }).ok, true, 'la manche suivante, il resert');
});

test('un mot-clé temporaire le reste dans un triple, sauf si un des trois l\'avait pour de bon', () => {
  const { p, buy } = setup('zemmour');
  const m = buy('gueant');
  m.keywords.push('polemique');
  m.tempKeywords = ['polemique'];
  stripTempKeywords(m);
  assert.equal(m.keywords.includes('polemique'), false);
  assert.equal(p.board.includes(m), true);
});

test('une Polémique pour de bon, donnée par-dessus celle d\'un combat, reste après le combat', () => {
  const { game, p, buy } = setup('zemmour');
  const m = buy('gueant');
  assert.equal(applyAction(game, 0, { t: 'pouvoir', target: m.uid }).ok, true);
  p.shopSpells = ['petite_phrase'];
  assert.equal(applyAction(game, 0, { t: 'buy_spell', slot: 0 }).ok, true);
  const held = p.spells.find((s) => s.spellId === 'petite_phrase') as { uid: number };
  assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: m.uid }).ok, true, 'le sort n\'est pas refusé : la Polémique du pouvoir n\'est que temporaire');
  assert.equal(m.tempKeywords, undefined, 'elle est devenue durable');
  nextRound(game, p);
  assert.ok(m.keywords.includes('polemique'), 'la Petite phrase l\'a gardée');
  assert.ok(m.gains.some((g) => g.source === 'sort:petite_phrase' && g.keywords.includes('polemique')));
});

test('Temps de parole reprend le Porte-parole d\'un combat de Retailleau : plus rien de temporaire ne traîne (trouvé par le fuzz)', () => {
  const { game, p, buy } = setup('retailleau');
  const m = buy('gueant');
  assert.equal(applyAction(game, 0, { t: 'pouvoir', target: m.uid }).ok, true);
  assert.deepEqual(m.tempKeywords, ['porte_parole']);
  p.shopSpells = ['temps_de_parole'];
  assert.equal(applyAction(game, 0, { t: 'buy_spell', slot: 0 }).ok, true);
  const held = p.spells.find((s) => s.spellId === 'temps_de_parole') as { uid: number };
  assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: m.uid }).ok, true);
  assert.equal(m.keywords.includes('porte_parole'), false);
  assert.equal(m.tempKeywords, undefined);
});

test('Polony est refusée sans parti sur le plateau, Branco quand il n\'y a plus rien à découvrir', () => {
  const po = setup('polony');
  po.buy('cheminade');
  const refused = applyAction(po.game, 0, { t: 'pouvoir', target: po.p.board[0].uid });
  assert.match(refused.ok ? '' : refused.error, /Aucun parti/);
  assert.equal(po.p.powerUsed, false);
  const br = setup('branco');
  br.p.tier = 0;
  const empty = applyAction(br.game, 0, { t: 'pouvoir' });
  assert.match(empty.ok ? '' : empty.error, /Plus aucune casserole/);
  assert.equal(br.p.powerUsed, false, 'payé pour rien : refusé');
});

test('Mélenchon : Immunité pour de bon, une fois par partie ; refusée sur un politique qui l\'a déjà', () => {
  const { game, p, buy } = setup('melenchon');
  const immune = buy('balkany');
  const plain = buy('morano');
  const refused = applyAction(game, 0, { t: 'pouvoir', target: immune.uid });
  assert.equal(refused.ok, false, 'Balkany a déjà l\'Immunité : le pouvoir serait perdu');
  assert.equal(p.powerUsed, false, 'un refus ne compte pas comme servi');
  assert.equal(applyAction(game, 0, { t: 'pouvoir', target: plain.uid }).ok, true);
  nextRound(game, p);
  assert.ok(plain.keywords.includes('immunite'), 'pour de bon');
  const twice = applyAction(game, 0, { t: 'pouvoir', target: immune.uid });
  assert.match(twice.ok ? '' : twice.error, /une fois par partie/);
});

test('Balkany, Villa Pamplemousse : 1 budget par casserole posée, une fois par partie, refusé à zéro', () => {
  const { game, p, buy, pose } = setup('balkany');
  const empty = applyAction(game, 0, { t: 'pouvoir' });
  assert.equal(empty.ok, false, 'rien à encaisser');
  const host = buy('gueant');
  for (let i = 0; i < 3; i++) pose(SMALL[i], host);
  p.budget = 4;
  assert.equal(applyAction(game, 0, { t: 'pouvoir' }).ok, true);
  assert.equal(p.budget, 7);
  assert.equal(applyAction(game, 0, { t: 'pouvoir' }).ok, false);
});

test('Glucksmann, Taxe Zucman : pour 1, le plus fort de la boutique part et un allié prend ses stats', () => {
  const { game, p, buy } = setup('glucksmann');
  const m = buy('morano');
  p.shop = ['gueant', 'retailleau'];
  const before = { atk: m.atk, hp: m.hp, budget: p.budget };
  assert.equal(applyAction(game, 0, { t: 'pouvoir', target: m.uid }).ok, true);
  assert.equal(p.budget, before.budget - 1);
  assert.equal(p.shop.includes('retailleau'), false, 'le plus fort est parti (remplacé, comme tout débauché)');
  assert.deepEqual([m.atk - before.atk, m.hp - before.hp], [CARD_BY_ID.retailleau.atk, CARD_BY_ID.retailleau.hp]);
});

test('Hollande, Moi président : dore un politique ordinaire d\'échelon 4 ou moins, une fois par partie', () => {
  const { game, buy } = setup('hollande');
  const high = buy('pecresse');
  const low = buy('gueant');
  const refused = applyAction(game, 0, { t: 'pouvoir', target: high.uid });
  assert.match(refused.ok ? '' : refused.error, /échelon 4 ou moins/);
  assert.equal(applyAction(game, 0, { t: 'pouvoir', target: low.uid }).ok, true);
  assert.equal(low.golden, true);
});

test('Tondelier, la veste verte : +2/+2 sur un Écologiste, +1/+1 sur un autre', () => {
  const eco = setup('tondelier');
  const green = eco.buy('doucet');
  const before = { atk: green.atk, hp: green.hp };
  assert.equal(applyAction(eco.game, 0, { t: 'pouvoir', target: green.uid }).ok, true);
  assert.deepEqual([green.atk - before.atk, green.hp - before.hp], [2, 2]);
  const other = setup('tondelier');
  const right = other.buy('gueant');
  const was = { atk: right.atk, hp: right.hp };
  assert.equal(applyAction(other.game, 0, { t: 'pouvoir', target: right.uid }).ok, true);
  assert.deepEqual([right.atk - was.atk, right.hp - was.hp], [1, 1]);
});

test('Retailleau, Polony, Bertrand, Branco : chacun son effet, au prix écrit', () => {
  const r = setup('retailleau');
  const spoke = r.buy('gueant');
  assert.equal(applyAction(r.game, 0, { t: 'pouvoir', target: spoke.uid }).ok, true);
  assert.ok(spoke.keywords.includes('porte_parole'));

  const po = setup('polony');
  const a = po.buy('gueant');
  po.buy('doucet');
  const before = a.atk;
  assert.equal(applyAction(po.game, 0, { t: 'pouvoir', target: a.uid }).ok, true);
  assert.equal(a.atk - before, 2, 'deux camps différents sur le plateau');

  const b = setup('bertrand');
  const budget = b.p.budget;
  assert.equal(applyAction(b.game, 0, { t: 'pouvoir' }).ok, true);
  assert.equal(b.p.budget, budget - 1);
  assert.equal(b.p.lossBet, 3);

  const br = setup('branco');
  assert.equal(applyAction(br.game, 0, { t: 'pouvoir' }).ok, true);
  assert.equal(br.p.discover?.kind, 'casserole');
  for (const id of br.p.discover?.options ?? []) assert.ok(CASSEROLE_BY_ID[id].echelon <= br.p.tier, 'de son échelon ou moins');
});

test('un héros sans pouvoir activable refuse l\'action ; une carrière sans pouvoirs les retire', () => {
  const { game } = setup('attal');
  assert.equal(applyAction(game, 0, { t: 'pouvoir' }).ok, false);
  const career = createGame({ seed: 3, seats: 2, heroes: ['zemmour', 'lepen'], heroOverrides: { zemmour: { mods: {}, pouvoir: undefined } } });
  assert.equal(viewFor(career, 0).pouvoir, null);
});

test('la vue donne le pouvoir, s\'il a servi, et le palier ; les règles du moment comprennent le palier', () => {
  const { game, p, buy, pose } = setup('sarkozy');
  const view = viewFor(game, 0);
  assert.deepEqual(view.palier, HERO_BY_ID.sarkozy.palier);
  assert.equal(view.pouvoir, null);
  const hosts = [buy('gueant'), buy('morano')];
  for (let i = 0; i < 6; i++) pose(SMALL[i], hosts[i % 2]);
  assert.deepEqual(viewFor(game, 0).mods.casseroleBonus, { atk: 2, hp: 2 });
  assert.equal(p.hero.mods.casseroleBonus, undefined, 'le héros lui-même ne change pas');
});

test('le protocole laisse passer le pouvoir, avec ou sans cible, et rien d\'autre', () => {
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'action', seq: 1, action: { t: 'pouvoir' } })), { type: 'action', seq: 1, action: { t: 'pouvoir' } });
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'action', seq: 2, action: { t: 'pouvoir', target: 4 } })), { type: 'action', seq: 2, action: { t: 'pouvoir', target: 4 } });
  assert.equal(parseClientMessage(JSON.stringify({ type: 'action', seq: 3, action: { t: 'pouvoir', target: -1 } })), null);
  assert.equal(parseClientMessage(JSON.stringify({ type: 'action', seq: 4, action: { t: 'pouvoir', target: 'x' } })), null);
});

test('un bot moyen se sert du pouvoir de Zemmour avant de finir sa manche', () => {
  const { game, buy } = setup('zemmour');
  buy('gueant');
  buy('morano');
  const bot = createBot('moyen', 5);
  let used = false;
  for (let n = 0; n < 60; n++) {
    const action = decide(viewFor(game, 0), bot);
    if (!action) break;
    if (action.t === 'pouvoir') used = true;
    if (!applyAction(game, 0, action).ok) break;
  }
  assert.ok(used);
  assert.equal(game.players[0].powerUsed, true);
});

test('l\'écran : l\'état du pouvoir, sa légende, le compteur, la consigne de visée', () => {
  const { game, buy } = setup('zemmour');
  assert.equal(heroPowerStatus(viewFor(game, 0), 'Ben voyons')?.refusal, 'Il faut un politique sur le plateau.');
  const m = buy('gueant');
  const status = heroPowerStatus(viewFor(game, 0), 'Ben voyons');
  assert.deepEqual(status?.targets, [m.uid]);
  assert.equal(status?.refusal, null);
  assert.equal(status && heroPowerCaption(status), 'Une fois par manche');
  applyAction(game, 0, { t: 'pouvoir', target: m.uid });
  const used = heroPowerStatus(viewFor(game, 0), 'Ben voyons');
  assert.equal(used && heroPowerCaption(used), 'Déjà servi cette manche.');
  const taxed = setup('glucksmann');
  taxed.buy('gueant');
  taxed.p.shop = [];
  assert.equal(heroPowerStatus(viewFor(taxed.game, 0), 'Taxe Zucman')?.refusal, 'La boutique est vide : personne à débaucher.', 'la vraie raison, pas « personne ne peut le recevoir »');
  assert.equal(heroPowerStatus(viewFor(setup('attal').game, 0), 'Choc des savoirs'), null, 'un pouvoir passif n\'a pas de bouton');

  assert.equal(casseroleTallyLabel(1, null), '1 casserole posée cette partie');
  assert.equal(casseroleTallyLabel(4, 6), '4 casseroles posées cette partie, palier à 6');
  assert.equal(casseroleTallyLabel(6, 6), '6 casseroles posées cette partie : palier atteint');
  assert.deepEqual(aimHint({ kind: 'power', name: 'Ben voyons', valid: [1, 2], origin: { x: 0, y: 0 } }, [], true), { ask: 'Ben voyons : sur qui ? Touchez un politique.', tip: null });
});
