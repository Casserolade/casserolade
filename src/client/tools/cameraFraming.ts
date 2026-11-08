/** The cutscene stage, and how far the camera zooms on a tight shot and on a close-up. */
const STAGE = { width: 1920, height: 1080 };
const TIGHT_SCALE = 1.3;
const CLOSE_UP_SCALE = 1.65;
/** A tight shot looks a little higher than the middle: the faces. */
const TIGHT_LIFT = 70;

export interface Framing {
  scale: number;
  x: number;
  y: number;
}

/**
 * Where the camera stands for a shot, as a scale around the middle of the stage and a shift: the whole stage, a tight
 * shot, or a close-up on a point (a face). The frame never shows past the stage's edges.
 */
export function cameraFraming(shot: 'large' | 'serre' | { x: number; y: number }): Framing {
  if (shot === 'large') return { scale: 1, x: 0, y: 0 };
  const scale = shot === 'serre' ? TIGHT_SCALE : CLOSE_UP_SCALE;
  const target = shot === 'serre' ? { x: STAGE.width / 2, y: STAGE.height / 2 - TIGHT_LIFT } : shot;
  const reachX = ((scale - 1) * STAGE.width) / 2;
  const reachY = ((scale - 1) * STAGE.height) / 2;
  const clamp = (value: number, reach: number) => Math.min(reach, Math.max(-reach, value));
  return {
    scale,
    x: clamp(-scale * (target.x - STAGE.width / 2), reachX),
    y: clamp(-scale * (target.y - STAGE.height / 2), reachY),
  };
}
