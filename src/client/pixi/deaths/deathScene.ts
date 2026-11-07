import type { Container, Renderer, Texture } from 'pixi.js';
import type { EffectArt } from '#src/client/const/gameManifest.ts';
import type { LightLayer } from '#src/client/pixi/lightLayer.ts';
import type { ParticleLayer } from '#src/client/pixi/particleLayer.ts';
import type { SynthName } from '#src/client/services/synthSounds.ts';

/** Something the stage plays over several frames: false from `update` once it is over, then it is destroyed. */
export interface StageEffect {
  update(deltaSeconds: number): boolean;
  destroy(): void;
}

/** The blow that killed: where it came from (a unit direction, the politician flies away from it) and how hard. */
export interface KillingBlowFx {
  dirX: number;
  dirY: number;
  /** hitStrength: 0.6 a scratch, 2 a knockout. */
  strength: number;
}

/** A sprite sheet of the manifest, cut into its frames. */
export interface SheetFrames {
  frames: Texture[];
  art: EffectArt;
}

/** What a death may use on the stage: its layers, its lights and particles, the camera, the sounds. */
export interface DeathScene {
  /** Over the medallions, under the numbers. */
  layer: Container;
  particles: ParticleLayer;
  lights: LightLayer;
  renderer: Renderer;
  /** The stage's size, in its pixels: a politician thrown out flies past its edges. */
  screen: { width: number; height: number };
  reducedMotion: boolean;
  sheet(name: string): SheetFrames | null;
  sound(name: SynthName, strength?: number): void;
  shake(amount: number): void;
  shockwave(x: number, y: number, power: number): void;
}
