import { applyAction, chooseRemainingHeroes, createGame, finishRound, startCombats } from '../engine/game.ts';
import type { Game, GameOptions } from '../engine/game.ts';
import type { RoomLogEntry, RoomSeat } from './room.ts';

/** What a room needs to be replayed: its seed, its seats, its game options and its log (a RoomIncident has them). */
export interface RoomRecord {
  seed: number;
  seats: RoomSeat[];
  game: Partial<GameOptions> | null;
  log: RoomLogEntry[];
}

/**
 * Replays a room's game with the current engine, from its seed and log: the same game as GameRoom builds,
 * then each logged entry in order. Bots are not asked again: their actions are in the log. An action the
 * engine refuses means the replay diverged (another engine version, or a bug): it stops there.
 */
export function replayRoom(record: RoomRecord): Game {
  const game = createGame({ ...record.game, seed: record.seed, seats: record.seats.length, heroSelection: true, combatLog: true });
  record.log.forEach((entry, index) => {
    if (entry.kind === 'action') {
      const result = applyAction(game, entry.seat, entry.action);
      if (!result.ok) throw new Error(`Rejeu divergent à l'entrée ${index} (siège ${entry.seat}, ${entry.action.t}) : ${result.error}`);
    } else if (entry.kind === 'heroes_timeout') {
      chooseRemainingHeroes(game);
    } else if (entry.kind === 'combat') {
      startCombats(game);
    } else {
      finishRound(game);
    }
  });
  return game;
}
