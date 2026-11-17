import type { VueSalon } from '#src/protocol/messages.ts';

/**
 * The humans of a room: those at its table, and during a game those who came in since and wait for the next one.
 * Zero without a room.
 */
export function roomHumans(room: VueSalon | null): number {
  if (!room) return 0;
  return room.joueurs.filter((player) => !player.bot).length + (room.enAttente?.length ?? 0);
}
