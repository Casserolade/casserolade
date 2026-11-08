import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { CARD_BY_ID } from '#src/data/cards.ts';
import type { Expression, Role } from '#src/data/histoire/cinematique.ts';

/** Stage pixels per unit of the paper puppet: a puppet stands about 470 px tall on the 1080 px stage. */
export const PUPPET_UNIT = 1.2;
/** The puppet's box, in its own units (CARD_LAYOUT: 512 wide, the feet at 434). */
const BOX_WIDTH = 512;
const BOX_HEIGHT = 434;
const PLACARD_PREFIX = 'pancarte:';

/**
 * A puppet of a cutscene, its whole body cut into paper pieces, South Park style (as the home page's reporter): each
 * piece turns about its joint. Wrapped from the outside in, each wrapper owning its own moves.
 */
export interface CutsceneActor {
  role: string;
  personnage: string;
  /** Where it stands: entrances, exits, flights, depth (`x`, `y`, `scale`). */
  root: HTMLElement;
  /** Which way it faces (`scaleX`). */
  facing: HTMLElement;
  /** Its moves on the spot: jumps, falls, spins, shivers. */
  hop: HTMLElement;
  /** Its sway at twelve drawings a second. */
  sway: HTMLElement;
  /** The body: leaning and bouncing as it runs, its look (a hologram, a ghost). */
  figure: HTMLElement;
  torso: HTMLElement;
  armNear: HTMLElement;
  armFar: HTMLElement;
  legNear: HTMLElement;
  legFar: HTMLElement;
  head: HTMLElement;
  jaw: HTMLElement | null;
  /** In its near hand: what it holds. */
  hand: HTMLElement;
  /** Inside the hand, what it holds by way of props: turned back when it faces left, so that writing reads right. */
  grip: HTMLElement;
  width: number;
  height: number;
}

/** The camp whose paper body the puppet wears: its card's, or the civil society's. */
function campOf(personnage: string) {
  return CARD_BY_ID[personnage]?.camp ?? 'civile';
}

/** The CSS variables of a puppet showing one of its faces, with its costume when it has one. */
export function faceVariables(manifest: GameManifest, role: Role, face: Expression = 'base'): Record<string, string> {
  const personnage = role.personnage.startsWith(PLACARD_PREFIX) ? '' : role.personnage;
  const style = puppetStyle(manifest, personnage, campOf(personnage), face === 'base' ? null : face);
  if (role.costume && manifest.corps[role.costume]) style['--body-image'] = cssImage(manifest.corps[role.costume]);
  return style;
}

function part(className: string, parent: HTMLElement): HTMLElement {
  const element = document.createElement('span');
  element.className = className;
  parent.append(element);
  return element;
}

/** A piece of the suit: the whole body's picture, cut down to its part. */
function piece(className: string, parent: HTMLElement): HTMLElement {
  const element = part(`cs-piece ${className}`, parent);
  part('cs-cut', element);
  return element;
}

/** A puppet of the cast, off stage until the timeline brings it in. */
export function createActor(layer: HTMLElement, role: Role, manifest: GameManifest, unit = PUPPET_UNIT * (role.taille ?? 1)): CutsceneActor {
  const width = BOX_WIDTH * unit;
  const height = BOX_HEIGHT * unit;
  const root = document.createElement('div');
  root.className = 'cs-actor';
  root.dataset.role = role.role;
  root.style.setProperty('--actor-w', `${width}px`);
  root.style.setProperty('--actor-h', `${height}px`);
  const facing = part('cs-facing', root);
  const hop = part('cs-hop', facing);
  const sway = part('cs-sway', hop);
  const figure = part('cs-figure', sway);
  figure.style.setProperty('--u', `${unit}px`);
  for (const [name, value] of Object.entries(faceVariables(manifest, role))) figure.style.setProperty(name, value);
  // The far limbs first, behind the torso; the head over the body; the near arm last, over everything.
  const legFar = piece('cs-leg-far', figure);
  const armFar = piece('cs-arm-far', figure);
  const torso = piece('cs-torso', figure);
  const legNear = piece('cs-leg-near', figure);
  const head = part('cs-head', figure);
  let jaw: HTMLElement | null = null;
  if (role.personnage.startsWith(PLACARD_PREFIX)) {
    // No photo: a cardboard sign with the name, where the head would be.
    for (const [name, value] of Object.entries({ '--head-left': '116', '--head-top': '70', '--head-width': '280', '--head-height': '250' })) figure.style.setProperty(name, value);
    part('cs-placard', head).textContent = role.personnage.slice(PLACARD_PREFIX.length);
  } else {
    part('cs-head-piece', head);
    jaw = part('cs-jaw', head);
  }
  const armNear = piece('cs-arm-near', figure);
  const hand = part('cs-hand', armNear);
  const grip = part('cs-grip', hand);
  layer.append(root);
  return { role: role.role, personnage: role.personnage, root, facing, hop, sway, figure, torso, armNear, armFar, legNear, legFar, head, jaw, hand, grip, width, height };
}
