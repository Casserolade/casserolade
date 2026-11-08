/** A pose of the paper body: each piece's turn about its joint, in degrees, and how the whole figure sits. */
export interface PoseShape {
  armNear: number;
  armFar: number;
  legNear: number;
  legFar: number;
  head: number;
  /** In puppet units: down when positive. */
  figureY: number;
  figureRotation: number;
}

const STANDING: PoseShape = { armNear: 0, armFar: 0, legNear: 0, legFar: 0, head: 0, figureY: 0, figureRotation: 0 };

/**
 * The poses held until the next one. The near arm is on the puppet's right, the far arm on its left: raising the near
 * arm turns it backwards (negative), raising the far one forwards. Waving, clapping and dancing move from these.
 */
export const CUTSCENE_POSES: Record<string, PoseShape> = {
  debout: STANDING,
  assis: { ...STANDING, armNear: 25, armFar: -25, legNear: -80, legFar: -80, figureY: 50, figureRotation: -6 },
  bras_leves: { ...STANDING, armNear: -150, armFar: 150 },
  bras_croises: { ...STANDING, armNear: 70, armFar: -70 },
  montre: { ...STANDING, armNear: -95 },
  poing_leve: { ...STANDING, armNear: -165 },
  mains_sur_la_tete: { ...STANDING, armNear: -168, armFar: 168, head: -6 },
  tete_basse: { ...STANDING, armNear: 6, armFar: -6, head: 20, figureY: 8 },
  penche: { ...STANDING, armNear: -20, armFar: 20, figureRotation: 14 },
  a_genoux: { ...STANDING, legNear: 75, legFar: 75, figureY: 60, armNear: -30, armFar: 30 },
  allonge: STANDING,
  salue: { ...STANDING, armNear: -150 },
  applaudit: { ...STANDING, armNear: 45, armFar: -45 },
  danse: { ...STANDING, armNear: -120, armFar: 40 },
};
