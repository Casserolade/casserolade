const SILENCE = 0.035;
const LOUD = 0.11;

/** Turns a sound level (0 to 1) into a clapper position: closed, half open or wide open. */
export function jawOpeningFromLevel(level) {
  if (level < SILENCE) return 0;
  if (level < LOUD) return 0.55;
  return 1;
}
