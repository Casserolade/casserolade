import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Lobby } from '../src/lobby/lobby.ts';
import type { EvenementSalon } from '../src/lobby/lobby.ts';
import type { ClientMessage, ServerMessage } from '../src/protocol/messages.ts';
import { VERSION } from '../src/protocol/version.ts';
import { appendToArchive, archiveGame } from '../src/server/gameArchive.ts';
import type { ArchivedGame } from '../src/server/gameArchive.ts';
import { liveGames } from '../src/server/liveGames.ts';
import { replayRoom } from '../src/server/replayRoom.ts';
import { GameRoom } from '../src/server/room.ts';
import type { Clock } from '../src/server/room.ts';
import { SiteStats } from '../src/server/siteStats.ts';

/** A clock that only moves when the test says so. */
function fakeClock(start = 1_000_000) {
  let now = start;
  let id = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const clock: Clock = {
    now: () => now,
    setTimeout(callback, ms) {
      timers.set(++id, { at: now + ms, callback });
      return id;
    },
    clearTimeout(handle) {
      timers.delete(handle as number);
    },
  };
  function advance(ms: number): void {
    const end = now + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      now = due[1].at;
      due[1].callback();
    }
    now = end;
  }
  return { clock, advance };
}

/** A two-human table with six bots, played to the end: one human plays, the other leaves and a bot takes the seat. */
function playedGame(): { room: GameRoom; end: number } {
  const { clock, advance } = fakeClock();
  let ended = false;
  const room = new GameRoom({
    seed: 9,
    seats: [{ pseudo: 'Anne', level: null }, { pseudo: 'Bob', level: null }, ...Array.from({ length: 6 }, (_, i) => ({ pseudo: `Bot ${i + 1}`, level: 'facile' as const }))],
    clock,
    timers: { heroMs: 20_000, recruitMs: () => 1000, graceMs: 10_000 },
    send: () => {},
    onEnd: () => (ended = true),
  });
  room.start();
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  room.setConnected(1, false);
  for (let i = 0; i < 400 && !ended; i++) advance(60_000);
  assert.ok(ended, 'the game should end');
  return { room, end: clock.now() };
}

test('a finished online game is archived without pseudo: each seat summed up, and the log replays it to the same places', () => {
  const { room, end } = playedGame();
  const game = archiveGame(room, { publique: false, commit: 'abc1234', now: end });
  assert.equal(game.version, VERSION);
  assert.equal(game.commit, 'abc1234');
  assert.equal(game.manches, room.game.round);
  assert.equal(game.dureeMs, end - room.startedAt);
  assert.ok(game.minuteur);
  assert.deepEqual(game.seats.slice(0, 3), [{ pseudo: 'Joueur 1', level: null }, { pseudo: 'Joueur 2', level: null }, { pseudo: 'Bot 1', level: 'facile' }]);
  assert.ok(!JSON.stringify(game).includes('Anne') && !JSON.stringify(game).includes('Bob'), 'no pseudo in the archive');
  assert.deepEqual(game.joueurs.map((seat) => seat.place).sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(game.joueurs[0].repris, false);
  assert.equal(game.joueurs[1].repris, true, 'the seat a bot took over says so');
  assert.equal(game.joueurs[2].niveau, 'facile');
  const seat = game.joueurs.find((s) => s.plateau.length > 0);
  assert.ok(seat, 'a board is kept');
  assert.ok(seat.campCount > 0 && seat.camp);
  assert.ok((seat.actions.buy ?? 0) > 0, 'the actions are counted by type');
  const replay = replayRoom(game);
  assert.deepEqual(replay.players.map((p) => p.place), game.joueurs.map((s) => s.place));

  const dir = mkdtempSync(join(tmpdir(), 'archive-'));
  appendToArchive(dir, game);
  appendToArchive(dir, game);
  const files = readdirSync(dir);
  assert.equal(files.length, 1);
  assert.match(files[0], /^\d{4}-\d{2}-\d{2}\.jsonl$/);
  const lines = readFileSync(join(dir, files[0]), 'utf8').trim().split('\n');
  assert.equal(lines.length, 2, 'one line per game');
  assert.deepEqual(JSON.parse(lines[0]), game);
});

test('the online results count humans against each level of bots, and the heroes and camps of the humans who played to the end', () => {
  const stats = new SiteStats({ file: null, now: () => new Date('2026-11-10T19:30:00Z') });
  const seat = (place: number, niveau: ArchivedGame['joueurs'][number]['niveau'], heros: string, repris = false) => ({
    siege: place - 1, niveau, repris, heros, place, sondages: 0, echelon: 4, camp: 'rn', campCount: place === 1 ? 4 : 2, plateau: [], casseroles: 0, scandales: 0, triples: 0, sorts: 0, actions: {},
  });
  const game = {
    version: '0.3e', manches: 14, dureeMs: 20 * 60_000,
    joueurs: [seat(1, null, 'bardella'), seat(2, 'moyen', 'hollande'), seat(3, null, 'ruffin', true), seat(4, 'moyen', 'macron')],
  } as unknown as ArchivedGame;
  stats.partie(false, 2);
  stats.partieFinie(game);
  stats.partieAbandonnee();
  stats.reprise();
  const snapshot = stats.snapshot({ connexions: 0, adresses: 0, salons: 0, enJeu: 0, enFile: 0, locales: 0, presents: 0, lanceesEnLigne: 0, lanceesLocales: 0 }, null);
  const day = snapshot.days.at(-1);
  assert.equal(day?.partiesFinies, 1);
  assert.equal(day?.manchesFinies, 14);
  assert.equal(day?.dureeFiniesMs, 20 * 60_000);
  assert.equal(day?.partiesAbandonnees, 1);
  assert.equal(day?.reprises, 1);
  assert.equal(day?.heures.parties[20], 1, '19 h 30 UTC is 20 h in Paris');
  assert.equal(snapshot.totaux.partiesFinies, 1);
  const results = snapshot.cumul.enLigne['0.3e'];
  assert.deepEqual(results.sieges.humain, { parties: 2, places: 4, victoires: 1, top4: 2 }, 'every human seat compares with the bots');
  assert.deepEqual(results.sieges.moyen, { parties: 2, places: 6, victoires: 0, top4: 2 });
  assert.deepEqual(Object.keys(results.heros), ['bardella'], 'a seat a bot took over says nothing of its hero');
  assert.deepEqual(results.camps, { rn: { parties: 1, places: 1, victoires: 1, top4: 1 } }, 'a camp counts from three politicians');
});

test('the lobby tells a finished game, an abandoned one and a seat taken over; a server stop abandons nothing', () => {
  const { clock, advance } = fakeClock();
  const events: EvenementSalon[] = [];
  const inbox = new Map<string, ServerMessage[]>();
  const lobby = new Lobby({
    clock,
    graine: () => 42,
    send: (c, m) => inbox.set(c, [...(inbox.get(c) ?? []), m]),
    evenement: (e) => events.push(e),
  });
  const say = (c: string, m: ClientMessage) => lobby.handleMessage(c, m);
  const last = (c: string, type: ServerMessage['type']) => [...(inbox.get(c) ?? [])].reverse().find((m) => m.type === type);
  say('a', { type: 'creer_salon', pseudo: 'Anne', options: { bots: 0, niveauBots: 'facile', minuteur: false, table: 3 } });
  say('a', { type: 'lancer' });
  say('a', { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  const games = liveGames(lobby.partiesEnCours, clock.now() + 5000);
  assert.equal(games.length, 1);
  assert.equal(games[0].depuisMs, 5000);
  assert.deepEqual(games[0].sieges.map((s) => [s.humain, s.connecte]), [[true, true], [false, false], [false, false]]);
  assert.ok(games[0].sieges[0].heros, 'the chosen hero shows');
  for (let n = 0; n < 200 && !last('a', 'fin'); n++) {
    say('a', { type: 'pret' });
    say('a', { type: 'vu' });
  }
  assert.ok(last('a', 'fin'));
  assert.deepEqual(events.map((e) => e.type), ['salon_cree', 'partie', 'partie_finie']);
  assert.equal(lobby.partiesEnCours.length, 0);

  // The last human leaves: the game is abandoned at once. (A disconnection waits five minutes, and bots that took
  // over may finish the game before that: how long it lasts depends on the cards, 13 November 2026.)
  say('a', { type: 'lancer' });
  say('a', { type: 'quitter' });
  assert.equal(events.at(-1)?.type, 'partie_abandonnee', 'every human gone: the game is abandoned');

  say('b', { type: 'creer_salon', pseudo: 'Bob', options: { bots: 0, niveauBots: 'facile', minuteur: true, table: 3 } });
  const code = (last('b', 'salon') as Extract<ServerMessage, { type: 'salon' }>).salon.code;
  say('c', { type: 'rejoindre', code, pseudo: 'Chloé' });
  say('b', { type: 'lancer' });
  lobby.disconnect('c');
  advance(16_000);
  assert.deepEqual(events.at(-1), { type: 'reprise', publique: false, manche: 0 }, 'past its grace, a bot takes the seat, here at the choice of heroes');
  assert.equal(liveGames(lobby.partiesEnCours, clock.now())[0].sieges[1].repris, true);
  const count = events.length;
  lobby.destroy();
  assert.equal(events.length, count, 'a server stop is nobody\'s abandon');
});
