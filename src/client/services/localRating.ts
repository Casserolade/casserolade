import { browserStorage, read, write } from '#src/client/services/localProfile.ts';
import type { ProfileStorage } from '#src/client/services/localProfile.ts';

const RATING_KEY = 'casserolade.cote';

/**
 * The player's rating, as the server last told it: kept to show the rank on the home page, before any connection.
 * Only a copy: the server holds the rating, and nothing here is ever sent back to it. Null before a first rated game.
 */
export function savedRating(storage: ProfileStorage | null = browserStorage()): number | null {
  const stored = read(storage, RATING_KEY);
  const rating = stored === null ? Number.NaN : Number(stored);
  return Number.isInteger(rating) && rating >= 0 ? rating : null;
}

export function saveRating(rating: number, storage: ProfileStorage | null = browserStorage()): void {
  write(storage, RATING_KEY, String(rating));
}
