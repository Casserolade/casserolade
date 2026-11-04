const MS_PER_CHARACTER = 45;
const MIN_MS = 2000;
const MAX_MS = 6000;

/** How long a text stays on screen before the game moves on by itself. */
export function readingDelayMs(text: string): number {
  return Math.min(MAX_MS, Math.max(MIN_MS, text.length * MS_PER_CHARACTER));
}
