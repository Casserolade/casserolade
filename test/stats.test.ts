import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CountedEvent as CounterEvent } from '../src/protocol/counterEvent.ts';
import { LiveMetrics } from '../src/server/liveMetrics.ts';
import { SiteStats } from '../src/server/siteStats.ts';
import { statsPage } from '../src/server/statsPage.ts';

const LIVE = { connexions: 3, adresses: 2, salons: 1, enJeu: 1, enFile: 0, locales: 2, presents: 5, lanceesEnLigne: 0, lanceesLocales: 0 };

function visit(premier: boolean, nouveau: boolean, extra: Partial<Extract<CounterEvent, { type: 'page' }>> = {}): CounterEvent {
  return { type: 'page', page: 'jeu', appareil: 'ordinateur', nouveau, premier, source: '', ...extra };
}

test('les statistiques du jour : visiteurs comptés par la page, nouveaux, appareils, sources, pages, parties locales et en ligne', () => {
  let now = new Date('2026-11-03T10:00:00Z');
  const stats = new SiteStats({ file: null, now: () => now });
  stats.record(visit(true, true, { source: 'discord.com' }));
  stats.record(visit(false, false));
  stats.record(visit(true, false, { page: 'jeu_telephone', appareil: 'telephone' }));
  stats.record(visit(true, true, { page: 'bestiaire', appareil: 'tablette', source: 'discord.com' }));
  stats.record({ type: 'partie', mode: 'solo', niveau: 'moyen' });
  stats.record({ type: 'fin', mode: 'solo', niveau: 'moyen', place: 1, manches: 11, heros: 'macron', gagnee: true, version: '0.2c' });
  stats.record({ type: 'partie', mode: 'tutoriel' });
  stats.robot();
  stats.partie(true, 3);
  stats.partie(false, 1);
  stats.salonCree();
  stats.connexions(7);
  stats.connexions(4);
  stats.incident('crash', 'ABCD', 5, 'boum');
  let day = stats.snapshot(LIVE, 'v1').days.at(-1);
  assert.equal(day?.jour, '2026-11-03');
  assert.equal(day?.visiteurs, 3, 'la deuxième page du même visiteur ne le recompte pas');
  assert.equal(day?.nouveaux, 2);
  assert.deepEqual(day?.appareils, { telephone: 1, tablette: 1, ordinateur: 1 });
  assert.deepEqual(day?.sources, { 'discord.com': 2, direct: 1 });
  assert.deepEqual(day?.pages, { jeu: 2, jeu_telephone: 1, bestiaire: 1, a_propos: 0 });
  assert.deepEqual(day?.local, { solo: { lancees: 1, finies: 1, gagnees: 1 }, carriere: { lancees: 0, finies: 0, gagnees: 0 }, tutoriel: { lancees: 1, finies: 0, gagnees: 0 } });
  assert.equal(day?.robots, 1);
  assert.equal(day?.parties, 2);
  assert.equal(day?.partiesPubliques, 1);
  assert.equal(day?.joueurs, 4);
  assert.equal(day?.salonsCrees, 1);
  assert.equal(day?.picConnexions, 7);
  assert.equal(day?.incidents, 1);
  // Midnight in Paris: a new day.
  now = new Date('2026-11-03T23:30:00Z');
  stats.record(visit(true, false));
  day = stats.snapshot(LIVE, 'v1').days.at(-1);
  assert.equal(day?.jour, '2026-11-04');
  assert.equal(day?.visiteurs, 1);
  assert.equal(stats.snapshot(LIVE, 'v1').totaux.visiteurs, 4);
});

test('les parties en solo cumulent les héros par version, les niveaux et les chapitres de la carrière', () => {
  const stats = new SiteStats({ file: null, now: () => new Date('2026-11-06T10:00:00Z') });
  const end = (place: number, heros: string, version = '0.2c'): CounterEvent => ({ type: 'fin', mode: 'solo', niveau: 'facile', place, manches: 10, heros, gagnee: place === 1, version });
  stats.record({ type: 'partie', mode: 'solo', niveau: 'facile' });
  stats.record(end(1, 'macron'));
  stats.record(end(5, 'macron'));
  stats.record(end(3, 'lepen'));
  stats.record(end(2, 'macron', '0.3a'));
  stats.record({ type: 'partie', mode: 'carriere', chapitre: 'municipales' });
  stats.record({ type: 'fin', mode: 'carriere', chapitre: 'municipales', place: 2, manches: 9, heros: 'macron', gagnee: true, version: '0.2c' });
  const { cumul } = stats.snapshot(LIVE, null);
  assert.deepEqual(cumul.heros['0.2c'].macron, { parties: 2, places: 6, victoires: 1, top4: 1 });
  assert.deepEqual(cumul.heros['0.2c'].lepen, { parties: 1, places: 3, victoires: 0, top4: 1 });
  assert.deepEqual(cumul.heros['0.3a'].macron, { parties: 1, places: 2, victoires: 0, top4: 1 });
  assert.deepEqual(cumul.niveaux.facile, { lancees: 1, finies: 4, gagnees: 1, places: 11 });
  assert.deepEqual(cumul.chapitres.municipales, { lancees: 1, finies: 1, gagnees: 1 });
  assert.equal(cumul.heros['0.2c'].macron.parties, 2, 'la carrière ne compte pas dans les héros');
});

test('les sources d\'un jour sont plafonnées : des noms inventés à la chaîne ne remplissent pas le fichier', () => {
  const stats = new SiteStats({ file: null, now: () => new Date('2026-11-06T10:00:00Z') });
  for (let i = 0; i < 60; i++) stats.record(visit(true, true, { source: `site${i}.example` }));
  stats.record(visit(true, false, { source: 'site0.example' }));
  const sources = stats.snapshot(LIVE, null).days.at(-1)?.sources ?? {};
  assert.equal(Object.keys(sources).length, 41);
  assert.equal(sources.autres, 20);
  assert.equal(sources['site0.example'], 2, 'une source déjà connue reste à son nom');
});

test('les statistiques survivent au redémarrage', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'stats-')), 'stats.json');
  const now = () => new Date('2026-11-03T10:00:00Z');
  const before = new SiteStats({ file, now });
  before.record(visit(true, true));
  before.record({ type: 'fin', mode: 'solo', niveau: 'moyen', place: 4, manches: 12, heros: 'macron', gagnee: false, version: '0.2c' });
  before.incident('anomalie', 'WXYZ', 2, 'budget -1');
  before.flush();
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).format, 2);
  const after = new SiteStats({ file, now });
  const snapshot = after.snapshot(LIVE, null);
  assert.equal(snapshot.days.at(-1)?.visiteurs, 1);
  assert.equal(snapshot.cumul.heros['0.2c'].macron.places, 4);
  assert.equal(snapshot.incidents[0].code, 'WXYZ');
});

test('l\'ancien fichier, qui comptait le test de santé, garde ses visites à part et ses parties en ligne', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'stats-')), 'stats.json');
  const old = { jour: '2026-11-05', visites: 3003, visiteurs: 83, parties: 1, partiesPubliques: 0, joueurs: 2, salonsCrees: 2, picConnexions: 3, incidents: 0 };
  writeFileSync(file, JSON.stringify({ days: [old], incidents: [] }));
  const stats = new SiteStats({ file, now: () => new Date('2026-11-05T12:00:00Z') });
  stats.record(visit(true, true));
  const day = stats.snapshot(LIVE, null).days.at(-1);
  assert.equal(day?.visiteurs, 1, 'les visiteurs repartent de zéro, mesurés par la page');
  assert.deepEqual(day?.ancienneMesure, { visites: 3003, visiteurs: 83 });
  assert.equal(day?.joueurs, 2);
  assert.equal(day?.salonsCrees, 2);
  writeFileSync(file, '{ abîmé');
  assert.deepEqual(new SiteStats({ file, now: () => new Date() }).snapshot(LIVE, null).days.length, 1, 'un fichier abîmé repart à vide');
});

test('les mesures en temps réel : une par seconde, compteurs remis à zéro, cinq minutes gardées, abonnés servis', () => {
  const live = new LiveMetrics();
  const received: string[] = [];
  const unsubscribe = live.subscribe((kind) => received.push(kind));
  live.received();
  live.received();
  live.sent(2048);
  const first = live.sample(LIVE, 2, 1000);
  assert.equal(first.messagesIn, 2);
  assert.equal(first.messagesOut, 1);
  assert.equal(first.kioOut, 2);
  assert.equal(first.joueurs, 2);
  assert.ok(first.memoireMo > 0);
  assert.equal(live.sample(LIVE, 2, 2000).messagesIn, 0, 'les compteurs repartent de zéro chaque seconde');
  live.event('partie', 'Partie publique lancée, 3 humains', 2500);
  for (let i = 0; i < 400; i++) live.sample(LIVE, 0, 3000 + i * 1000);
  assert.equal(live.history().samples.length, 300);
  assert.deepEqual(received.slice(0, 3), ['sample', 'sample', 'event']);
  unsubscribe();
  assert.equal(live.subscribers, 0);
  live.stop();
});

test('la page des statistiques échappe son chemin et charge son script', () => {
  const page = statsPage('/stats/<x>');
  assert.ok(!page.includes('<x>'));
  assert.match(page, /<script src="\/stats\/&lt;x&gt;\/tableau\.js"><\/script>/);
});
