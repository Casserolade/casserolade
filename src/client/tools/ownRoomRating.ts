import type { VueSalon } from '#src/protocol/messages.ts';

/** The rating the room shows on the reader's own seat; null without a seat, or without a rating yet. */
export function ownRoomRating(room: VueSalon | null): number | null {
  if (!room || room.siege < 0) return null;
  const seat = room.joueurs.find((player) => player.siege === room.siege && !player.bot);
  return seat?.mmr ?? null;
}
