import { smoothNoise } from '#src/client/tools/smoothNoise.ts';

/** How fast the table wobbles, in noise steps per second: a shake, not a buzz. */
const WOBBLES_PER_SECOND = 22;

export interface ShakeOffset {
  x: number;
  y: number;
  rotation: number;
}

/**
 * Where the shaken table stands at `time` (seconds), from its trauma (0 to 1), as in « juice it or lose it » and
 * Eiserloh's talk: the trauma is squared, so that small knocks barely move it and the big ones throw it about.
 * `maxOffset` in pixels, `maxAngle` in radians, both reached at a trauma of 1.
 */
export function shakeOffset(trauma: number, time: number, maxOffset: number, maxAngle: number): ShakeOffset {
  const amount = Math.min(1, Math.max(0, trauma)) ** 2;
  const step = time * WOBBLES_PER_SECOND;
  return {
    x: maxOffset * amount * smoothNoise(step, 1),
    y: maxOffset * amount * smoothNoise(step, 2),
    rotation: maxAngle * amount * smoothNoise(step, 3),
  };
}
