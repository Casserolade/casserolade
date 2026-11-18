import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, chooseRemainingHeroes, createGame, finishRound, startCombats } from '../src/engine/game.ts';
import type { PlayerView } from '../src/engine/game.ts';
import type { Classement, ServerMessage } from '../src/protocol/messages.ts';
import { invariantViolations } from '../src/engine/invariants.ts';
import { PARTIE_PLANTEE } from '../src/protocol/messages.ts';
import { replayRoom } from '../src/server/replayRoom.ts';
import { PARAMS } from '../src/data/params.ts';
import { GameRoom } from '../src/server/room.ts';
import type { Clock, RoomIncident, RoomSeat } from '../src/server/room.ts';

/** A clock that only moves when the test says so. */
function createFakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const clock: Clock = {
    now: () => now,
    setTimeout(callback, ms) {
      timers.set(nextId, { at: now + ms, callback });
      return nextId++;
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
  return { clock, advance, pending: () => timers.size };
}

function createRoom({ humans = 1, seed = 42, recruitMs = 30_000 as number | null, incidents = null as RoomIncident[] | null } = {}) {
  const fake = createFakeClock();
  const inbox = new Map<number, ServerMessage[]>();
  const seats: RoomSeat[] = Array.from({ length: 8 }, (_, i) => (i < humans ? { pseudo: `H${i}`, level: null } : { pseudo: `B${i}`, level: 'facile' }));
  let ranking: Classement | null = null;
  const room = new GameRoom({
    seed,
    seats,
    clock: fake.clock,
    timers: { heroMs: 20_000, recruitMs: recruitMs === null ? null : () => recruitMs, graceMs: 10_000 },
    send(seat, message) {
      inbox.set(seat, [...(inbox.get(seat) ?? []), JSON.parse(JSON.stringify(message))]);
    },
    onEnd(r) {
      ranking = r;
    },
    ...(incidents ? { onIncident: (incident: RoomIncident) => incidents.push(incident) } : {}),
  });
  const lastView = (seat: number): PlayerView => {
    const views = (inbox.get(seat) ?? []).filter((m) => m.type === 'vue');
    const last = views[views.length - 1];
    assert.ok(last && last.type === 'vue');
    return last.vue;
  };
  return { room, fake, inbox, lastView, getRanking: () => ranking };
}

test('a room waits for the human hero choice, then starts recruitment with a timer', () => {
  const { room, inbox, lastView } = createRoom();
  room.start();
  assert.equal(lastView(0).phase, 'choix_heros');
  assert.equal(lastView(0).heroOffers?.length, PARAMS.heroChoices);
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 1 } });
  assert.equal(lastView(0).phase, 'recrutement');
  const last = inbox.get(0)?.at(-1);
  assert.ok(last?.type === 'vue' && last.reste_ms === 30_000);
});

test('the hero timer chooses for whoever did not', () => {
  const { room, fake, lastView } = createRoom();
  room.start();
  const offered = lastView(0).heroOffers?.[0];
  fake.advance(20_000);
  assert.equal(lastView(0).phase, 'recrutement');
  assert.equal(lastView(0).heroId, offered);
});

test('bots play during recruitment, only through their own seat', () => {
  const { room, lastView } = createRoom();
  room.start();
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  const others = lastView(0).table.filter((row) => row.seat !== 0);
  assert.ok(others.some((row) => row.boardSize > 0), 'bots should have recruited');
  assert.equal(lastView(0).board.length, 0);
});

test('an illegal action gets a refusal with its sequence number, and the state does not move', () => {
  const { room, inbox, lastView } = createRoom();
  room.start();
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  const before = lastView(0).budget;
  room.handleMessage(0, { type: 'action', seq: 7, action: { t: 'buy', slot: 99 } });
  const last = inbox.get(0)?.at(-1);
  assert.deepEqual(last, { type: 'refus', seq: 7, erreur: 'Emplacement vide.' });
  assert.equal(lastView(0).budget, before);
});

test('ready ends recruitment; the room holds the next round until the combat is seen', () => {
  const { room, inbox, lastView } = createRoom();
  room.start();
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  room.handleMessage(0, { type: 'pret' });
  const combat = inbox.get(0)?.at(-1);
  assert.ok(combat?.type === 'combat');
  assert.equal(combat.combat.round, 1);
  assert.equal(lastView(0).round, 1);
  room.handleMessage(0, { type: 'vu' });
  assert.equal(lastView(0).round, 2);
});

test('actions after ready are refused', () => {
  const { room, inbox } = createRoom({ humans: 2 });
  room.start();
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  room.handleMessage(1, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  room.handleMessage(0, { type: 'pret' });
  room.handleMessage(0, { type: 'action', seq: 2, action: { t: 'roll' } });
  assert.deepEqual(inbox.get(0)?.at(-1), { type: 'refus', seq: 2, erreur: 'Vous avez déjà terminé votre recrutement.' });
});

test('the recruitment timer ends the phase, and the combat timer ends the wait', () => {
  const { room, fake, inbox, lastView } = createRoom();
  room.start();
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  fake.advance(30_000);
  assert.equal(inbox.get(0)?.at(-1)?.type, 'combat');
  fake.advance(600_000);
  assert.ok(lastView(0).round >= 2);
});

test('a solo player who ignores everything is eliminated and the bots finish the game', () => {
  const { room, fake, inbox, getRanking } = createRoom({ recruitMs: 1000 });
  room.start();
  fake.advance(20_000);
  for (let i = 0; i < 400 && !getRanking(); i++) fake.advance(60_000);
  const ranking = getRanking() as Classement | null;
  assert.ok(ranking, 'the game should end');
  assert.equal(ranking.length, 8);
  assert.deepEqual(ranking.map((r) => r.place), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(inbox.get(0)?.at(-1)?.type, 'fin');
  assert.equal(fake.pending(), 0, 'no timer left behind');
});

test('after elimination the human stops waiting: the end comes as soon as the last combat is seen', () => {
  const { room, inbox, fake, getRanking } = createRoom({ recruitMs: null });
  room.start();
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  for (let i = 0; i < 80 && !getRanking(); i++) {
    room.handleMessage(0, { type: 'pret' });
    if (inbox.get(0)?.at(-1)?.type === 'combat') room.handleMessage(0, { type: 'vu' });
  }
  assert.ok(getRanking(), 'the game should end without any timer');
  assert.equal(fake.pending(), 0);
});

test('a disconnected seat keeps its turn during the grace period, then a bot plays it', () => {
  const { room, fake, lastView, inbox } = createRoom({ humans: 2, recruitMs: 60_000 });
  room.start();
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  room.handleMessage(1, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  room.setConnected(1, false);
  fake.advance(5000);
  assert.equal(room.game.players[1].board.length, 0);
  fake.advance(5000);
  assert.ok(room.game.players[1].board.length > 0, 'the bot should have played the seat');
  room.handleMessage(0, { type: 'pret' });
  assert.equal(inbox.get(0)?.at(-1)?.type, 'combat');
  room.handleMessage(0, { type: 'vu' });
  const round = lastView(0).round;
  assert.equal(round, 2);
  const budgetByBot = room.game.players[1].budget;
  assert.ok(budgetByBot <= lastView(0).params.maxBudget);
});

test('a player who returns gets the state back, and the bot gives the seat back', () => {
  const { room, fake, lastView, inbox } = createRoom({ humans: 2, recruitMs: 60_000 });
  room.start();
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  room.handleMessage(1, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  room.setConnected(1, false);
  fake.advance(10_000);
  const count = inbox.get(1)?.length ?? 0;
  room.setConnected(1, true);
  assert.equal(inbox.get(1)?.length, count + 1);
  assert.equal(lastView(1).phase, 'recrutement');
  room.handleMessage(0, { type: 'pret' });
  assert.equal(inbox.get(0)?.at(-1)?.type, 'vue', 'the round waits for the returning player');
  room.handleMessage(1, { type: 'pret' });
  assert.equal(inbox.get(0)?.at(-1)?.type, 'combat');
});

test('the seed and the logged actions replay the game exactly', () => {
  const { room, fake, getRanking } = createRoom({ recruitMs: 1000, seed: 77 });
  room.start();
  fake.advance(20_000);
  for (let i = 0; i < 400 && !getRanking(); i++) fake.advance(60_000);

  const replay = replayRoom({ seed: 77, seats: Array.from({ length: 8 }, () => ({ pseudo: 'x', level: null })), game: null, log: room.log });
  assert.deepEqual(replay.players.map((p) => [p.place, p.hp]), room.game.players.map((p) => [p.place, p.hp]));
  assert.equal(replay.phase, room.game.phase);
  assert.deepEqual(invariantViolations(replay), []);
});

test('a bug stops its game only: nothing escapes, the players are told, the incident replays', () => {
  const incidents: RoomIncident[] = [];
  const { room, fake, inbox } = createRoom({ recruitMs: 1000, seed: 91, incidents });
  room.start();
  fake.advance(20_000);
  assert.equal(room.game.phase, 'recrutement');
  // A bug in the engine, at the end of recruitment, inside a timer: it would have stopped the whole server.
  (room.game.players[3] as unknown as { board: null }).board = null;
  assert.doesNotThrow(() => fake.advance(5_000));
  assert.equal(incidents.length, 1);
  const [crash] = incidents;
  assert.equal(crash.kind, 'crash');
  assert.ok(crash.stack && crash.log.length > 0 && crash.seed === 91, 'le rapport a tout pour rejouer');
  assert.deepEqual(inbox.get(0)?.at(-1), { type: 'erreur', erreur: PARTIE_PLANTEE });
  assert.equal(fake.pending(), 0, 'plus aucun minuteur ne tourne pour ce salon');
  assert.doesNotThrow(() => room.handleMessage(0, { type: 'pret' }));
  assert.doesNotThrow(() => room.setConnected(0, false));
  // The record replays to the round where it stopped, with the same engine.
  const replay = replayRoom(crash);
  assert.equal(replay.round, crash.round);
});

test('a broken rule is reported once per round, with the violations, and the game goes on', () => {
  const incidents: RoomIncident[] = [];
  const { room, fake } = createRoom({ recruitMs: 1000, seed: 92, incidents });
  room.start();
  fake.advance(20_000);
  room.game.players[2].budget = -5;
  fake.advance(5_000);
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].kind, 'anomalie');
  assert.ok(incidents[0].violations.some((v) => v.includes('budget -5')), incidents[0].violations.join(' | '));
  assert.notEqual(room.game.phase, 'fini');
  for (let i = 0; i < 20; i++) fake.advance(60_000);
  assert.ok(room.game.round > incidents[0].round, 'la partie continue');
});

// Retour de partie du 9 novembre 2026 : à cinq, un adversaire sans visage et une victoire d'office. Toutes les parties
// passent par une GameRoom (solo, carrière, tutoriel, salons, file publique) : à une table impaire, le joueur en trop
// affronte le fantôme, et son écran sait de qui il prend les traits.
test('à une table impaire, le joueur en trop affronte un fantôme qui a un visage, celui d\'un autre joueur en lice', () => {
  const fake = createFakeClock();
  const inbox: ServerMessage[] = [];
  const seats: RoomSeat[] = [{ pseudo: 'H0', level: null }, ...Array.from({ length: 4 }, (_, i) => ({ pseudo: `B${i + 1}`, level: 'facile' as const }))];
  const room = new GameRoom({ seed: 9, seats, clock: fake.clock, timers: { heroMs: null, recruitMs: null, graceMs: 10_000 }, send(seat, message) {
    if (seat === 0) inbox.push(JSON.parse(JSON.stringify(message)));
  } });
  room.start();
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  let ghost: Extract<ServerMessage, { type: 'combat' }>['combat']['opponent'] | null = null;
  for (let i = 0; i < 40 && !ghost; i++) {
    room.handleMessage(0, { type: 'pret' });
    const last = inbox.at(-1);
    if (last?.type !== 'combat') continue;
    if (last.combat.opponent.seat === -1) ghost = last.combat.opponent;
    room.handleMessage(0, { type: 'vu' });
  }
  assert.ok(ghost, 'le joueur doit croiser le fantôme');
  assert.equal(ghost.heroId, 'fantome');
  const others = room.game.players.filter((p) => p.seat !== 0).map((p) => p.hero.id);
  assert.ok(ghost.ghostOf && others.includes(ghost.ghostOf), `visage du fantôme : ${ghost.ghostOf}`);
});

test('out of the game, a player follows a survivor: its recruitment table and its combats come live, and the round waits for them', async () => {
  const { retire } = await import('../src/engine/script.ts');
  const { room, inbox, lastView } = createRoom({ humans: 2, recruitMs: null });
  room.start();
  room.handleMessage(0, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  room.handleMessage(1, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  // Seat 1 is out: it follows seat 3, a bot still in the game.
  retire(room.game, room.game.players[1], 8);
  room.handleMessage(1, { type: 'suivre', siege: 1 });
  room.handleMessage(1, { type: 'suivre', siege: 99 });
  room.handleMessage(0, { type: 'suivre', siege: 3 });
  room.handleMessage(1, { type: 'suivre', siege: 3 });
  // In the middle of the recruitment, the survivor's table comes at once, as that survivor sees it.
  const table = inbox.get(1)?.at(-1);
  assert.ok(table?.type === 'suivi', 'the follower gets the survivor\'s recruitment table');
  assert.equal(table.siege, 3);
  assert.equal(table.vue.seat, 3);
  assert.equal(table.vue.phase, 'recrutement');
  assert.deepEqual(table.vue.shop, JSON.parse(JSON.stringify(room.game.players[3].shop)), 'its shop, as it sees it');
  room.handleMessage(0, { type: 'pret' });
  const shown = inbox.get(1)?.at(-1);
  assert.ok(shown?.type === 'spectacle', 'the follower gets the survivor\'s combat');
  assert.equal(shown.siege, 3);
  assert.equal(shown.combat.round, 1);
  assert.deepEqual(shown.combat.endOfTurn, JSON.parse(JSON.stringify(room.game.players[3].endOfTurnSteps)), 'with the end of turn that plays on its table');
  assert.ok(!(inbox.get(0) ?? []).some((m) => m.type === 'spectacle' || m.type === 'suivi'), 'a player still in the game follows nobody');
  room.handleMessage(0, { type: 'vu' });
  assert.equal(lastView(0).round, 1, 'the round waits for the follower');
  room.handleMessage(1, { type: 'vu' });
  assert.equal(lastView(0).round, 2);
  // The next recruitment: the survivor's new table comes with it, and again when the follower returns.
  const next = inbox.get(1)?.at(-1);
  assert.ok(next?.type === 'suivi' && next.vue.round === 2, 'the survivor\'s table of the next round');
  room.setConnected(1, false);
  room.setConnected(1, true);
  assert.equal(inbox.get(1)?.at(-1)?.type, 'suivi', 'back in the middle of a recruitment, the table again');
  // Back in the middle of the combats, the follower finds the combat again; « null » stops following.
  room.handleMessage(0, { type: 'pret' });
  room.setConnected(1, false);
  room.setConnected(1, true);
  assert.equal(inbox.get(1)?.at(-1)?.type, 'spectacle');
  room.handleMessage(1, { type: 'suivre', siege: null });
  room.handleMessage(0, { type: 'vu' });
  room.handleMessage(0, { type: 'pret' });
  assert.equal(inbox.get(1)?.at(-1)?.type, 'vue', 'no more combats once it stops');
});

test('a followed human: each of its gestures shows on its followers\' table; who stops following is no longer waited for', async () => {
  const { retire } = await import('../src/engine/script.ts');
  const { room, inbox, lastView } = createRoom({ humans: 3, recruitMs: null });
  room.start();
  for (const seat of [0, 1, 2]) room.handleMessage(seat, { type: 'action', seq: 1, action: { t: 'hero', i: 0 } });
  retire(room.game, room.game.players[1], 8);
  room.handleMessage(1, { type: 'suivre', siege: 0 });
  const followed = () => (inbox.get(1) ?? []).filter((m) => m.type === 'suivi');
  const before = followed().length;
  assert.equal(before, 1);
  // Seat 0 freezes its shop: its follower sees the table change; seat 2's gestures are nobody's business.
  room.handleMessage(0, { type: 'action', seq: 2, action: { t: 'freeze' } });
  assert.equal(followed().length, before + 1);
  const last = followed().at(-1);
  assert.ok(last?.type === 'suivi' && last.siege === 0 && last.vue.frozen, 'the frozen shop shows');
  room.handleMessage(2, { type: 'action', seq: 2, action: { t: 'freeze' } });
  assert.equal(followed().length, before + 1);
  // The combats: the follower is waited for, until it stops following.
  room.handleMessage(0, { type: 'pret' });
  room.handleMessage(2, { type: 'pret' });
  assert.equal(inbox.get(1)?.at(-1)?.type, 'spectacle');
  room.handleMessage(0, { type: 'vu' });
  room.handleMessage(2, { type: 'vu' });
  assert.equal(lastView(0).round, 1, 'the round waits for the follower');
  room.handleMessage(1, { type: 'suivre', siege: null });
  assert.equal(lastView(0).round, 2, 'it stopped following: the round goes on');
  assert.equal(followed().length, before + 1, 'and no table comes any more');
});
