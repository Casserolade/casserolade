import { Cutscene } from '#src/client/cutscenes/createCutscene.ts';
import type { CutsceneOptions } from '#src/client/cutscenes/createCutscene.ts';
import type { PlayableCutscene } from '#src/client/cutscenes/PlayableCutscene.ts';
import type { Scene } from '#src/data/histoire/cinematique.ts';

/**
 * The one way a career cutscene gets on stage: puppets built from their data, or a HyperFrames episode, loaded the first
 * time one plays. Either way the player gets the same playable timeline.
 */
export async function createPlayableCutscene(container: HTMLElement, scene: Scene, options: CutsceneOptions): Promise<PlayableCutscene> {
  if (!('episode' in scene)) return new Cutscene(container, scene, options);
  const { ComposedCutscene } = await import('#src/client/cutscenes/composed/ComposedCutscene.ts');
  return ComposedCutscene.load(container, scene);
}
