// Positions inside a character rig, whose origin is between the feet. Atlas pixels times these scales.
export const RIG_LAYOUT = {
  headScale: 0.72,
  bodyScale: 0.45,
  bodyWidth: 320,
  bodyHeight: 300,
  neckOverlap: 44,
  jawMaxDrop: 44,
  jawMaxTilt: 0.05,
  starCount: 4,
  starOrbitX: 118,
  starOrbitY: 26,
  starScale: 0.42,
  starSpinPerSecond: 3,
};

// Width of each drawn eye relative to the real eye it covers.
export const EYE_SCALES: Record<string, number> = {
  croix: 1.8,
  exorbites: 2.5,
  larmes: 1.8,
};
