import { Container, Sprite } from 'pixi';
import { EYE_SCALES, RIG_LAYOUT } from '/tools/graphisme/demo/const/rig_layout.js';
import { RIG_ANIMATIONS, RIG_ANIMATION_FPS } from '/tools/graphisme/demo/const/rig_animations.js';
import { samplePose } from '/tools/graphisme/demo/tools/sample_pose.js';

/**
 * A paper puppet: tiny body, big head, clapper jaw, optional drawn eyes.
 * Origin is between the feet. Owns its pose and animation state; call update() on every tick.
 */
export class CharacterRig {
  constructor({ description, headTexture, jawTexture, bodyTexture, eyeTextures, starTexture, plasterTexture }) {
    this.description = description;
    this.eyeTextures = eyeTextures;
    this.view = new Container();
    this.headGroup = new Container();
    this.jawOpening = 0;
    this.animation = null;
    this.animationTime = 0;
    this.reachX = 0;
    this.impactDone = false;
    this.onImpact = null;
    this.onFinished = null;
    this.starTime = 0;
    this.starsLeft = 0;

    this.body = createBody(bodyTexture);
    this.view.addChild(this.body);
    this.head = new Sprite(headTexture);
    this.jaw = new Sprite(jawTexture);
    placeJawPivot(this.jaw, description.pieces.machoire);
    this.headGroup.addChild(this.head, this.jaw);
    this.eyeLeft = new Sprite();
    this.eyeRight = new Sprite();
    this.eyeLeft.anchor.set(0.5, 0.25);
    this.eyeRight.anchor.set(0.5, 0.25);
    this.plaster = createPlaster(plasterTexture, description.ancres);
    this.headGroup.addChild(this.eyeLeft, this.eyeRight, this.plaster);
    this.placeHead();
    this.view.addChild(this.headGroup);
    this.stars = createStars(starTexture);
    this.stars.forEach((star) => this.headGroup.addChild(star));
    this.setJawOpening(0);
    this.setEyes('normal');
    this.play('idle');
  }

  placeHead() {
    const [chinX, chinY] = this.description.ancres.menton;
    const neckY = -RIG_LAYOUT.bodyHeight * RIG_LAYOUT.bodyScale + RIG_LAYOUT.neckOverlap;
    this.headGroup.scale.set(RIG_LAYOUT.headScale);
    this.headGroup.pivot.set(chinX, chinY);
    this.headGroup.position.set(0, neckY);
  }

  /** Jaw position between 0 (closed) and 1 (wide open). */
  setJawOpening(opening) {
    const { pose, pivot } = this.description.pieces.machoire;
    this.jawOpening = opening;
    this.jaw.position.set(pose[0] + pivot[0], pose[1] + pivot[1] + opening * RIG_LAYOUT.jawMaxDrop);
    this.jaw.rotation = opening * RIG_LAYOUT.jawMaxTilt;
  }

  /** "normal" shows the real eyes of the photo; otherwise a drawn pair covers them. */
  setEyes(kind) {
    const texture = this.eyeTextures[kind];
    this.eyeLeft.visible = Boolean(texture);
    this.eyeRight.visible = Boolean(texture);
    if (!texture) return;
    placeEye(this.eyeLeft, texture, this.description.ancres.oeil_g, EYE_SCALES[kind]);
    placeEye(this.eyeRight, texture, this.description.ancres.oeil_d, EYE_SCALES[kind]);
  }

  /** Swaps the body, for the striped prison uniform. */
  setBodyTexture(texture) {
    this.body.texture = texture;
  }

  /** The plaster stays on after a comeback. */
  setPlasterVisible(isVisible) {
    this.plaster.visible = isVisible;
  }

  /** Spins stars around the head for a while. */
  showStars(seconds) {
    this.starsLeft = seconds;
  }

  /** Starts an animation; resolves when it ends. "hold" animations stay on their last pose. */
  play(name, { reachX = 0, onImpact = null } = {}) {
    this.animation = RIG_ANIMATIONS[name];
    this.animationTime = 0;
    this.reachX = reachX;
    this.onImpact = onImpact;
    this.impactDone = false;
    return new Promise((resolve) => { this.onFinished = resolve; });
  }

  update(deltaSeconds) {
    this.animationTime += deltaSeconds;
    this.applyPose(samplePose(this.animation, this.animationTime, RIG_ANIMATION_FPS));
    this.fireImpactOnce();
    this.updateStars(deltaSeconds);
    if (!this.animation.loop && this.animationTime >= this.animation.duration) this.finishAnimation();
  }

  applyPose({ x, y, rotation, scaleX, scaleY }) {
    this.view.pivot.set(0, 0);
    this.view.x = this.baseX + (this.animation.impactAt ? x * this.reachX : x);
    this.view.y = this.baseY + y;
    this.view.rotation = rotation;
    this.view.scale.set(scaleX, scaleY);
  }

  fireImpactOnce() {
    const { impactAt } = this.animation;
    if (impactAt === undefined || this.impactDone || this.animationTime < impactAt) return;
    this.impactDone = true;
    if (this.onImpact) this.onImpact();
  }

  finishAnimation() {
    const finished = this.onFinished;
    this.onFinished = null;
    if (!this.animation.hold) this.animation = RIG_ANIMATIONS.idle;
    if (finished) finished();
  }

  updateStars(deltaSeconds) {
    this.starsLeft = Math.max(0, this.starsLeft - deltaSeconds);
    this.starTime += deltaSeconds;
    const { starOrbitX, starOrbitY, starCount, starSpinPerSecond } = RIG_LAYOUT;
    const centerX = (this.description.ancres.oeil_g[0] + this.description.ancres.oeil_d[0]) / 2;
    const snapped = Math.floor(this.starTime * RIG_ANIMATION_FPS) / RIG_ANIMATION_FPS;
    this.stars.forEach((star, index) => {
      const angle = snapped * starSpinPerSecond + (index / starCount) * Math.PI * 2;
      star.visible = this.starsLeft > 0;
      star.position.set(centerX + Math.cos(angle) * starOrbitX / RIG_LAYOUT.headScale,
        20 + Math.sin(angle) * starOrbitY / RIG_LAYOUT.headScale);
    });
  }

  /** Where the rig stands, in its parent's coordinates. */
  setHome(x, y) {
    this.baseX = x;
    this.baseY = y;
  }
}

function createBody(texture) {
  const body = new Sprite(texture);
  body.anchor.set(0.5, 1);
  body.scale.set(RIG_LAYOUT.bodyScale);
  return body;
}

function placeJawPivot(jaw, { pivot }) {
  jaw.pivot.set(pivot[0], pivot[1]);
}

function placeEye(sprite, texture, [x, y, eyeWidth], scale) {
  sprite.texture = texture;
  sprite.position.set(x, y);
  sprite.scale.set((eyeWidth * scale) / texture.width);
  sprite.anchor.set(0.5, 64 / texture.height);
}

function createPlaster(texture, { oeil_d: rightEye }) {
  const plaster = new Sprite(texture);
  plaster.anchor.set(0.5);
  plaster.position.set(rightEye[0] + rightEye[2] * 0.5, rightEye[1] - rightEye[2] * 1.05);
  plaster.scale.set((rightEye[2] * 1.5) / texture.width);
  plaster.visible = false;
  return plaster;
}

function createStars(texture) {
  const stars = [];
  for (let index = 0; index < RIG_LAYOUT.starCount; index += 1) {
    const star = new Sprite(texture);
    star.anchor.set(0.5);
    star.scale.set(RIG_LAYOUT.starScale / RIG_LAYOUT.headScale);
    star.visible = false;
    stars.push(star);
  }
  return stars;
}
