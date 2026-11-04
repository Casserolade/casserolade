const TOKEN_KEY = 'plateau.jeton';

/** True when this tab holds a seat in an online game, to take back after a reload. */
export function hasSavedSeat(): boolean {
  try {
    return sessionStorage.getItem(TOKEN_KEY) !== null;
  } catch {
    return false;
  }
}
