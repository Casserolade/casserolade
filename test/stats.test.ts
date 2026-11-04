import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LiveMetrics } from '../src/server/liveMetrics.ts';
import { SiteStats } from '../src/server/siteStats.ts';
import { statsPage } from '../src/server/statsPage.ts';

const LIVE = { connexions: 3, adresses: 2, salons: 1, enJeu: 1, enFile: 0 };

test('les statistiques du jour : visites, visiteurs uniques sans adresse gardée, parties, pic, incidents', () => {
  let now = new Date('2026-11-03T10:00:00Z');
  const stats = new SiteStats({ file: null, salt: 'sel', now: () => now });
  stats.visit('1.2.3.4');
  stats.visit('1.2.3.4');
  stats.visit('5.6.7.8');
  stats.partie(true, 3);
  stats.partie(false, 1);
  stats.salonCree();
  stats.connexions(7);
  stats.connexions(4);
  stats.incident('crash', 'ABCD', 5, 'boum');
  let day = stats.snapshot(LIVE, 'v1').days.at(-1);
  assert.deepEqual(day, { jour: '2026-11-03', visites: 3, visiteurs: 2, parties: 2, partiesPubliques: 1, joueurs: 4, salonsCrees: 1, picConnexions: 7, incidents: 1 });
  assert.ok(!JSON.stringify(stats.snapshot(LIVE, 'v1')).includes('1.2.3.4'), 'aucune adresse dans les statistiques');
  // Minuit à Paris : un nouveau jour, les visiteurs se recomptent.
  now = new Date('2026-11-03T23:30:00Z');
  stats.visit('1.2.3.4');
  day = stats.snapshot(LIVE, 'v1').days.at(-1);
  assert.equal(day?.jour, '2026-11-04');
  assert.equal(day?.visiteurs, 1);
});

test('les statistiques survivent au redémarrage', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'stats-')), 'stats.json');
  const now = () => new Date('2026-11-03T10:00:00Z');
  const before = new SiteStats({ file, salt: 'a', now });
  before.visit('1.1.1.1');
  before.incident('anomalie', 'WXYZ', 2, 'budget -1');
  before.flush();
  const after = new SiteStats({ file, salt: 'b', now });
  const snapshot = after.snapshot(LIVE, null);
  assert.equal(snapshot.days.at(-1)?.visites, 1);
  assert.equal(snapshot.incidents[0].code, 'WXYZ');
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
