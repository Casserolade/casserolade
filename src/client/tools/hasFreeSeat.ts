import type { SalonPublic } from '#src/protocol/publicRooms.ts';

/** One may still walk into this public room: while it waits, to play; during its game, to play the next one. */
export function hasFreeSeat(room: SalonPublic): boolean {
  return room.joueurs < room.places;
}
