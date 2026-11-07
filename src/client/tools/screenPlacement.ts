import type { StudioScreenSpot } from '#src/client/const/studioScreens.ts';

/** The set's picture is this big, around the table: its middle is the screen's middle. */
const SET_MIDDLE = { x: 1280, y: 720 };

/**
 * Where a screen of the set stands, in CSS: from its place in the set's pixels to the page, through --k (pixels of the
 * page per pixel of the set, GameTable.vue), so that it stays on its sign whatever the window's shape.
 */
export function screenPlacement(spot: StudioScreenSpot): Record<string, string> {
  return {
    left: `calc(50% + ${spot.x - SET_MIDDLE.x} * var(--k))`,
    top: `calc(50% + ${spot.y - SET_MIDDLE.y} * var(--k))`,
    '--screen-width': `calc(${spot.width} * var(--k))`,
    '--turn': `${spot.turn}deg`,
  };
}
