import { ref } from 'vue';
import { REST_DANGLE, stepDangle } from '#src/client/tools/stepDangle.ts';

const MAX_STEP_SECONDS = 0.05;
/** The pendulum swings far; a card in the hand only tilts. */
const SWING = 0.4;

/**
 * The thing being carried tilts with the pointer's movements, like a card held between two fingers:
 * it leans into the move, overshoots a little when it stops, and settles. One at a time, on the whole page.
 */
function createCarrySwing() {
  const angle = ref(0);
  let dangle = REST_DANGLE;
  let position = { x: 0, y: 0 };
  let lastPosition = position;
  let lastTime = 0;
  let frame = 0;

  function tick(time: number): void {
    const seconds = Math.min(MAX_STEP_SECONDS, (time - lastTime) / 1000) || MAX_STEP_SECONDS;
    dangle = stepDangle(dangle, (position.x - lastPosition.x) / seconds, (position.y - lastPosition.y) / seconds, seconds);
    angle.value = -dangle.angle * SWING;
    lastPosition = position;
    lastTime = time;
    frame = requestAnimationFrame(tick);
  }

  function start(x: number, y: number): void {
    position = { x, y };
    lastPosition = position;
    dangle = REST_DANGLE;
    angle.value = 0;
    lastTime = performance.now();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  }

  function moveTo(x: number, y: number): void {
    position = { x, y };
  }

  function stop(): void {
    cancelAnimationFrame(frame);
    angle.value = 0;
  }

  return { angle, start, moveTo, stop };
}

export const carrySwing = createCarrySwing();
