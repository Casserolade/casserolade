const MS_PER_CHARACTER = 60;
const MIN_MS = 3000;
const MAX_MS = 12_000;

/** How long a story line stays before the next one may replace it. It blocks nothing, so it can take its time. */
export function storyLineDelayMs(text: string): number {
  return Math.min(MAX_MS, Math.max(MIN_MS, text.length * MS_PER_CHARACTER));
}
