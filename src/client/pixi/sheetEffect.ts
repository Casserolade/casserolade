import { Rectangle, Sprite, Texture } from 'pixi.js';
import type { EffectArt } from '#src/client/const/gameManifest.ts';

/** Cuts a Hyperframes sprite sheet into its frames, using the manifest description. */
export function sliceSheet(sheet: Texture, { cols = 1, images = 1, cell = [sheet.width, sheet.height] }: EffectArt): Texture[] {
  return Array.from({ length: images }, (_, index) => {
    const frame = new Rectangle((index % cols) * cell[0], Math.floor(index / cols) * cell[1], cell[0], cell[1]);
    return new Texture({ source: sheet.source, frame });
  });
}

/**
 * An effect from a sprite sheet. Its time is pushed by update(), so it follows the combat's speed.
 * onImpact fires on the frame the manifest marks as the hit: that is how the rig stays in sync with it.
 */
export class SheetEffect {
  readonly view: Sprite;
  private readonly frames: Texture[];
  private readonly art: EffectArt;
  private readonly onImpact: (() => void) | null;
  private time = 0;
  private impactDone = false;

  constructor(frames: Texture[], art: EffectArt, displayWidth: number, onImpact: (() => void) | null = null) {
    this.frames = frames;
    this.art = art;
    this.onImpact = onImpact;
    this.view = new Sprite(frames[0]);
    this.view.anchor.set(art.ancre?.[0] ?? 0.5, art.ancre?.[1] ?? 1);
    this.view.scale.set(displayWidth / (art.cell?.[0] ?? frames[0].width));
  }

  /** True once a one-shot effect has played its last image. Looping or held effects never finish by themselves. */
  update(deltaSeconds: number): boolean {
    this.time += deltaSeconds;
    const frameIndex = Math.floor(this.time * (this.art.fps ?? 12));
    this.fireImpactOnce(frameIndex);
    if (this.art.boucle) {
      this.view.texture = this.frames[frameIndex % this.frames.length];
      return false;
    }
    this.view.texture = this.frames[Math.min(frameIndex, this.frames.length - 1)];
    return !this.art.tient && frameIndex >= this.frames.length;
  }

  destroy(): void {
    this.view.destroy();
  }

  private fireImpactOnce(frameIndex: number): void {
    if (this.impactDone || this.art.impact === undefined || frameIndex < this.art.impact) return;
    this.impactDone = true;
    this.onImpact?.();
  }
}
