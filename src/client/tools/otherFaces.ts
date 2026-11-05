import type { CharacterArt } from '#src/client/const/gameManifest.ts';
import type { FaceTextures } from '#src/client/pixi/loadCombatTextures.ts';
import type { RigFace } from '#src/client/pixi/characterRig.ts';

/** A character's other faces, each with its images and its own anchors; a face missing either is left out. */
export function otherFaces(art: CharacterArt | undefined, textures: Record<string, FaceTextures>): Record<string, RigFace> {
  const faces = Object.entries(art?.visages ?? {}).flatMap(([name, faceArt]) => {
    const face = textures[name];
    return face ? [[name, { art: faceArt, head: face.head, jaw: face.jaw }] as const] : [];
  });
  return Object.fromEntries(faces);
}
