export interface ChaseMood {
  /** Seconds of running without a stop. */
  runningFor: number;
  /** Seconds standing still. */
  idleFor: number;
  sitting: boolean;
  sweating: boolean;
}

/** Running this long, it sweats; stopping after it, it flops down. */
const SWEAT_AFTER = 1.5;
const FLOP_AFTER = 1.6;
/** Standing this long with nothing to chase, it sits down too. */
const BORED_AFTER = 4;

export const RESTED: ChaseMood = { runningFor: 0, idleFor: 0, sitting: false, sweating: false };

/** How tired the reporter is after `seconds` more of running or of standing: it sweats, then, pouf, it sits. */
export function chaseMood(mood: ChaseMood, running: boolean, seconds: number): ChaseMood {
  if (running) {
    const runningFor = mood.runningFor + seconds;
    return { runningFor, idleFor: 0, sitting: false, sweating: runningFor > SWEAT_AFTER };
  }
  const idleFor = mood.idleFor + seconds;
  const sitting = mood.sitting || mood.runningFor > FLOP_AFTER || idleFor > BORED_AFTER;
  return { runningFor: 0, idleFor, sitting, sweating: mood.sweating && idleFor < 1.5 };
}
