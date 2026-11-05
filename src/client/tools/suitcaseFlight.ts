export interface SuitcaseFlight {
  /** Where it leaves from, on the screen: the middle of the hand that throws it. */
  x: number;
  y: number;
  /** Where it lands, from there: the middle of the link. */
  dx: number;
  dy: number;
  /** How high the arc rises over the straight line, in pixels. */
  lift: number;
  seconds: number;
}

/** A short toss still arcs; a long one arcs higher. */
const MIN_LIFT = 70;
const LIFT_PER_PIXEL = 0.2;
const MIN_SECONDS = 0.45;
const MAX_SECONDS = 0.95;
const PIXELS_PER_SECOND = 1400;

/** The arc of the suitcase of banknotes, from the reporter's hand into the Ko-fi link. */
export function suitcaseFlight(from: { left: number; top: number; width: number; height: number }, to: { left: number; top: number; width: number; height: number }): SuitcaseFlight {
  const x = from.left + from.width / 2;
  const y = from.top + from.height / 2;
  const dx = to.left + to.width / 2 - x;
  const dy = to.top + to.height / 2 - y;
  const seconds = Math.min(MAX_SECONDS, MIN_SECONDS + Math.hypot(dx, dy) / PIXELS_PER_SECOND);
  return { x, y, dx, dy, lift: MIN_LIFT + LIFT_PER_PIXEL * Math.abs(dx), seconds };
}
