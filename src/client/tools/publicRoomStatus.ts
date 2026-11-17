import { hasFreeSeat } from '#src/client/tools/hasFreeSeat.ts';
import type { SalonPublic } from '#src/protocol/publicRooms.ts';

/**
 * What a public room is doing, in a few words, for the home page's list: nothing to say of a room that waits; of one
 * that plays, its round, and that one may still come in: to talk with the table, and play its next game.
 */
export function publicRoomStatus(room: SalonPublic): string | null {
  if (room.manche === null) return null;
  const game = room.manche === 0 ? 'Partie lancée' : `Manche ${room.manche} en cours`;
  return hasFreeSeat(room) ? `${game} : entrez pour la suivante` : game;
}
