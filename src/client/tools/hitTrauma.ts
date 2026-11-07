/** Under this strength (hitStrength), a blow does not move the table. */
const QUIET_BELOW = 0.7;
const PER_STRENGTH = 0.6;
const MOST = 0.8;

/**
 * How much a blow of this strength (hitStrength: 0.6 a scratch, 2 a knockout) shakes the table, from 0 to 1. The shake
 * squares it (shakeOffset): a small blow barely stirs the table, a knockout throws it about.
 */
export function hitTrauma(strength: number): number {
  return Math.min(MOST, Math.max(0, (strength - QUIET_BELOW) * PER_STRENGTH));
}
