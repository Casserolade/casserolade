import { readPublicRooms } from '#src/client/tools/readPublicRooms.ts';
import { PUBLIC_ROOMS_PATH } from '#src/protocol/publicRooms.ts';
import type { SalonPublic } from '#src/protocol/publicRooms.ts';

/** The public rooms, for the home page; null when the server does not answer (Vite alone, no network). */
export async function fetchPublicRooms(): Promise<SalonPublic[] | null> {
  try {
    const response = await fetch(PUBLIC_ROOMS_PATH, { cache: 'no-store' });
    if (!response.ok) return null;
    return readPublicRooms(await response.json());
  } catch {
    return null;
  }
}
