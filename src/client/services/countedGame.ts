const COUNTED_KEY = 'casserolade.partie-comptee';

/**
 * An online game counts once for the achievements, though the server tells its result again to whoever reloads the
 * page or reconnects: this tab remembers the last game it counted, until the next one starts.
 */
export function wasCounted(game: string): boolean {
  try {
    return sessionStorage.getItem(COUNTED_KEY) === game;
  } catch {
    return false;
  }
}

export function markCounted(game: string): void {
  try {
    sessionStorage.setItem(COUNTED_KEY, game);
  } catch (error) {
    console.error('Could not remember the game counted', error);
  }
}

export function forgetCounted(): void {
  try {
    sessionStorage.removeItem(COUNTED_KEY);
  } catch (error) {
    console.error('Could not forget the game counted', error);
  }
}
