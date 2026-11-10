import type { GamePhase } from '../engine/game.ts';
import type { GameRoom } from './room.ts';

/** A seat of a game in progress, as the dashboard shows it: no pseudo, no address. */
export interface LiveSeat {
  /** Null while the hero is still to be chosen. */
  heros: string | null;
  humain: boolean;
  /** A human whose page is still connected. */
  connecte: boolean;
  /** A human whose seat a bot plays, or played, after a disconnection. */
  repris: boolean;
  vivant: boolean;
  sondages: number;
  echelon: number;
  place: number;
}

/** A game in progress on the server, for the dashboard. */
export interface LiveGame {
  publique: boolean;
  minuteur: boolean;
  depuisMs: number;
  manche: number;
  phase: GamePhase;
  sieges: LiveSeat[];
}

/** No more lines than this: the dashboard is for reading, not for every room of a crowded evening. */
const MAX_LIVE_GAMES = 40;

/** The games in progress, the oldest first. */
export function liveGames(games: readonly { room: GameRoom; publique: boolean }[], now: number): LiveGame[] {
  return [...games]
    .sort((a, b) => a.room.startedAt - b.room.startedAt)
    .slice(0, MAX_LIVE_GAMES)
    .map(({ room, publique }) => ({
      publique,
      minuteur: room.timed,
      depuisMs: Math.max(0, now - room.startedAt),
      manche: room.game.round,
      phase: room.game.phase,
      sieges: room.game.players.map((p) => {
        const humain = room.seats[p.seat].level === null;
        return {
          heros: p.heroOffers ? null : p.hero.id,
          humain,
          connecte: humain && room.isConnected(p.seat),
          repris: room.takenOver.has(p.seat),
          vivant: p.alive,
          sondages: p.hp,
          echelon: p.tier,
          place: p.place,
        };
      }),
    }));
}
