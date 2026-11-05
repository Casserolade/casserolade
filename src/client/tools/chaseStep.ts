export interface Chaser {
  x: number;
  y: number;
  /** -1 runs toward the left, 1 toward the right. */
  facing: number;
  running: boolean;
  /** Pixels per second at the last step: its strides quicken with it. */
  speed: number;
}

/** Close enough: it stops and catches its breath. */
const NEAR = 36;
/** Standing, it sets off again only once the target is this far: no stop-and-go when the mouse is close. */
const SET_OFF = 90;
/** It turns round only for a real change of direction, not for a few pixels. */
const TURN = 24;
/** It catches up faster the further behind it is, from a trot to a ridiculous sprint, in pixels per second. */
const MIN_SPEED = 280;
const MAX_SPEED = 600;
const CATCH_UP = 1.6;

/** One step of the chase toward `target`, over `seconds`: where it is now, which way it faces, whether it runs. */
export function chaseStep(chaser: Chaser, target: { x: number; y: number }, seconds: number): Chaser {
  const dx = target.x - chaser.x;
  const dy = target.y - chaser.y;
  const distance = Math.hypot(dx, dy);
  if (distance < (chaser.running ? NEAR : SET_OFF)) return { ...chaser, running: false, speed: 0 };
  const speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, distance * CATCH_UP));
  const step = Math.min(distance - NEAR / 2, speed * seconds);
  const facing = Math.abs(dx) > TURN ? Math.sign(dx) : chaser.facing;
  return { x: chaser.x + (dx / distance) * step, y: chaser.y + (dy / distance) * step, facing, running: true, speed };
}
