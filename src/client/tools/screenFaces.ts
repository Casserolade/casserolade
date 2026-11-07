/**
 * The faces one screen of the set shows: with as many candidates as screens or more, each screen keeps its own (the
 * face-to-face of the second round); otherwise every screen zaps between them all.
 */
export function screenFaces<Face>(faces: Face[], screens: number, index: number): Face[] {
  if (screens > 1 && faces.length >= screens) return [faces[index]];
  return faces;
}
