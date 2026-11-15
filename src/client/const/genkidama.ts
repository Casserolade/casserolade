/**
 * The genkidama, the blow that eliminates a hero: its three beats, in seconds of combat. The set charges the ball,
 * the ball flies, the dust settles. Read by the stage that draws it and by the show that waits for it.
 */
export const GENKIDAMA = { charge: 1.35, flight: 0.38, settle: 0.7 };

/** From its first vote to its landing, in milliseconds at normal speed. */
export const GENKIDAMA_LANDS_MS = (GENKIDAMA.charge + GENKIDAMA.flight) * 1000;
