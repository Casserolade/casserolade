/** A scratch freezes the blow for two frames, a knockout for six. */
const SHORTEST = 0.035;
const LONGEST = 0.1;
const SCRATCH = 0.6;
const KNOCKOUT = 2;

/**
 * The hit-stop: how long the stage freezes on the contact of a blow of this strength (hitStrength), in seconds of the
 * combat. It is what makes a blow feel heavy; too long, and the combat stutters.
 */
export function hitStopSeconds(strength: number): number {
  const share = Math.min(1, Math.max(0, (strength - SCRATCH) / (KNOCKOUT - SCRATCH)));
  return SHORTEST + (LONGEST - SHORTEST) * share;
}
