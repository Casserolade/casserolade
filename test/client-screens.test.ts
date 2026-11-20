import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardQuip } from '../src/client/tools/boardQuip.ts';
import { braceletTargetUid, casseroleOutcome } from '../src/client/tools/casseroleOutcome.ts';
import { hostQuote } from '../src/client/tools/hostQuote.ts';
import { rewardLabel } from '../src/client/tools/rewardLabel.ts';
import { createAchievements } from '../src/client/stores/achievements.ts';
import type { ProfileStorage } from '../src/client/services/localProfile.ts';
import { readProgress } from '../src/client/services/progressStorage.ts';
import { TUTORIAL_TARGETS } from '../src/client/const/tutorialTargets.ts';
import { CARD_BY_ID, CARDS } from '../src/data/cards.ts';
import { CASSEROLE_BY_ID } from '../src/data/casseroles.ts';
import { TUTORIEL } from '../src/data/histoire/tutoriel.ts';
import { SUCCES } from '../src/data/succes.ts';
import { PARAMS } from '../src/data/params.ts';
import { PHRASES } from '../src/data/phrases.ts';
import { makeMinion } from '../src/engine/minion.ts';
import { createGame, viewFor } from '../src/engine/game.ts';
import type { PlayerView } from '../src/engine/game.ts';
import type { Minion } from '../src/engine/types.ts';

function minion(cardId: string, uid: number, extra: Partial<Minion> = {}): Minion {
  return { ...makeMinion(CARD_BY_ID[cardId], uid), ...extra };
}

const IN_SCANDAL = { until: 5, budget: 0, hpLoss: 0, locked: false, silenced: null, polls: 0, grounded: false, splash: 0 };

test('casseroleOutcome : la deuxième casserole fait scandale, le double va au propriétaire', () => {
  const ecoutes = CASSEROLE_BY_ID.ecoutes;
  const threshold = PARAMS.scandalThreshold;
  assert.deepEqual(casseroleOutcome(minion('darmanin', 1), ecoutes, threshold), { owner: false, scandal: null });
  assert.deepEqual(casseroleOutcome(minion('darmanin', 1, { charges: threshold - 1 }), ecoutes, threshold), { owner: false, scandal: 'starts' });
  assert.equal(casseroleOutcome(minion(ecoutes.owner, 2), ecoutes, threshold).owner, true);
  // Fillon ou Sarkozy : une casserole de plus pour faire scandale.
  assert.equal(casseroleOutcome(minion('darmanin', 1, { charges: threshold - 1 }), ecoutes, threshold + 1).scandal, null);
  assert.equal(casseroleOutcome(minion('darmanin', 1, { charges: 2, scandal: IN_SCANDAL }), ecoutes, threshold).scandal, 'adds');
});

test('casseroleOutcome : une casserole qui compte double fait scandale seule, « Quel compte Facebook ? » fait oublier', () => {
  const heavy = Object.values(CASSEROLE_BY_ID).find((c) => (c.charges ?? 1) >= PARAMS.scandalThreshold);
  assert.ok(heavy, 'une casserole fait scandale à elle seule');
  assert.equal(casseroleOutcome(minion('darmanin', 1), heavy, PARAMS.scandalThreshold).scandal, 'starts');
  const facebook = CASSEROLE_BY_ID.quel_facebook;
  assert.equal(casseroleOutcome(minion('darmanin', 1, { charges: 1 }), facebook, PARAMS.scandalThreshold).scandal, 'forgets');
  assert.equal(casseroleOutcome(minion('darmanin', 1), facebook, PARAMS.scandalThreshold).scandal, null);
});

test('braceletTargetUid : le peuple oublie le scandale le plus long', () => {
  const board = [
    minion('darmanin', 1, { scandal: { ...IN_SCANDAL, until: 4 } }),
    minion('guedj', 2, { scandal: { ...IN_SCANDAL, until: 6 } }),
    minion('boyard', 3),
  ];
  assert.equal(braceletTargetUid(board), 2);
  assert.equal(braceletTargetUid([minion('boyard', 3)]), null);
});

function memoryStorage(): ProfileStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

/** An ordinary board of the end of a game: seven politicians of three camps, none of them a president. */
function ordinaryBoard(): PlayerView['board'] {
  const of = (camp: string, n: number) => CARDS.filter((card) => card.camp === camp && card.tier <= 3).slice(0, n);
  return [...of('insoumis', 3), ...of('socialistes', 2), ...of('macronie', 2)].map((card, index) => makeMinion(card, index + 1));
}

/** The last view of an ordinary game won: a full board, the top tier, gestures at the desk, polls lost on the way. */
function wonView(): PlayerView {
  const view = viewFor(createGame({ seed: 7 }), 0);
  return { ...view, heroId: 'hollande', round: 15, hp: 12, tier: 6, board: ordinaryBoard(), stats: { ...view.stats, casseroles: 4, spells: 20, rolls: 12, sold: 5, spent: 120 } };
}

test('succès : une victoire en difficile débloque, se garde, et donne un titre', () => {
  const storage = memoryStorage();
  const board = createAchievements(storage);
  board.startGame();
  const view = wonView();
  board.observe({ ...view, round: 1, hp: 30 });
  board.observe(view);
  const unlocked = board.recordGame(view, { place: 1, seats: 8, niveau: 'difficile' });
  assert.deepEqual(unlocked.map((s) => s.id), ['premier_mandat']);
  assert.deepEqual(board.fresh.value.map((s) => s.id), ['premier_mandat'], 'l\'écran de fin les montre');
  assert.ok(board.earnedTitles.value.includes('L\'Élu'));
  assert.equal(readProgress(storage).victoiresParNiveau.difficile, 1, 'gardé dans le navigateur');
  assert.deepEqual(readProgress(storage).herosVainqueurs, ['hollande']);
  board.startGame();
  assert.deepEqual(board.fresh.value, [], 'la partie suivante repart de zéro');
  // Un tableau rouvert retrouve tout.
  assert.deepEqual(createAchievements(storage).progress.value.obtenus, ['premier_mandat']);
});

test('succès : ce que la partie a montré en route compte, et la partie suivante repart de rien', () => {
  const board = createAchievements(memoryStorage());
  const view = wonView();
  board.startGame();
  board.observe({ ...view, round: 1, hp: 30 });
  board.observe({ ...view, hp: 30, board: [...view.board.slice(1), { ...makeMinion(CARD_BY_ID.valls, 99), atk: 2300, hp: 2050 }] });
  // Le monstre est renvoyé avant la fin : le succès l'a vu passer.
  assert.deepEqual(board.recordGame({ ...view, hp: 30 }, { place: 1, seats: 8, niveau: 'facile' }).map((s) => s.id), ['sans_opposition', 'bete_politique']);
  board.startGame();
  board.observe({ ...view, round: 1, hp: 30 });
  board.observe({ ...view, hp: 29 });
  assert.deepEqual(board.recordGame({ ...view, hp: 29 }, { place: 1, seats: 8, niveau: 'moyen' }), [], 'un sondage perdu en route : pas d\'état de grâce');
  assert.deepEqual(board.recordGame(null, { place: 1, seats: 8 }), [], 'sans vue, rien à compter');
});

test('succès : une partie en ligne compte, avec les humains de sa table', () => {
  const board = createAchievements(memoryStorage());
  board.startGame();
  board.observe({ ...wonView(), round: 1, hp: 30 });
  board.observe(wonView());
  const unlocked = board.recordGame(wonView(), { place: 1, seats: 8, humans: 8, publicHost: true });
  assert.deepEqual(unlocked.map((s) => s.id), ['suffrage_universel', 'grand_debat', 'reunion_publique']);
  assert.equal(board.progress.value.victoiresEnLigne, 1);
});

test('succès : le titre choisi s\'affiche seulement s\'il est gagné, et un stockage abîmé repart à zéro', () => {
  const storage = memoryStorage();
  const board = createAchievements(storage);
  board.chooseTitle('Président de la République');
  assert.equal(board.title.value, null, 'pas encore gagné');
  board.record({ chapitre: 'second_tour' });
  assert.deepEqual(board.earnedTitles.value, ['Président de la République']);
  assert.equal(board.title.value, 'Président de la République');
  assert.equal(createAchievements(storage).title.value, 'Président de la République');
  storage.data.set('casserolade.progres', '{pas du json');
  assert.equal(readProgress(storage).obtenus.length, 0);
  const broken: ProfileStorage = { getItem: () => { throw new Error('bloqué'); }, setItem: () => { throw new Error('bloqué'); } };
  assert.doesNotThrow(() => createAchievements(broken).record({ tutoriel: true }));
});

test('rewardLabel : chaque récompense se dit en quelques mots', () => {
  for (const item of SUCCES) if (item.recompense) assert.ok(rewardLabel(item.recompense).length > 5, item.id);
});

test('le tutoriel montre du doigt chaque consigne et chaque rappel, sauf la dernière', () => {
  const cles = [...Object.keys(TUTORIEL.etapes), ...Object.keys(TUTORIEL.rappels)] as (keyof typeof TUTORIAL_TARGETS)[];
  for (const cle of cles) {
    if (cle === 'victoire') continue;
    assert.ok(TUTORIAL_TARGETS[cle]?.length, `rien à montrer pour ${cle}`);
  }
  for (const cle of ['premier_achat', 'budget']) {
    assert.ok(TUTORIAL_TARGETS[cle as 'budget']?.some((ring) => ring.includes('[data-control="budget"]')), `${cle} montre le budget`);
  }
});

test('boardQuip : le politique posé fait son entrée, celui qui prend une casserole se défend, en vrai', () => {
  // Une bulle ne prend qu'une phrase courte, parmi les trois du tour : on choisit quelqu'un dont toutes le sont.
  const short = (lines?: string[]) => Boolean(lines?.length) && lines!.every((l) => l.length <= 90);
  const speaker = Object.keys(PHRASES).find((id) => CARD_BY_ID[id] && short(PHRASES[id].pose) && short(PHRASES[id].casserole));
  assert.ok(speaker, 'un politique a une phrase de pose et une de casserole');
  const before = [minion('boyard', 1)];
  const placed = [...before, minion(speaker, 7)];
  const said = boardQuip(before, placed);
  assert.equal(said?.uid, 7);
  assert.ok(PHRASES[speaker].pose?.includes(said?.line ?? ''), 'mot pour mot');
  const caught = [minion('boyard', 1), minion(speaker, 7, { casseroles: ['homards'] })];
  assert.ok(PHRASES[speaker].casserole?.includes(boardQuip(placed, caught)?.line ?? ''));
  assert.equal(boardQuip(placed, placed), null, 'rien ne change, rien ne se dit');
  const silent = Object.keys(CARD_BY_ID).find((id) => !PHRASES[id]?.pose);
  if (silent) assert.equal(boardQuip(before, [...before, minion(silent, 9)]), null, 'sans phrase, il ne dit rien');
});

test('hostQuote : une vraie phrase courte de l\'animateur, ou rien', () => {
  for (const id of Object.keys(PHRASES)) {
    const line = hostQuote(id, 'attente');
    if (line) assert.ok(line.length <= 90 && PHRASES[id].attente?.includes(line));
  }
  assert.equal(hostQuote('personne', 'attente'), null);
});
