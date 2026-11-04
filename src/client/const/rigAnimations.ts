// Rig animations are data: keyframes sampled at 12 fps, so the motion is choppy on purpose.
// x and y are in card pixels. In "attack", x is a fraction of the distance to the target.
export const RIG_ANIMATION_FPS = 12;

export interface RigKeyframe {
  at: number;
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface RigAnimation {
  duration: number;
  loop?: boolean;
  hold?: boolean;
  impactAt?: number;
  keyframes: RigKeyframe[];
}

export type RigAnimationName = 'idle' | 'attack' | 'hit' | 'flattened' | 'comeback';

export const RIG_ANIMATIONS: Record<RigAnimationName, RigAnimation> = {
  idle: {
    loop: true,
    duration: 1,
    keyframes: [
      { at: 0, y: 0, rotation: -0.025, scaleX: 1, scaleY: 1 },
      { at: 0.5, y: -5, rotation: 0.025, scaleX: 0.98, scaleY: 1.03 },
      { at: 1, y: 0, rotation: -0.025, scaleX: 1, scaleY: 1 },
    ],
  },
  attack: {
    duration: 0.75,
    impactAt: 0.34,
    keyframes: [
      { at: 0, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      { at: 0.16, x: -0.06, y: 6, rotation: -0.2, scaleX: 1.14, scaleY: 0.84 },
      { at: 0.25, x: 0.5, y: -70, rotation: 0.2, scaleX: 0.9, scaleY: 1.12 },
      { at: 0.34, x: 1, y: -10, rotation: 0.42, scaleX: 1.2, scaleY: 0.82 },
      { at: 0.5, x: 0.55, y: -46, rotation: 0.1, scaleX: 1, scaleY: 1 },
      { at: 0.75, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    ],
  },
  hit: {
    duration: 0.67,
    keyframes: [
      { at: 0, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      { at: 0.08, x: -26, y: 4, rotation: -0.34, scaleX: 1.2, scaleY: 0.8 },
      { at: 0.25, x: 14, y: 0, rotation: 0.2, scaleX: 0.92, scaleY: 1.1 },
      { at: 0.42, x: -6, y: 0, rotation: -0.1, scaleX: 1, scaleY: 1 },
      { at: 0.67, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    ],
  },
  flattened: {
    duration: 0.25,
    hold: true,
    keyframes: [
      { at: 0, x: 0, y: 0, rotation: 0, scaleX: 1.5, scaleY: 0.14 },
      { at: 0.09, x: 0, y: 0, rotation: 0, scaleX: 1.34, scaleY: 0.2 },
      { at: 0.25, x: 0, y: 0, rotation: 0, scaleX: 1.4, scaleY: 0.17 },
    ],
  },
  comeback: {
    duration: 0.84,
    keyframes: [
      { at: 0, x: 0, y: 0, rotation: 0, scaleX: 1.4, scaleY: 0.17 },
      { at: 0.25, x: 0, y: 0, rotation: -0.1, scaleX: 0.8, scaleY: 1.24 },
      { at: 0.42, x: 0, y: -40, rotation: 0.1, scaleX: 0.96, scaleY: 1.06 },
      { at: 0.58, x: 0, y: 0, rotation: -0.05, scaleX: 1.12, scaleY: 0.88 },
      { at: 0.84, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    ],
  },
};
