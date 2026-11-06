import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCounterEvent } from '../src/protocol/parseCounterEvent.ts';
import { counterEventLabel } from '../src/server/counterEventLabel.ts';
import { isRobot } from '../src/server/isRobot.ts';
import { readStatsData } from '../src/server/readStatsData.ts';
import { emptyDay } from '../src/server/statsData.ts';
import { sumDays } from '../src/server/sumDays.ts';

const PAGE = { type: 'page', page: 'jeu', appareil: 'telephone', nouveau: true, premier: true, source: 'discord.com' };
const END = { type: 'fin', mode: 'solo', niveau: 'moyen', place: 3, manches: 12, heros: 'macron', gagnee: false, version: '0.2c' };

test('the counter reads the events of the pages, field by field', () => {
  assert.deepEqual(parseCounterEvent(JSON.stringify(PAGE)), PAGE);
  assert.deepEqual(parseCounterEvent(JSON.stringify({ ...PAGE, source: '' })), { ...PAGE, source: '' });
  assert.deepEqual(parseCounterEvent('{"type":"partie","mode":"solo","niveau":"difficile"}'), { type: 'partie', mode: 'solo', niveau: 'difficile' });
  assert.deepEqual(parseCounterEvent('{"type":"partie","mode":"carriere","chapitre":"municipales"}'), { type: 'partie', mode: 'carriere', chapitre: 'municipales' });
  assert.deepEqual(parseCounterEvent('{"type":"partie","mode":"tutoriel"}'), { type: 'partie', mode: 'tutoriel' });
  assert.deepEqual(parseCounterEvent(JSON.stringify(END)), END);
  assert.deepEqual(parseCounterEvent(JSON.stringify({ ...END, extra: 'ignorée' })), END, 'an unknown field is dropped, not kept');
});

test('the counter refuses anything unknown, missing or out of bounds', () => {
  const refused = [
    '', 'pas du json', 'null', '[]', '{}', '{"type":"autre"}',
    JSON.stringify({ ...PAGE, page: 'visages' }),
    JSON.stringify({ ...PAGE, appareil: 'montre' }),
    JSON.stringify({ ...PAGE, nouveau: 'oui' }),
    JSON.stringify({ ...PAGE, premier: undefined }),
    JSON.stringify({ ...PAGE, source: 'localhost' }),
    JSON.stringify({ ...PAGE, source: 'Évil.com' }),
    JSON.stringify({ ...PAGE, source: `${'a'.repeat(80)}.com` }),
    JSON.stringify({ ...PAGE, source: '__proto__' }),
    '{"type":"partie","mode":"solo"}',
    '{"type":"partie","mode":"solo","niveau":"impossible"}',
    '{"type":"partie","mode":"carriere","chapitre":"inventee"}',
    '{"type":"partie","mode":"classee"}',
    JSON.stringify({ ...END, place: 0 }),
    JSON.stringify({ ...END, place: 9 }),
    JSON.stringify({ ...END, place: 2.5 }),
    JSON.stringify({ ...END, manches: 0 }),
    JSON.stringify({ ...END, heros: 'giscard' }),
    JSON.stringify({ ...END, heros: 'constructor' }),
    JSON.stringify({ ...END, gagnee: 1 }),
    JSON.stringify({ ...END, version: 'latest' }),
    JSON.stringify({ ...END, mode: 'carriere' }),
    JSON.stringify({ ...PAGE, source: 'a.b', bourrage: 'x'.repeat(600) }),
  ];
  for (const text of refused) assert.equal(parseCounterEvent(text), null, text.slice(0, 120));
});

test('robots are told apart from browsers, phones named like robots included', () => {
  const robots = [
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/142.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
    'Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    'TelegramBot (like TwitterBot)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'curl/8.5.0',
    '',
    undefined,
  ];
  for (const agent of robots) assert.equal(isRobot(agent), true, String(agent));
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 12; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36 Telegram-Android/11.2.3',
  ];
  for (const agent of browsers) assert.equal(isRobot(agent), false, agent);
});

test('the dashboard feed says what each event of the counter is', () => {
  assert.equal(counterEventLabel(PAGE as never), 'Nouveau visiteur sur le jeu (téléphone, depuis discord.com)');
  assert.equal(counterEventLabel({ ...PAGE, premier: false } as never), null, 'the other pages of a visit say nothing');
  assert.equal(counterEventLabel({ type: 'partie', mode: 'carriere', chapitre: 'municipales' }), 'Carrière lancée : Les municipales');
  assert.equal(counterEventLabel({ type: 'partie', mode: 'tutoriel' }), 'Tutoriel lancé');
  assert.match(counterEventLabel(END as never) ?? '', /^Partie solo finie \(bots moyen\) : 3e avec .+ en 12 manches$/);
  assert.match(counterEventLabel({ ...END, place: 1, gagnee: true } as never) ?? '', /^Partie solo gagnée \(bots moyen\) : 1re avec /);
});

test('the totals of a run of days, and the statistics file read in both formats', () => {
  const first = emptyDay('2026-11-06');
  first.visiteurs = 3;
  first.nouveaux = 2;
  first.pages.jeu = 4;
  first.local.solo.lancees = 2;
  const second = emptyDay('2026-11-07');
  second.visiteurs = 5;
  second.pages.bestiaire = 1;
  second.local.solo.finies = 1;
  second.parties = 1;
  second.joueurs = 3;
  const totals = sumDays([first, second]);
  assert.equal(totals.jours, 2);
  assert.equal(totals.visiteurs, 8);
  assert.equal(totals.nouveaux, 2);
  assert.equal(totals.pages, 5);
  assert.deepEqual(totals.local.solo, { lancees: 2, finies: 1, gagnees: 0 });
  assert.equal(totals.joueurs, 3);
  assert.deepEqual(readStatsData('{ abîmé').days, []);
  const current = readStatsData(JSON.stringify({ format: 2, days: [{ jour: '2026-11-06', visiteurs: 7 }], cumul: { niveaux: { moyen: { lancees: 1, finies: 0, gagnees: 0, places: 0 } } } }));
  assert.equal(current.days[0].visiteurs, 7);
  assert.equal(current.days[0].pages.a_propos, 0, 'a field missing from the file is completed');
  assert.deepEqual(current.cumul.heros, {});
  assert.equal(current.cumul.niveaux.moyen.lancees, 1);
});
