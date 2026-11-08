import type { DecorArt } from '#src/client/cutscenes/cutsceneArt.ts';
import type { Style } from '#src/data/histoire/cinematique.ts';

/** The layers of a cutscene, from the sets at the back to the flash in front. */
export interface CutsceneStage {
  root: HTMLElement;
  /** Everything the camera frames. */
  camera: HTMLElement;
  /** Inside the camera: what a shock shakes. */
  shaker: HTMLElement;
  /** The sets behind the puppets, one per scene. */
  backs: HTMLElement;
  props: HTMLElement;
  actors: HTMLElement;
  /** Props that stand in front of the puppets: a lectern, a security gate, a ballot box. */
  frontProps: HTMLElement;
  /** The sets' foregrounds, one per scene that has one. */
  fronts: HTMLElement;
  /** The speech bubbles, over everything the camera frames. */
  bubbles: HTMLElement;
  /** Above the camera: captions, hosts, the crowd, titles, the ticker. */
  overlay: HTMLElement;
  /** Silent film: the grain that flickers. */
  grain: HTMLElement | null;
  flash: HTMLElement;
  confetti: HTMLElement;
}

/** One scene's set: its picture behind the puppets, and its foreground when it has one. Both hidden at first. */
export interface StageDecor {
  back: HTMLElement;
  front: HTMLElement | null;
}

function layer(className: string, parent: HTMLElement): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  parent.append(element);
  return element;
}

/** The empty stage of a cutscene, in its container: room for the sets, the puppets and the layers above. */
export function createStage(container: HTMLElement, style: Style): CutsceneStage {
  const root = layer(`cs-stage cs-${style}`, container);
  const camera = layer('cs-camera', root);
  const shaker = layer('cs-layer', camera);
  const backs = layer('cs-layer', shaker);
  const props = layer('cs-layer', shaker);
  const actors = layer('cs-layer cs-actors', shaker);
  const frontProps = layer('cs-layer', shaker);
  const fronts = layer('cs-layer', shaker);
  const bubbles = layer('cs-layer', shaker);
  const overlay = layer('cs-layer', root);
  const grain = style === 'muet' ? layer('cs-grain', root) : null;
  if (style === 'jt') layer('cs-live', root).textContent = 'EN DIRECT';
  const confetti = layer('cs-confetti', root);
  const flash = layer('cs-flash', root);
  return { root, camera, shaker, backs, props, actors, frontProps, fronts, bubbles, overlay, grain, flash, confetti };
}

/** A scene's set on the stage. Without a picture: a studio in the dark. */
export function addDecor(stage: CutsceneStage, art: DecorArt): StageDecor {
  const back = layer('cs-decor', stage.backs);
  if (art.back) back.style.backgroundImage = `url("${art.back}")`;
  else back.classList.add('cs-fallback');
  const front = art.front ? layer('cs-front', stage.fronts) : null;
  if (front && art.front) front.style.backgroundImage = `url("${art.front}")`;
  return { back, front };
}
