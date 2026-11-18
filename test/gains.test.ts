import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, combatViewFor, createGame, resolveRound, startCombats, viewFor } from '../src/engine/game.ts';
import type { Game } from '../src/engine/game.ts';
import { baseStats, recordedStats } from '../src/engine/gains.ts';
import { invariantViolations } from '../src/engine/invariants.ts';
import { makeMinion } from '../src/engine/minion.ts';
import { addMinionToHand, addSpellToHand, take } from '../src/engine/recruit.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import type { Camp, Minion, MinionGain } from '../src/engine/types.ts';

/**
 * Le registre des gains (18 novembre 2026) : chaque politique sait d'où vient ce qu'il a en plus de sa carte, une
 * ligne par source. La base de sa carte et la somme de ses lignes font ses stats : l'invariant du moteur le vérifie.
 */

const CAMPS: Camp[] = ['macronie', 'republicains', 'socialistes', 'insoumis', 'reconquete'];

function table(seed = 7): Game {
  const game = createGame({ seed, seats: 2, heroes: ['philippe', 'philippe'], activeCamps: CAMPS, combatLog: true });
  game.players[0].budget = 500;
  return game;
}

function recruit(game: Game, cardId: string): Minion {
  assert.ok(take(game, cardId), `${cardId} en réserve`);
  return addMinionToHand(game, game.players[0], cardId) as Minion;
}

function lay(game: Game, cardId: string, extra: { target?: number; onto?: number } = {}): Minion {
  const m = recruit(game, cardId);
  const played = applyAction(game, 0, { t: 'play', uid: m.uid, ...extra });
  assert.equal(played.ok, true, `${cardId} posé : ${played.ok ? '' : played.error}`);
  return game.players[0].board.find((x) => x.uid === m.uid) ?? m;
}

function tract(game: Game, target: Minion): void {
  const p = game.players[0];
  addSpellToHand(game, p, 'tract');
  const held = p.spells.find((s) => s.spellId === 'tract') as { uid: number };
  assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: target.uid }).ok, true, 'Tract lancé');
}

function line(m: Minion, source: string): MinionGain | undefined {
  return m.gains.find((gain) => gain.source === source);
}

/** Ses stats, telles que sa carte et son registre les expliquent. */
function explained(m: Minion): { atk: number; hp: number } {
  const base = baseStats(m) as { atk: number; hp: number };
  const known = recordedStats(m.gains);
  return { atk: base.atk + known.atk, hp: base.hp + known.hp };
}

test('une carte qui n\'a rien reçu n\'a pas de registre', () => {
  const game = table();
  const gueant = lay(game, 'gueant');
  assert.deepEqual(gueant.gains, []);
  assert.deepEqual(explained(gueant), { atk: gueant.atk, hp: gueant.hp });
});

test('les Tracts s\'additionnent sur une seule ligne, qui compte les fois', () => {
  const game = table();
  const gueant = lay(game, 'gueant');
  tract(game, gueant);
  tract(game, gueant);
  assert.deepEqual(gueant.gains, [{ source: 'sort:tract', atk: 2, hp: 2, times: 2, keywords: [] }]);
  assert.deepEqual([gueant.atk, gueant.hp], [5, 4]);
  assert.deepEqual(invariantViolations(game), []);
});

test('l\'Annonce d\'une carte laisse sa ligne sur chaque allié, stats et mot-clé', () => {
  const game = table();
  const gueant = lay(game, 'gueant');
  lay(game, 'de_gaulle');
  assert.deepEqual(line(gueant, 'carte:de_gaulle'), { source: 'carte:de_gaulle', atk: 4, hp: 4, times: 1, keywords: ['ni_droite_ni_gauche'] });
  assert.deepEqual(invariantViolations(game), []);
});

test('un Ralliement se lit sur une ligne de son hôte : ses stats, celles qu\'il avait reçues, et ses mots-clés', () => {
  const game = table();
  const host = lay(game, 'gueant');
  const tache = recruit(game, 'tache');
  tache.keywords.push('polemique');
  assert.equal(applyAction(game, 0, { t: 'play', uid: tache.uid, onto: host.uid }).ok, true);
  const rallied = line(host, 'ralliement:tache');
  assert.deepEqual(rallied, { source: 'ralliement:tache', atk: 1, hp: 2, times: 1, keywords: ['polemique'] });
  assert.deepEqual([host.atk, host.hp], [4, 4]);
  assert.deepEqual(invariantViolations(game), []);
});

test('un triple garde ce que ses trois exemplaires avaient reçu, source par source', () => {
  const game = table();
  const first = lay(game, 'gueant');
  const second = lay(game, 'gueant');
  tract(game, first);
  tract(game, second);
  tract(game, second);
  recruit(game, 'gueant');
  const golden = game.players[0].hand.find((m) => m.cardId === 'gueant' && m.golden) as Minion;
  assert.ok(golden, 'le doré est en main');
  assert.deepEqual(golden.gains, [{ source: 'sort:tract', atk: 3, hp: 3, times: 3, keywords: [] }]);
  // La base d'un doré est sa carte doublée : 6/4, plus les trois Tracts.
  assert.deepEqual([golden.atk, golden.hp], [9, 7]);
  assert.deepEqual(explained(golden), { atk: 9, hp: 7 });
  assert.deepEqual(invariantViolations(game), []);
});

test('une casserole laisse sa ligne, bonus de propriétaire compris', () => {
  const game = table();
  const p = game.players[0];
  const gueant = lay(game, 'gueant');
  p.casseroleOffer = 'ecoutes';
  assert.equal(applyAction(game, 0, { t: 'buy_casserole' }).ok, true);
  const held = p.spells.find((s) => s.casseroleId === 'ecoutes') as { uid: number };
  assert.equal(applyAction(game, 0, { t: 'cast', uid: held.uid, target: gueant.uid }).ok, true);
  assert.deepEqual(line(gueant, 'casserole:ecoutes'), { source: 'casserole:ecoutes', atk: 6, hp: 6, times: 1, keywords: [] });
  assert.deepEqual(invariantViolations(game), []);
});

test('un gain « pour de bon » revient du combat avec son auteur', () => {
  const game = table();
  const [a, b] = game.players;
  // Guéant : quand il attaque, +1/+0 pour de bon, une fois par combat.
  const gueant = lay(game, 'gueant');
  gueant.hp = 60;
  gueant.gains = [{ source: 'sort:tract', atk: 0, hp: 58, times: 58, keywords: [] }];
  assert.ok(take(game, 'gueant'));
  b.board = [makeMinion(CARD_BY_ID.gueant, game.nextUid++)];
  resolveRound(game);
  const kept = a.board.find((m) => m.uid === gueant.uid) as Minion;
  assert.deepEqual(line(kept, 'carte:gueant'), { source: 'carte:gueant', atk: 1, hp: 0, times: 1, keywords: [] });
  assert.equal(kept.atk, 4);
  assert.deepEqual(invariantViolations(game), []);
});

test('le registre sort du moteur en copie : la vue et le journal de combat ne tiennent rien de la partie', () => {
  const game = table();
  const b = game.players[1];
  const gueant = lay(game, 'gueant');
  tract(game, gueant);
  const seen = viewFor(game, 0).board[0];
  assert.deepEqual(seen.gains, gueant.gains);
  seen.gains[0].atk = 99;
  seen.gains.push({ source: 'autre', atk: 1, hp: 1, times: 1, keywords: [] });
  assert.deepEqual(gueant.gains, [{ source: 'sort:tract', atk: 1, hp: 1, times: 1, keywords: [] }]);
  // En combat, l'adversaire lit aussi d'où viennent ses bonus, comme ses stats.
  assert.ok(take(game, 'gueant'));
  b.board = [makeMinion(CARD_BY_ID.gueant, game.nextUid++)];
  startCombats(game);
  const opening = combatViewFor(game, 1)?.log[0];
  assert.ok(opening?.e === 'debut');
  const unit = opening.sides.flat().find((u) => u.uid === gueant.uid);
  assert.deepEqual(unit?.gains, [{ source: 'sort:tract', atk: 1, hp: 1, times: 1, keywords: [] }]);
});
