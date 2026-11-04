import type { EndOfTurnStep } from '../engine/types.ts';

/** The banner « Fin de tour », before the first effect plays and after the last one. */
export const END_OF_TURN_FRAME_MS = 700;
/** One effect lights up and its numbers change; many effects play faster, the whole stays short. */
const STEP_MS = 650;
const ALL_STEPS_MAX_MS = 4_500;

/** How long each step of the end of turn plays, at normal speed. */
export function endOfTurnStepMs(steps: number): number {
  return steps === 0 ? 0 : Math.min(STEP_MS, ALL_STEPS_MAX_MS / steps);
}

/** The whole end of turn on the table, before the combat opens. Shared: the server waits this long too. */
export function endOfTurnDurationMs(steps: EndOfTurnStep[]): number {
  if (steps.length === 0) return 0;
  return 2 * END_OF_TURN_FRAME_MS + steps.length * endOfTurnStepMs(steps.length);
}
