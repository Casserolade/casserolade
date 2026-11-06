import type { Zone } from '#src/client/stores/useTableGestures.ts';

/**
 * The phone's zones stand around the board's band, across the whole width: above it the shop (and the bar on top of
 * it), the board on it, the hand below it. A carried card dropped high is sold, low is kept.
 */
export function zoneAroundBand(y: number, band: { top: number; bottom: number }): Zone {
  if (y < band.top) return 'shop';
  return y < band.bottom ? 'board' : 'hand';
}
