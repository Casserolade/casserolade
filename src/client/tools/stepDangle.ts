export interface DangleState {
  /** Tilt of the puppet, in degrees: it hangs behind the movement. */
  angle: number;
  velocity: number;
  /** How much it was shaken lately. Each sharp change of direction adds to it. */
  energy: number;
  isShaken: boolean;
  lastDirectionX: number;
  lastDirectionY: number;
}

export const REST_DANGLE: DangleState = { angle: 0, velocity: 0, energy: 0, isShaken: false, lastDirectionX: 0, lastDirectionY: 0 };

const TILT_PER_SPEED = 0.04;
const MAX_TILT = 60;
const STIFFNESS = 80;
const DAMPING = 5;
const FAST_SPEED = 350;
const ENERGY_DECAY_PER_SECOND = 0.9;
const MAX_ENERGY = 4.5;
const SHAKEN_FROM = 3;
const SHAKEN_UNTIL = 0.6;

function reversed(previous: number, speed: number): { reversal: boolean; direction: number } {
  if (Math.abs(speed) < FAST_SPEED) return { reversal: false, direction: previous };
  const direction = Math.sign(speed);
  return { reversal: previous !== 0 && direction !== previous, direction };
}

/** One moment of a puppet held by the head: it swings like a pendulum, and too much shaking knocks it out. */
export function stepDangle(state: DangleState, speedX: number, speedY: number, seconds: number): DangleState {
  const target = Math.max(-MAX_TILT, Math.min(MAX_TILT, -speedX * TILT_PER_SPEED));
  const velocity = state.velocity + ((target - state.angle) * STIFFNESS - state.velocity * DAMPING) * seconds;
  const horizontal = reversed(state.lastDirectionX, speedX);
  const vertical = reversed(state.lastDirectionY, speedY);
  const hits = Number(horizontal.reversal) + Number(vertical.reversal);
  const energy = Math.min(MAX_ENERGY, Math.max(0, state.energy + hits - ENERGY_DECAY_PER_SECOND * seconds));
  return {
    angle: state.angle + velocity * seconds,
    velocity,
    energy,
    isShaken: state.isShaken ? energy > SHAKEN_UNTIL : energy >= SHAKEN_FROM,
    lastDirectionX: horizontal.direction,
    lastDirectionY: vertical.direction,
  };
}
