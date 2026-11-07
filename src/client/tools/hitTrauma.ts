/** Under this strength (hitStrength), a blow does not move the table. */
const QUIET_BELOW = 0.85;
const PER_STRENGTH = 0.5;
const MOST = 0.7;

/** How much a blow of this strength (hitStrength: 0.6 a scratch, 2 a knockout) shakes the table, from 0 to 1. */
export function hitTrauma(strength: number): number {
  return Math.min(MOST, Math.max(0, (strength - QUIET_BELOW) * PER_STRENGTH));
}
