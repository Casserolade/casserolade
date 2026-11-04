/** The table is drawn for a 1920×1080 screen: one of its pixels, on this screen. */
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export function stageScale(width: number, height: number): number {
  return Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT);
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Where a card of this size comes up beside an anchor: on its right if it fits, else on its left,
 * level with it, and always inside the screen.
 */
export function besideAnchor(anchor: Box, size: { width: number; height: number }, screen: { width: number; height: number }, gap: number): { left: number; top: number } {
  const fitsRight = anchor.right + gap + size.width <= screen.width;
  const left = fitsRight ? anchor.right + gap : Math.max(0, anchor.left - gap - size.width);
  const middle = (anchor.top + anchor.bottom) / 2;
  const top = Math.min(Math.max(gap, middle - size.height / 2), Math.max(gap, screen.height - size.height - gap));
  return { left, top };
}
