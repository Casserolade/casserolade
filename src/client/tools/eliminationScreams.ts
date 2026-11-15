/** A critical blow: it takes at least this many polls more than the hero had left. */
const CRITICAL_OVERKILL = 8;
/** Even then, the scream is only heard once in a while. */
const SCREAM_CHANCE = 0.5;

/**
 * Whether the Wilhelm scream is heard as a hero is eliminated: only for a human player, on a critical blow (`after`,
 * the polls the blow leaves, far below zero), and once in a while (`roll`, a number in [0, 1)).
 */
export function eliminationScreams(blow: { human: boolean; after: number }, roll: number): boolean {
  return blow.human && blow.after <= -CRITICAL_OVERKILL && roll < SCREAM_CHANCE;
}
