const BASE_MS = 500;
const MAX_MS = 8000;

/** Waits longer after each failed attempt, up to a ceiling. */
export function reconnectDelay(attempt: number): number {
  return Math.min(MAX_MS, BASE_MS * 2 ** attempt);
}
