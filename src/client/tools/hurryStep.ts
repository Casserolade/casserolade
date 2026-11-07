/** What a tap does to the combat show, from where it stands. */
export type HurryStep = 'end-speech' | 'speed-up' | 'skip-fight' | 'show-result' | 'close' | null;

export interface CombatShowMoment {
  /** The fight and its speeches have all played. */
  finished: boolean;
  /** A Célébration or a Droit de réponse is speaking. */
  speaking: boolean;
  resultShown: boolean;
  /** The player has seen it all: the show only waits for the next round. */
  closed: boolean;
  speed: number;
  fastest: number;
}

/**
 * A tap hurries the combat along, one notch at a time: a speech ends at once, the fight speeds up to the fastest pace
 * and then jumps to its end, the result comes at once and then gives way to the next round.
 */
export function hurryStep({ finished, speaking, resultShown, closed, speed, fastest }: CombatShowMoment): HurryStep {
  if (closed) return null;
  if (speaking) return 'end-speech';
  if (!finished) return speed < fastest ? 'speed-up' : 'skip-fight';
  return resultShown ? 'close' : 'show-result';
}
