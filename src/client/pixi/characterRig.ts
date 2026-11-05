import { Container, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import type { CharacterArt } from '#src/client/const/gameManifest.ts';
import { RIG_ANIMATION_FPS, RIG_ANIMATIONS } from '#src/client/const/rigAnimations.ts';
import type { RigAnimation, RigAnimationName } from '#src/client/const/rigAnimations.ts';
import { EYE_SCALES, RIG_LAYOUT } from '#src/client/const/rigLayout.ts';
import { createPlacard, createPlaster, createStars, placeEye } from '#src/client/pixi/rigPieces.ts';
import { samplePose } from '#src/client/tools/samplePose.ts';

const TALK_FRAMES = [0.55, 0, 1, 0.3];
const PLACARD_CHIN: [number, number] = [150, 150];

type FaceArt = Omit<CharacterArt, 'visages'>;

/** One face of the puppet: its cut-out head, its jaw, and where its eyes, mouth and chin are. */
export interface RigFace {
  art: FaceArt;
  head: Texture;
  jaw: Texture;
}

export interface RigParts {
  art: FaceArt | null;
  name: string;
  head: Texture | null;
  jaw: Texture | null;
  /** Its other faces, by name (`rire`, `aie`): shown for a moment, then back to the first one. */
  faces: Record<string, RigFace>;
  body: Texture | null;
  eyes: Record<string, Texture>;
  star: Texture | null;
  plaster: Texture | null;
}

interface PlayOptions {
  reachX?: number;
  reachY?: number;
  onImpact?: (() => void) | null;
  onFinished?: (() => void) | null;
}

/**
 * A paper puppet: tiny body, big head, clapper jaw, optional drawn eyes.
 * Like a South Park cut-out, it may swap faces for a moment (it laughs, it winces) and turn to face the
 * other way, at once, without any in-between: the jerky cut is the joke. It always comes back to its own
 * face, the right way round, so that every card stays easy to recognise.
 * Origin is between the feet. Owns its pose and animation state; call update() on every tick.
 */
export class CharacterRig {
  readonly view = new Container();
  private readonly parts: RigParts;
  private readonly headGroup = new Container();
  private readonly body: Sprite | null = null;
  private readonly jaw: Sprite | null = null;
  private readonly headSprite: Sprite | null = null;
  private readonly ownFace: RigFace | null = null;
  private restingFace: RigFace | null = null;
  private face: RigFace | null = null;
  private faceLeft = 0;
  /** 1 faces the way the photo was taken, -1 the other way. */
  private facing = 1;
  private turnLeft = 0;
  private readonly eyeLeft = new Sprite();
  private readonly eyeRight = new Sprite();
  private readonly plaster: Sprite | null = null;
  private readonly stars: Sprite[] = [];
  private animation: RigAnimation = RIG_ANIMATIONS.idle;
  private animationTime: number;
  private reachX = 0;
  private reachY = 0;
  private impactDone = false;
  private onImpact: (() => void) | null = null;
  private onFinished: (() => void) | null = null;
  private starTime = 0;
  private starsLeft = 0;
  private eyesLeft = 0;
  private shownEyes = 'normal';
  private restingEyes = 'normal';
  private talkLeft = 0;
  private homeX = 0;
  private homeY = 0;

  constructor(parts: RigParts) {
    this.parts = parts;
    this.animationTime = Math.random();
    if (parts.body) {
      this.body = new Sprite(parts.body);
      this.body.anchor.set(0.5, 1);
      this.body.scale.set(RIG_LAYOUT.bodyScale);
      this.view.addChild(this.body);
    }
    if (parts.art && parts.head && parts.jaw) {
      this.ownFace = { art: parts.art, head: parts.head, jaw: parts.jaw };
      this.restingFace = this.ownFace;
      this.face = this.restingFace;
      this.headSprite = new Sprite(parts.head);
      this.jaw = new Sprite(parts.jaw);
      this.jaw.pivot.set(parts.art.pieces.machoire.pivot[0], parts.art.pieces.machoire.pivot[1]);
      this.headGroup.addChild(this.headSprite, this.jaw);
      this.plaster = createPlaster(parts.plaster, parts.art);
      this.headGroup.addChild(this.eyeLeft, this.eyeRight);
      if (this.plaster) this.headGroup.addChild(this.plaster);
      this.stars = createStars(parts.star);
      this.headGroup.addChild(...this.stars);
      this.setJawOpening(0);
    } else {
      this.headGroup.addChild(createPlacard(parts.name));
    }
    this.placeHead();
    this.view.addChild(this.headGroup);
    this.setEyes('normal');
  }

  /** Where the rig stands, in its parent's coordinates. */
  setHome(x: number, y: number): void {
    this.homeX = x;
    this.homeY = y;
  }

  /** "normal" shows the real eyes of the photo; otherwise a drawn pair covers them. */
  setEyes(kind: string): void {
    const texture = this.parts.eyes[kind];
    const art = this.face?.art;
    this.eyeLeft.visible = Boolean(texture && art);
    this.eyeRight.visible = this.eyeLeft.visible;
    if (!texture || !art) return;
    this.shownEyes = kind;
    placeEye(this.eyeLeft, texture, art.ancres.oeil_g, EYE_SCALES[kind]);
    placeEye(this.eyeRight, texture, art.ancres.oeil_d, EYE_SCALES[kind]);
  }

  /** Whether it has this other face: a real wincing face needs no drawn crossed eyes. */
  hasFace(name: string): boolean {
    return Boolean(this.parts.faces[name]);
  }

  /** The face it comes back to after each moment: its own, or its shocked one for the length of a scandal. */
  restOn(name: string | null): void {
    const face = name ? this.parts.faces[name] : null;
    if (!this.restingFace || !this.ownFace) return;
    this.restingFace = face ?? this.ownFace;
    if (this.faceLeft <= 0) this.wearFace(this.restingFace);
  }

  /** Shows another face for a while, if it has one, then back to its own. */
  showFace(name: string, seconds: number): void {
    const face = this.parts.faces[name];
    if (!face || !this.restingFace) return;
    this.wearFace(face);
    this.faceLeft = seconds;
  }

  /** Faces the other way at once, for a while, then snaps back: the card must stay easy to recognise. */
  turnAround(seconds: number): void {
    this.setFacing(-1);
    this.turnLeft = seconds;
  }

  /** Shows these eyes for a while, then back to the resting ones. */
  flashEyes(kind: string, seconds: number): void {
    this.setEyes(kind);
    this.eyesLeft = seconds;
  }

  /** Keeps these eyes until further notice. */
  holdEyes(kind: string): void {
    this.restingEyes = kind;
    this.eyesLeft = 0;
    this.setEyes(kind);
  }

  showStars(seconds: number): void {
    this.starsLeft = seconds;
  }

  setPlasterVisible(isVisible: boolean): void {
    if (this.plaster) this.plaster.visible = isVisible;
  }

  /** The clapper claps for a while. */
  talk(seconds: number): void {
    this.talkLeft = seconds;
  }

  play(name: RigAnimationName, options: PlayOptions = {}): void {
    this.animation = RIG_ANIMATIONS[name];
    this.animationTime = 0;
    this.reachX = options.reachX ?? 0;
    this.reachY = options.reachY ?? 0;
    this.onImpact = options.onImpact ?? null;
    this.onFinished = options.onFinished ?? null;
    this.impactDone = false;
  }

  update(deltaSeconds: number): void {
    this.animationTime += deltaSeconds;
    this.applyPose();
    this.fireImpactOnce();
    this.updateStars(deltaSeconds);
    this.updateEyes(deltaSeconds);
    this.updateFace(deltaSeconds);
    this.updateFacing(deltaSeconds);
    this.updateTalk(deltaSeconds);
    if (!this.animation.loop && this.animationTime >= this.animation.duration) this.finishAnimation();
  }

  /** Swaps the head and the jaw for another face, and puts the drawn eyes back on its own eyes. */
  private wearFace(face: RigFace): void {
    if (!this.headSprite || !this.jaw) return;
    this.face = face;
    this.headSprite.texture = face.head;
    this.jaw.texture = face.jaw;
    this.jaw.pivot.set(face.art.pieces.machoire.pivot[0], face.art.pieces.machoire.pivot[1]);
    this.placeHead();
    this.setJawOpening(0);
    if (this.eyeLeft.visible) this.setEyes(this.shownEyes);
  }

  private setFacing(facing: number): void {
    this.facing = facing;
    this.headGroup.scale.x = facing * RIG_LAYOUT.headScale;
    if (this.body) this.body.scale.x = facing * RIG_LAYOUT.bodyScale;
  }

  private updateFacing(deltaSeconds: number): void {
    if (this.turnLeft <= 0) return;
    this.turnLeft -= deltaSeconds;
    if (this.turnLeft <= 0) this.setFacing(1);
  }

  private updateFace(deltaSeconds: number): void {
    if (this.faceLeft <= 0) return;
    this.faceLeft -= deltaSeconds;
    if (this.faceLeft <= 0 && this.restingFace) this.wearFace(this.restingFace);
  }

  private placeHead(): void {
    const [chinX, chinY] = this.face?.art.ancres.menton ?? PLACARD_CHIN;
    const neckY = -RIG_LAYOUT.bodyHeight * RIG_LAYOUT.bodyScale + RIG_LAYOUT.neckOverlap;
    this.headGroup.scale.set(this.facing * RIG_LAYOUT.headScale, RIG_LAYOUT.headScale);
    this.headGroup.pivot.set(chinX, chinY);
    this.headGroup.position.set(0, neckY);
  }

  private setJawOpening(opening: number): void {
    if (!this.jaw || !this.face) return;
    const { pose, pivot } = this.face.art.pieces.machoire;
    this.jaw.position.set(pose[0] + pivot[0], pose[1] + pivot[1] + opening * RIG_LAYOUT.jawMaxDrop);
    this.jaw.rotation = opening * RIG_LAYOUT.jawMaxTilt;
  }

  private applyPose(): void {
    const { x, y, rotation, scaleX, scaleY } = samplePose(this.animation, this.animationTime, RIG_ANIMATION_FPS);
    const isAttack = this.animation.impactAt !== undefined;
    this.view.x = this.homeX + (isAttack ? x * this.reachX : x);
    this.view.y = this.homeY + y + (isAttack ? x * this.reachY : 0);
    this.view.rotation = rotation;
    this.view.scale.set(scaleX, scaleY);
  }

  private fireImpactOnce(): void {
    const { impactAt } = this.animation;
    if (impactAt === undefined || this.impactDone || this.animationTime < impactAt) return;
    this.impactDone = true;
    this.onImpact?.();
  }

  private finishAnimation(): void {
    const finished = this.onFinished;
    this.onFinished = null;
    if (!this.animation.hold) this.animation = RIG_ANIMATIONS.idle;
    finished?.();
  }

  private updateEyes(deltaSeconds: number): void {
    if (this.eyesLeft <= 0) return;
    this.eyesLeft -= deltaSeconds;
    if (this.eyesLeft <= 0) this.setEyes(this.restingEyes);
  }

  private updateTalk(deltaSeconds: number): void {
    if (this.talkLeft <= 0) return;
    this.talkLeft -= deltaSeconds;
    const frame = Math.floor(this.talkLeft * RIG_ANIMATION_FPS) % TALK_FRAMES.length;
    this.setJawOpening(this.talkLeft > 0 ? TALK_FRAMES[frame] : 0);
  }

  private updateStars(deltaSeconds: number): void {
    this.starsLeft = Math.max(0, this.starsLeft - deltaSeconds);
    this.starTime += deltaSeconds;
    const art = this.face?.art;
    if (!art) return;
    const { starOrbitX, starOrbitY, starCount, starSpinPerSecond, headScale } = RIG_LAYOUT;
    const centerX = (art.ancres.oeil_g[0] + art.ancres.oeil_d[0]) / 2;
    const snapped = Math.floor(this.starTime * RIG_ANIMATION_FPS) / RIG_ANIMATION_FPS;
    this.stars.forEach((star, index) => {
      const angle = snapped * starSpinPerSecond + (index / starCount) * Math.PI * 2;
      star.visible = this.starsLeft > 0;
      star.position.set(centerX + (Math.cos(angle) * starOrbitX) / headScale, 20 + (Math.sin(angle) * starOrbitY) / headScale);
    });
  }
}
