import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCounter } from '../src/client/services/counter.ts';
import type { Surroundings } from '../src/client/services/counter.ts';
import { keepEntryReferrer, takeEntryReferrer } from '../src/client/services/entryReferrer.ts';
import type { TabStorage } from '../src/client/services/tabStorage.ts';
import { deviceKind } from '../src/client/tools/deviceKind.ts';
import { humanResult } from '../src/client/tools/humanResult.ts';
import { parisDay } from '../src/client/tools/parisDay.ts';
import { referrerSource } from '../src/client/tools/referrerSource.ts';
import { visitFlags } from '../src/client/tools/visitFlags.ts';
import { VERSION } from '../src/protocol/version.ts';
import type { PlayerView } from '../src/engine/game.ts';
import type { CounterEvent } from '../src/protocol/counterEvent.ts';
import type { Classement } from '../src/protocol/messages.ts';

function memory(): TabStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

const RANKING: Classement = [
  { seat: 1, pseudo: 'Bot 1', heroId: 'lepen', place: 1 },
  { seat: 0, pseudo: 'Vous', heroId: 'macron', place: 2 },
];
const AT_HOME: Surroundings = { referrer: 'https://discord.com/channels/1/2', host: 'casserolade.fr', device: 'telephone' };

function counterFor(options: { active?: boolean; now?: () => Date } = {}) {
  const storage = memory();
  const sent: CounterEvent[] = [];
  const counter = createCounter({ storage, send: (event) => sent.push(event), active: options.active ?? true, now: options.now ?? (() => new Date('2026-11-06T10:00:00Z')), surroundings: () => AT_HOME });
  return { counter, storage, sent };
}

test('parisDay gives the day in Paris, the server\'s day', () => {
  assert.equal(parisDay(new Date('2026-11-06T10:00:00Z')), '2026-11-06');
  assert.equal(parisDay(new Date('2026-11-06T23:30:00Z')), '2026-11-07', 'past midnight in Paris');
});

test('visitFlags: new once ever, first once a day; a browser with older traces of the game is not new', () => {
  assert.deepEqual(visitFlags({ firstVisit: null, lastDay: null, cameBefore: false }, '2026-11-06'), { nouveau: true, premier: true });
  assert.deepEqual(visitFlags({ firstVisit: '2026-11-06', lastDay: '2026-11-06', cameBefore: false }, '2026-11-06'), { nouveau: false, premier: false });
  assert.deepEqual(visitFlags({ firstVisit: '2026-11-06', lastDay: '2026-11-06', cameBefore: false }, '2026-11-07'), { nouveau: false, premier: true });
  assert.deepEqual(visitFlags({ firstVisit: null, lastDay: null, cameBefore: true }, '2026-11-06'), { nouveau: false, premier: true });
});

test('referrerSource keeps the host name of the site a visit came from, nothing else', () => {
  assert.equal(referrerSource('https://discord.com/channels/123/456', 'casserolade.fr'), 'discord.com');
  assert.equal(referrerSource('https://www.google.fr/', 'casserolade.fr'), 'google.fr');
  assert.equal(referrerSource('android-app://com.google.android.gm/', 'casserolade.fr'), 'com.google.android.gm');
  assert.equal(referrerSource('https://casserolade.fr/bestiaire', 'casserolade.fr'), '', 'a page of the site itself');
  assert.equal(referrerSource('https://www.casserolade.fr/', 'casserolade.fr'), '');
  assert.equal(referrerSource('', 'casserolade.fr'), '', 'straight');
  assert.equal(referrerSource('http://localhost:5173/', 'casserolade.fr'), '', 'no proper host name');
});

test('deviceKind: a touch screen is a phone under 600 pixels, a tablet above; a mouse is a computer', () => {
  assert.equal(deviceKind({ coarsePointer: true, shortSide: 390 }), 'telephone');
  assert.equal(deviceKind({ coarsePointer: true, shortSide: 820 }), 'tablette');
  assert.equal(deviceKind({ coarsePointer: false, shortSide: 390 }), 'ordinateur');
});

test('humanResult reads the human\'s place, rounds and hero', () => {
  assert.deepEqual(humanResult(RANKING, { round: 14 } as PlayerView), { place: 2, manches: 14, heros: 'macron' });
  assert.deepEqual(humanResult(RANKING, null), { place: 2, manches: 1, heros: 'macron' });
  assert.equal(humanResult([RANKING[0]], null), null);
});

test('the counter: a visitor counted once a day, new once, with where they came from', () => {
  let now = new Date('2026-11-06T10:00:00Z');
  const { counter, sent } = counterFor({ now: () => now });
  counter.page('jeu');
  counter.page('bestiaire');
  now = new Date('2026-11-07T10:00:00Z');
  counter.page('jeu');
  assert.deepEqual(sent, [
    { type: 'page', page: 'jeu', appareil: 'telephone', nouveau: true, premier: true, source: 'discord.com' },
    { type: 'page', page: 'bestiaire', appareil: 'telephone', nouveau: false, premier: false, source: 'discord.com' },
    { type: 'page', page: 'jeu', appareil: 'telephone', nouveau: false, premier: true, source: 'discord.com' },
  ]);
});

test('the counter: games started and ended, won when first unless the mode says otherwise', () => {
  const { counter, sent } = counterFor();
  counter.gameStarted({ mode: 'solo', niveau: 'moyen' });
  counter.gameEnded({ mode: 'solo', niveau: 'moyen' }, RANKING, { round: 9 } as PlayerView);
  counter.gameEnded({ mode: 'tutoriel' }, RANKING, null, true);
  counter.gameEnded({ mode: 'tutoriel' }, [RANKING[0]], null, true);
  assert.deepEqual(sent, [
    { type: 'partie', mode: 'solo', niveau: 'moyen' },
    { type: 'fin', mode: 'solo', niveau: 'moyen', place: 2, manches: 9, heros: 'macron', gagnee: false, version: VERSION },
    { type: 'fin', mode: 'tutoriel', place: 2, manches: 1, heros: 'macron', gagnee: true, version: VERSION },
  ]);
});

test('the counter says nothing in development, under automation, or on a browser that asked not to be counted', () => {
  const inactive = counterFor({ active: false });
  inactive.counter.page('jeu');
  inactive.counter.gameStarted({ mode: 'tutoriel' });
  assert.deepEqual(inactive.sent, []);
  assert.equal(inactive.storage.data.size, 0, 'nothing kept either');
  const excluded = counterFor();
  excluded.storage.setItem('casserolade.compteur', 'non');
  excluded.counter.page('jeu');
  excluded.counter.gameStarted({ mode: 'tutoriel' });
  assert.deepEqual(excluded.sent, []);
});

test('a browser that played before the counter is not new', () => {
  const { counter, storage, sent } = counterFor();
  storage.setItem('casserolade.progres', '{}');
  counter.page('jeu');
  assert.equal(sent[0].type === 'page' && sent[0].nouveau, false);
});

test('the referrer of a phone survives its redirection, once', () => {
  const storage = memory();
  keepEntryReferrer('', storage);
  assert.equal(takeEntryReferrer(storage), null);
  keepEntryReferrer('https://discord.com/', storage);
  assert.equal(takeEntryReferrer(storage), 'https://discord.com/');
  assert.equal(takeEntryReferrer(storage), null);
});
