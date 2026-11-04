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
import { CARD_BY_ID } from '../src/data/cards.ts';
import { CASSEROLE_BY_ID } from '../src/data/casseroles.ts';
import { TUTORIEL } from '../src/data/histoire/tutoriel.ts';
import { SUCCES } from '../src/data/succes.ts';
import { PARAMS } from '../src/data/params.ts';
import { PHRASES } from '../src/data/phrases.ts';
import { makeMinion } from '../src/engine/minion.ts';
import type { PlayerView } from '../src/engine/game.ts';
import type { Minion } from '../src/engine/types.ts';

function minion(cardId: string, uid: number, extra: Partial<Minion> = {}): Minion {
  return { ...makeMinion(CARD_BY_ID[cardId], uid), ...extra };
}

const IN_SCANDAL = { until: 5, budget: 0, hpLoss: 0, locked: false, silenced: null };

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

const STATS: PlayerView['stats'] = { casseroles: 0, scandals: 0, forgotten: 0, triples: 0, spells: 0 };

test('succès : une victoire solo débloque, se garde, et donne un héros de plus au choix', () => {
  const storage = memoryStorage();
  const board = createAchievements(storage);
  assert.equal(board.heroChoices.value, PARAMS.heroChoices);
  board.startGame();
  const unlocked = board.recordGame([{ seat: 0, pseudo: 'Vous', heroId: 'hollande', place: 1 }], { stats: STATS } as PlayerView);
  assert.ok(unlocked.some((s) => s.id === 'premier_mandat'));
  assert.deepEqual(board.fresh.value.map((s) => s.id), unlocked.map((s) => s.id), 'l\'écran de fin les montre');
  assert.equal(board.heroChoices.value, PARAMS.heroChoices + 1);
  assert.equal(readProgress(storage).victoires, 1, 'gardé dans le navigateur');
  board.startGame();
  assert.deepEqual(board.fresh.value, [], 'la partie suivante repart de zéro');
  // Un tableau rouvert retrouve tout.
  assert.equal(createAchievements(storage).progress.value.obtenus.length, unlocked.length);
});

test('succès : le titre choisi s\'affiche seulement s\'il est gagné, et un stockage abîmé repart à zéro', () => {
  const storage = memoryStorage();
  const board = createAchievements(storage);
  board.chooseTitle('Le Stagiaire');
  assert.equal(board.title.value, null, 'pas encore gagné');
  board.record({ tutoriel: true });
  assert.deepEqual(board.earnedTitles.value, ['Le Stagiaire']);
  assert.equal(board.title.value, 'Le Stagiaire');
  assert.equal(createAchievements(storage).title.value, 'Le Stagiaire');
  storage.data.set('casserolade.progres', '{pas du json');
  assert.equal(readProgress(storage).obtenus.length, 0);
  const broken: ProfileStorage = { getItem: () => { throw new Error('bloqué'); }, setItem: () => { throw new Error('bloqué'); } };
  assert.doesNotThrow(() => createAchievements(broken).record({ place: 1, stats: STATS }));
});

test('rewardLabel : chaque récompense se dit en quelques mots', () => {
  for (const item of SUCCES) if (item.recompense) assert.ok(rewardLabel(item.recompense).length > 5, item.id);
});

test('le tutoriel montre du doigt chaque consigne, sauf la dernière', () => {
  for (const step of TUTORIEL.etapes) {
    if (step.fini === 'victoire') continue;
    assert.ok(TUTORIAL_TARGETS[step.fini]?.length, `rien à montrer pour ${step.fini}`);
  }
});

test('boardQuip : le politique posé fait son entrée, celui qui prend une casserole se défend, en vrai', () => {
  const speaker = Object.keys(PHRASES).find((id) => CARD_BY_ID[id] && PHRASES[id].pose?.some((l) => l.length <= 90) && PHRASES[id].casserole?.some((l) => l.length <= 90));
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
