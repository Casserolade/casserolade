import { NOM_SALON_LONGUEUR } from '#src/protocol/publicRooms.ts';

/** The name of a public room nobody named. */
const NAMELESS_ROOM = 'Table ouverte';

/**
 * The name a public room takes when its host types none: « Chez » and the host's pseudo, or a plain name for a host
 * without one.
 */
export function defaultRoomName(pseudo: string): string {
  const host = pseudo.trim();
  return host ? `Chez ${host}`.slice(0, NOM_SALON_LONGUEUR).trim() : NAMELESS_ROOM;
}
