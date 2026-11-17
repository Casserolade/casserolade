import type { VueSalon } from '#src/protocol/messages.ts';

/** A player the host may mute or put out. */
export interface ModerablePlayer {
  pseudo: string;
  /** The host muted its chat. */
  muted: boolean;
}

/**
 * The players a room's host may mute or put out: every other human, at the table or waiting for the next game.
 * Nobody for whoever is not the host, or without a room.
 */
export function moderablePlayers(room: VueSalon | null): ModerablePlayer[] {
  if (!room?.estHote) return [];
  const seated = room.joueurs.filter((player) => !player.bot).map((player) => player.pseudo);
  const others = [...seated, ...(room.enAttente ?? [])].filter((pseudo) => pseudo !== room.moi);
  return others.map((pseudo) => ({ pseudo, muted: room.muets?.includes(pseudo) ?? false }));
}
