import type { ClientMessage, ServerMessage } from '#src/protocol/messages.ts';
import { parseClientMessage } from '#src/protocol/parseClientMessage.ts';
import type { Transport } from '#src/protocol/transport.ts';
import { generateSeed } from '#src/server/generateSeed.ts';
import { GameRoom } from '#src/server/room.ts';
import type { RoomSeat } from '#src/server/room.ts';
import type { BotLevel } from '#src/bots/bots.ts';
import type { GameOptions } from '#src/engine/game.ts';

const HUMAN_SEAT = 0;
const SEATS = 8;
/** Seul contre l'ordinateur, personne n'attend personne : jamais de minuteur, ni au choix du héros ni au recrutement. */
const NO_TIMERS = { heroMs: null, recruitMs: null, graceMs: 15_000 };

const browserClock = {
  now: () => Date.now(),
  setTimeout: (callback: () => void, ms: number) => window.setTimeout(callback, ms),
  clearTimeout: (handle: unknown) => window.clearTimeout(handle as number),
};

export interface LocalGameSettings {
  pseudo: string;
  botLevel: BotLevel;
  seed?: number;
  /** Story chapters: a table of another size, with their own bots. The human stays on seat 0. */
  seats?: RoomSeat[];
  game?: Partial<GameOptions>;
}

/**
 * A solo game: the same room as online, in the page. Messages go through JSON and the
 * protocol check in both directions, so what works here also works over the network.
 */
export function createLocalTransport({ pseudo, botLevel, seed, seats: chosenSeats, game }: LocalGameSettings): Transport {
  let listener: (message: ServerMessage) => void = () => {};
  let closeListener: () => void = () => {};
  const seats: RoomSeat[] = chosenSeats ?? Array.from({ length: SEATS }, (_, i) =>
    i === HUMAN_SEAT ? { pseudo, level: null } : { pseudo: `Bot ${i}`, level: botLevel },
  );
  const room = new GameRoom({
    seed: seed ?? generateSeed(),
    seats,
    game,
    clock: browserClock,
    timers: NO_TIMERS,
    // A solo game that stops on a bug: everything to replay it, in the console (tools/rejouer.ts).
    onIncident(incident) {
      console.error('Incident de partie', incident.kind, incident.message, JSON.stringify(incident));
    },
    send(seat, message) {
      if (seat !== HUMAN_SEAT) return;
      const copy = JSON.stringify(message);
      queueMicrotask(() => listener(JSON.parse(copy) as ServerMessage));
    },
  });
  queueMicrotask(() => room.start());
  // Development only: the browser checks drive the room directly to set up a scene.
  if (import.meta.env.DEV) (window as unknown as { __room?: GameRoom }).__room = room;
  return {
    send(message: ClientMessage) {
      const parsed = parseClientMessage(JSON.stringify(message));
      if (parsed) room.handleMessage(HUMAN_SEAT, parsed);
      else console.error('Message rejected by the protocol check', message);
    },
    onMessage(next) {
      listener = next;
    },
    onClose(next) {
      closeListener = next;
    },
    close() {
      room.destroy();
      closeListener();
    },
  };
}
