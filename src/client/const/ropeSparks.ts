/**
 * The sparks that fly off the burning fuse (RecruitRope.vue): their angle from straight up, in degrees,
 * how far they fly, in table pixels, and when each one leaves, as a share of the spark cycle.
 */
export const ROPE_SPARKS = [
  { angle: -70, distance: 58, delay: 0 },
  { angle: -35, distance: 74, delay: 0.42 },
  { angle: -8, distance: 66, delay: 0.17 },
  { angle: 18, distance: 80, delay: 0.63 },
  { angle: 44, distance: 60, delay: 0.29 },
  { angle: 72, distance: 50, delay: 0.81 },
  { angle: -52, distance: 44, delay: 0.55 },
  { angle: 30, distance: 46, delay: 0.92 },
] as const;
