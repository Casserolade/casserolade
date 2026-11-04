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

export interface RigParts {
  art: CharacterArt | null;
  name: string;
  head: Texture | null;
  jaw: Texture | null;
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
 * Origin is between the feet. Owns its pose and animation state; call update() on every tick.
 */
export class CharacterRig {
  readonly view = new Container();
  private readonly parts: RigParts;
  private readonly headGroup = new Container();
  private readonly body: Sprite | null = null;
  private readonly jaw: Sprite | null = null;
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
    this.placeHead();
    if (parts.art && parts.head && parts.jaw) {
      this.jaw = new Sprite(parts.jaw);
      this.jaw.pivot.set(parts.art.pieces.machoire.pivot[0], parts.art.pieces.machoire.pivot[1]);
      this.headGroup.addChild(new Sprite(parts.head), this.jaw);
      this.plaster = createPlaster(parts.plaster, parts.art);
      this.headGroup.addChild(this.eyeLeft, this.eyeRight);
      if (this.plaster) this.headGroup.addChild(this.plaster);
      this.stars = createStars(parts.star);
      this.headGroup.addChild(...this.stars);
      this.setJawOpening(0);
    } else {
      this.headGroup.addChild(createPlacard(parts.name));
    }
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
    this.eyeLeft.visible = Boolean(texture && this.parts.art);
    this.eyeRight.visible = this.eyeLeft.visible;
    if (!texture || !this.parts.art) return;
    placeEye(this.eyeLeft, texture, this.parts.art.ancres.oeil_g, EYE_SCALES[kind]);
    placeEye(this.eyeRight, texture, this.parts.art.ancres.oeil_d, EYE_SCALES[kind]);
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
    this.updateTalk(deltaSeconds);
    if (!this.animation.loop && this.animationTime >= this.animation.duration) this.finishAnimation();
  }

  private placeHead(): void {
    const [chinX, chinY] = this.parts.art?.ancres.menton ?? PLACARD_CHIN;
    const neckY = -RIG_LAYOUT.bodyHeight * RIG_LAYOUT.bodyScale + RIG_LAYOUT.neckOverlap;
    this.headGroup.scale.set(RIG_LAYOUT.headScale);
    this.headGroup.pivot.set(chinX, chinY);
    this.headGroup.position.set(0, neckY);
  }

  private setJawOpening(opening: number): void {
    if (!this.jaw || !this.parts.art) return;
    const { pose, pivot } = this.parts.art.pieces.machoire;
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
    if (!this.parts.art) return;
    const { starOrbitX, starOrbitY, starCount, starSpinPerSecond, headScale } = RIG_LAYOUT;
    const centerX = (this.parts.art.ancres.oeil_g[0] + this.parts.art.ancres.oeil_d[0]) / 2;
    const snapped = Math.floor(this.starTime * RIG_ANIMATION_FPS) / RIG_ANIMATION_FPS;
    this.stars.forEach((star, index) => {
      const angle = snapped * starSpinPerSecond + (index / starCount) * Math.PI * 2;
      star.visible = this.starsLeft > 0;
      star.position.set(centerX + (Math.cos(angle) * starOrbitX) / headScale, 20 + (Math.sin(angle) * starOrbitY) / headScale);
    });
  }
}
