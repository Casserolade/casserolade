/** Past this many characters, a bubble wraps on three lines or more (SpeechBubble squares off at the same length). */
const LONG_TEXT = 64;
const BONUS_MS = 500;

/** A long line stays a little longer on screen, to be read to its end. */
export function longTextBonusMs(text: string): number {
  return text.length > LONG_TEXT ? BONUS_MS : 0;
}
