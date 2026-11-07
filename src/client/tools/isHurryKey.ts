/** Space, Enter and the right arrow: « next », as in a slideshow. */
const HURRY_KEYS = new Set([' ', 'Enter', 'ArrowRight']);

/** Whether a key pressed on the table hurries the show along (a combat, a Célébration, the end of turn). */
export function isHurryKey(key: string): boolean {
  return HURRY_KEYS.has(key);
}
