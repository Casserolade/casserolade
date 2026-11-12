import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCounter } from '../src/client/services/counter.ts';
import { markLocalGame, runningLocalGame, takeInterruptedGame } from '../src/client/services/interruptedGame.ts';
import type { TabStorage } from '../src/client/services/tabStorage.ts';
import { discordMembersLabel } from '../src/client/tools/discordMembersLabel.ts';
import { liveTallyItems } from '../src/client/tools/liveTallyItems.ts';
import { presenceIsDue } from '../src/client/tools/presenceIsDue.ts';
import { readLiveCount } from '../src/client/tools/readLiveCount.ts';
import { isLiveSignal } from '../src/protocol/counterEvent.ts';
import type { CounterEvent } from '../src/protocol/counterEvent.ts';
import { PLAYING_BEAT_MS, PRESENCE_MS } from '../src/protocol/liveCount.ts';
import { parseCounterEvent } from '../src/protocol/parseCounterEvent.ts';
import { buildLiveCount } from '../src/server/buildLiveCount.ts';
import { DiscordCounter } from '../src/server/discordCount.ts';
import { LivePresence } from '../src/server/livePresence.ts';
import { readDiscordCount } from '../src/server/readDiscordCount.ts';
import { readPresenceMarks } from '../src/server/readPresenceMarks.ts';

const T0 = Date.parse('2026-11-12T20:00:00Z');
const LIVE = { connexions: 4, adresses: 3, salons: 2, enJeu: 1, enFile: 0, locales: 3, presents: 9 };

function memory(): TabStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

test('the counter reads the signals of presence: a browser here, a local game running, nothing else', () => {
  assert.deepEqual(parseCounterEvent('{"type":"presence"}'), { type: 'presence' });
  assert.deepEqual(parseCounterEvent('{"type":"presence","id":"abc"}'), { type: 'presence' }, 'an extra field is dropped');
  for (const mode of ['solo', 'carriere', 'tutoriel']) assert.deepEqual(parseCounterEvent(JSON.stringify({ type: 'en_jeu', mode })), { type: 'en_jeu', mode });
  for (const text of ['{"type":"en_jeu"}', '{"type":"en_jeu","mode":"classee"}', '{"type":"en_jeu","mode":"__proto__"}']) assert.equal(parseCounterEvent(text), null, text);
  assert.ok(isLiveSignal({ type: 'presence' }) && isLiveSignal({ type: 'en_jeu', mode: 'solo' }));
  assert.ok(!isLiveSignal({ type: 'partie', mode: 'tutoriel' }));
});

test('LivePresence: a game beating every minute counts once, a browser saying it is here every hour counts once', () => {
  const live = new LivePresence();
  live.record({ type: 'en_jeu', mode: 'solo' }, T0);
  live.record({ type: 'en_jeu', mode: 'carriere' }, T0 + 20_000);
  live.record({ type: 'en_jeu', mode: 'solo' }, T0 + PLAYING_BEAT_MS + 1);
  assert.equal(live.localGames(T0 + PLAYING_BEAT_MS + 1), 2, 'the first game\'s old beat has gone, its new one counts');
  assert.equal(live.localGames(T0 + 3 * PLAYING_BEAT_MS), 0, 'games that stopped beating are gone within a minute');
  live.record({ type: 'presence' }, T0);
  live.record({ type: 'presence' }, T0 + 30 * 60_000);
  assert.equal(live.players(T0 + 40 * 60_000), 2);
  assert.equal(live.players(T0 + PRESENCE_MS + 1), 1, 'a presence older than an hour is forgotten');
});

test('buildLiveCount: online tables and local games together, never fewer players than those connected now', () => {
  assert.deepEqual(buildLiveCount(LIVE, 2, null), { parties: 5, enLigne: 2, joueurs: 9, discord: null });
  assert.deepEqual(buildLiveCount({ ...LIVE, presents: 0 }, 2, { membres: 30, connectes: 4 }), { parties: 5, enLigne: 2, joueurs: 7, discord: { membres: 30, connectes: 4 } });
});

test('the counts of a Discord invitation are read, and kept when Discord fails', async () => {
  assert.deepEqual(readDiscordCount({ approximate_member_count: 42, approximate_presence_count: 7, guild: {} }), { membres: 42, connectes: 7 });
  for (const data of [null, 'x', {}, { approximate_member_count: '42', approximate_presence_count: 7 }]) assert.equal(readDiscordCount(data), null);
  let answer: Response | Error = new Response(JSON.stringify({ approximate_member_count: 42, approximate_presence_count: 7 }));
  const asked: string[] = [];
  const fakeFetch = (async (url: string | URL | Request) => {
    asked.push(String(url));
    if (answer instanceof Error) throw answer;
    return answer;
  }) as typeof fetch;
  const discord = new DiscordCounter('2Vxcm3TGGR', fakeFetch);
  assert.equal(discord.current, null);
  await discord.refresh();
  assert.deepEqual(discord.current, { membres: 42, connectes: 7 });
  assert.equal(asked[0], 'https://discord.com/api/v10/invites/2Vxcm3TGGR?with_counts=true');
  answer = new Error('réseau coupé');
  await discord.refresh();
  answer = new Response('', { status: 429 });
  await discord.refresh();
  assert.deepEqual(discord.current, { membres: 42, connectes: 7 }, 'the last counts stay');
});

test('the browser says it is here once an hour, even without storage, and its running game every time it is asked', () => {
  assert.equal(presenceIsDue(null, T0), true);
  assert.equal(presenceIsDue(T0, T0 + PRESENCE_MS - 1), false);
  assert.equal(presenceIsDue(T0, T0 + PRESENCE_MS), true);
  assert.equal(presenceIsDue(T0 + 60_000, T0), true, 'a clock that went back');
  let now = T0;
  for (const storage of [memory(), null]) {
    const sent: CounterEvent[] = [];
    const counter = createCounter({ storage, send: (event) => sent.push(event), active: true, now: () => new Date(now), surroundings: () => ({ referrer: '', host: 'casserolade.fr', device: 'ordinateur' }) });
    now = T0;
    counter.presence();
    now += 59 * 60_000;
    counter.presence();
    counter.playing('tutoriel');
    now += 60_000;
    counter.presence();
    assert.deepEqual(sent, [{ type: 'presence' }, { type: 'en_jeu', mode: 'tutoriel' }, { type: 'presence' }], storage ? 'with storage' : 'without storage');
  }
  const silent: CounterEvent[] = [];
  const inactive = createCounter({ storage: memory(), send: (event) => silent.push(event), active: false, now: () => new Date(T0), surroundings: () => ({ referrer: '', host: 'casserolade.fr', device: 'ordinateur' }) });
  inactive.presence();
  inactive.playing('solo');
  assert.deepEqual(silent, [], 'nothing in development');
});

test('the running local game is read without being forgotten; a reload\'s reading forgets it', () => {
  const tab = memory();
  assert.equal(runningLocalGame(tab), null);
  markLocalGame({ kind: 'carriere' }, tab);
  assert.deepEqual(runningLocalGame(tab), { kind: 'carriere' });
  assert.deepEqual(runningLocalGame(tab), { kind: 'carriere' });
  assert.deepEqual(takeInterruptedGame(tab), { kind: 'carriere' });
  assert.equal(runningLocalGame(tab), null);
});

test('the home page shows the games and the players online in the right number, and the Discord once it has members enough', () => {
  assert.deepEqual(liveTallyItems(null), [], 'nothing before the server answered');
  assert.deepEqual(liveTallyItems({ parties: 0, enLigne: 0, joueurs: 1, discord: null }), [{ value: 0, label: 'partie en cours' }, { value: 1, label: 'joueur en ligne' }]);
  assert.deepEqual(liveTallyItems({ parties: 7, enLigne: 2, joueurs: 12, discord: null }), [{ value: 7, label: 'parties en cours' }, { value: 12, label: 'joueurs en ligne' }]);
  assert.equal(discordMembersLabel(null), null);
  assert.equal(discordMembersLabel({ membres: 3, connectes: 2 }), null, 'a handful is not shown');
  assert.equal(discordMembersLabel({ membres: 42, connectes: 1 }), '42 membres, dont 1 connecté');
  assert.equal(discordMembersLabel({ membres: 42, connectes: 9 }), '42 membres, dont 9 connectés');
  assert.equal(discordMembersLabel({ membres: 42, connectes: 0 }), '42 membres');
  assert.deepEqual(readLiveCount({ parties: 3, enLigne: 1, joueurs: 8, discord: { membres: 20, connectes: 2 } }), { parties: 3, enLigne: 1, joueurs: 8, discord: { membres: 20, connectes: 2 } });
  assert.deepEqual(readLiveCount({ parties: 3, enLigne: 1, joueurs: 8, discord: 'x' }), { parties: 3, enLigne: 1, joueurs: 8, discord: null });
  for (const data of [null, '<!doctype html>', {}, { parties: -1, enLigne: 0, joueurs: 0 }, { parties: 1.5, enLigne: 0, joueurs: 0 }]) assert.equal(readLiveCount(data), null);
});

test('the presences of the last hour are kept over a restart, times only', () => {
  const before = new LivePresence();
  before.record({ type: 'presence' }, T0 - 2 * PRESENCE_MS);
  before.record({ type: 'presence' }, T0 - 30 * 60_000);
  before.record({ type: 'presence' }, T0 - 60_000);
  before.record({ type: 'en_jeu', mode: 'solo' }, T0 - 1000);
  const saved = JSON.stringify(before.savedPresences(T0));
  assert.deepEqual(JSON.parse(saved), [T0 - 30 * 60_000, T0 - 60_000]);
  const after = new LivePresence(readPresenceMarks(saved, T0 + 1000));
  assert.equal(after.players(T0 + 1000), 2);
  assert.equal(after.localGames(T0 + 1000), 0, 'the running games come back by themselves within a minute');
  assert.deepEqual(readPresenceMarks(JSON.stringify([T0, 'x', null, T0 - PRESENCE_MS - 1, T0 + 999_999, T0 - 5]), T0), [T0 - 5, T0]);
  for (const text of ['', 'pas du json', '{}', 'null']) assert.deepEqual(readPresenceMarks(text, T0), []);
});
