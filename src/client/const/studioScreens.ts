/**
 * The television screens of each TV set, placed over its own signs (the set's picture is 2560 × 1440, the table's
 * 1920 × 1080 in its middle): the candidates' faces play on them. The channel's logo, top left, stays in sight; the
 * screens take the top right corner, in the band between the top of the table and its carpet, clear of the host's desk
 * and of the sound buttons. `x`, `y`: the screen's middle, `width` its width, in the set's pixels; `turn` how far it
 * faces the middle, in degrees.
 */
export interface StudioScreenSpot {
  x: number;
  y: number;
  width: number;
  turn: number;
}

/** Most sets: one screen hung top right, turned a little toward the table. */
const TOP_RIGHT: StudioScreenSpot = { x: 1915, y: 268, width: 236, turn: -16 };

export const STUDIO_SCREENS: Record<string, StudioScreenSpot[]> = {
  // The local studio: a small old screen.
  france3: [{ x: 1890, y: 268, width: 200, turn: -10 }],
  hanouna: [{ x: 1900, y: 266, width: 244, turn: -18 }],
  cnews: [{ x: 1915, y: 262, width: 240, turn: -14 }],
  lcp: [TOP_RIGHT],
  public_senat: [{ x: 1890, y: 268, width: 230, turn: -14 }],
  lci: [TOP_RIGHT],
  bfm: [TOP_RIGHT],
  c_a_vous: [TOP_RIGHT],
  quotidien: [TOP_RIGHT],
  france2_dimanche: [TOP_RIGHT],
  grand_oral: [TOP_RIGHT],
  france2_prime: [{ x: 1930, y: 270, width: 236, turn: -16 }],
  tf1_20h: [{ x: 1945, y: 262, width: 236, turn: -12 }],
  // The debate of the second round: the two « temps de parole » boards are the two finalists' screens.
  tf1_second_tour: [{ x: 620, y: 268, width: 250, turn: 16 }, { x: 1950, y: 268, width: 250, turn: -16 }],
};

export const DEFAULT_STUDIO_SCREENS: StudioScreenSpot[] = [TOP_RIGHT];
