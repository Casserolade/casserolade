/** How wide each sign is next to a digit, in the number font (Bangers writes k and d in capitals). */
const SIGN_WIDTHS = { ',': 0.5, '−': 0.7, '+': 0.8, k: 1.1, M: 1.2, d: 1.05 } as Record<string, number>;
/** Three digits fill a stat badge: a longer number shrinks to fit. */
const FITTING_WIDTH = 3;

/**
 * The size of a stat's number in its badge, from 1 (full size) down: « 999 » keeps the full size, « 1,2k », « 999k »
 * and « 1,5Md » shrink. The same on the table (CSS) and on the combat stage (PixiJS), so that both medallions match.
 */
export function statFontScale(label: string): number {
  const width = [...label].reduce((sum, sign) => sum + (SIGN_WIDTHS[sign] ?? 1), 0);
  return width <= FITTING_WIDTH ? 1 : FITTING_WIDTH / width;
}
