import { AnimatedSprite, Rectangle, Texture } from 'pixi';

/** Cuts a Hyperframes sprite sheet into its frames, using the manifest description. */
export function sliceSheet(sheetTexture, { cols, images, cell }) {
  const frames = [];
  for (let index = 0; index < images; index += 1) {
    const frame = new Rectangle((index % cols) * cell[0], Math.floor(index / cols) * cell[1], cell[0], cell[1]);
    frames.push(new Texture({ source: sheetTexture.source, frame }));
  }
  return frames;
}

/**
 * Plays an effect once and resolves at its end. onImpact fires on the frame the manifest marks as the hit,
 * which is how the rig stays in sync with a pre-rendered effect.
 */
export function playEffectOnce({ parent, frames, description, x, y, displayWidth, onImpact }) {
  return new Promise((resolve) => {
    const sprite = createEffectSprite({ frames, description, x, y, displayWidth });
    sprite.loop = false;
    sprite.onFrameChange = (frame) => { if (frame === description.impact && onImpact) onImpact(); };
    sprite.onComplete = () => { sprite.destroy(); resolve(); };
    parent.addChild(sprite);
    sprite.play();
  });
}

/** Plays an effect and keeps its last frame on screen. Resolves with the sprite; destroy it to remove it. */
export function playEffectAndHold({ parent, frames, description, x, y, displayWidth, onImpact }) {
  return new Promise((resolve) => {
    const sprite = createEffectSprite({ frames, description, x, y, displayWidth });
    sprite.loop = false;
    sprite.onFrameChange = (frame) => { if (frame === description.impact && onImpact) onImpact(); };
    sprite.onComplete = () => resolve(sprite);
    parent.addChild(sprite);
    sprite.play();
  });
}

/** Starts a looping effect and returns the sprite; destroy it to stop. */
export function playEffectLoop({ parent, frames, description, x, y, displayWidth }) {
  const sprite = createEffectSprite({ frames, description, x, y, displayWidth });
  sprite.loop = true;
  parent.addChild(sprite);
  sprite.play();
  return sprite;
}

function createEffectSprite({ frames, description, x, y, displayWidth }) {
  const sprite = new AnimatedSprite(frames);
  sprite.anchor.set(description.ancre[0], description.ancre[1]);
  sprite.position.set(x, y);
  sprite.scale.set(displayWidth / description.cell[0]);
  sprite.animationSpeed = description.fps / 60;
  return sprite;
}
