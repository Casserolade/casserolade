import type { SalonPublic } from '#src/protocol/publicRooms.ts';

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function readRoom(value: unknown): SalonPublic | null {
  if (!value || typeof value !== 'object') return null;
  const { code, nom, hote, joueurs, places, manche, nouveau } = value as Record<string, unknown>;
  if (typeof code !== 'string' || typeof nom !== 'string' || typeof hote !== 'string') return null;
  if (!code || !nom || !isCount(joueurs) || !isCount(places)) return null;
  return { code, nom, hote, joueurs, places, manche: isCount(manche) ? manche : null, ...(nouveau === true ? { nouveau: true as const } : {}) };
}

/** The server's answer to GET /salons, checked: the rooms that read well, null when it is not a list at all. */
export function readPublicRooms(data: unknown): SalonPublic[] | null {
  if (!Array.isArray(data)) return null;
  return data.map(readRoom).filter((room) => room !== null);
}
