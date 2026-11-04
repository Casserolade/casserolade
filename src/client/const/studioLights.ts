/**
 * The life of each TV set, in the code: how many spotlights sweep, in which colors, and how many people watch.
 * The sets climb from the poor local studio to the debate on TF1, so the show grows with them.
 */
export interface StudioLook {
  beams: number;
  colors: string[];
  crowd: number;
  flashes: number;
}

export const STUDIO_LOOKS: Record<string, StudioLook> = {
  france3: { beams: 2, colors: ['#9fc4ff'], crowd: 4, flashes: 1 },
  hanouna: { beams: 6, colors: ['#ff3fa4', '#ffe14a', '#3fd8ff'], crowd: 14, flashes: 5 },
  cnews: { beams: 3, colors: ['#ff4a4a', '#ffffff'], crowd: 6, flashes: 2 },
  lcp: { beams: 2, colors: ['#ffd98a'], crowd: 4, flashes: 1 },
  public_senat: { beams: 2, colors: ['#ff9d6e', '#ffe0b0'], crowd: 3, flashes: 1 },
  lci: { beams: 3, colors: ['#5ac8ff', '#ffffff'], crowd: 6, flashes: 2 },
  bfm: { beams: 4, colors: ['#3f7bff', '#ff3f5e'], crowd: 10, flashes: 3 },
  c_a_vous: { beams: 3, colors: ['#ffc46e', '#ffe9b8'], crowd: 8, flashes: 2 },
  quotidien: { beams: 5, colors: ['#ffd23f', '#ff5a3f'], crowd: 14, flashes: 4 },
  france2_dimanche: { beams: 3, colors: ['#7aa8ff', '#ffffff'], crowd: 6, flashes: 2 },
  grand_oral: { beams: 5, colors: ['#3f7bff', '#ffffff'], crowd: 12, flashes: 4 },
  france2_prime: { beams: 6, colors: ['#ff4a4a', '#ffffff', '#3f7bff'], crowd: 16, flashes: 5 },
  tf1_20h: { beams: 5, colors: ['#5aa0ff', '#ffffff'], crowd: 12, flashes: 4 },
  tf1_second_tour: { beams: 8, colors: ['#ff3f4a', '#ffffff', '#3f6bff'], crowd: 20, flashes: 8 },
};

export const DEFAULT_STUDIO_LOOK: StudioLook = { beams: 3, colors: ['#ffffff'], crowd: 6, flashes: 2 };
