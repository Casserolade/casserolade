import { Container, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { createLightTextures, destroyLightTextures } from '#src/client/pixi/lightTextures.ts';
import type { LightTextures } from '#src/client/pixi/lightTextures.ts';

/** One light, from its first frame to its last: where it goes, how big it grows, how bright it peaks. */
interface LightSpec {
  texture: Texture;
  x: number;
  y: number;
  color: string;
  seconds: number;
  /** Width and height at the start and at the end, in pixels. */
  from: [number, number];
  to: [number, number];
  /** Brightest at this fraction of its life, then it fades out. */
  peakAt?: number;
  alpha?: number;
  /** Drift over its life, in pixels. */
  dx?: number;
  dy?: number;
  /** The bottom of the texture stays on (x, y): a beam that rises. */
  rooted?: boolean;
  delay?: number;
}

interface Light extends LightSpec {
  sprite: Sprite;
  age: number;
}

const WARM = '#fff1b8';
const GOLD = '#ffd84a';
const REBIRTH = '#7fd3ff';
const DEATH_SPARKS = 12;

function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

/**
 * The lights of the combat, added on top of the cards: a flare and a shock wave on a hit, a column of
 * light when a politician goes out, a golden glow on a gain, a blue flash when an immunity breaks.
 */
export class LightLayer {
  readonly view = new Container();
  private readonly textures: LightTextures = createLightTextures();
  private lights: Light[] = [];

  /** `strength` from about 0.6 (a scratch) to 2 (a knockout blow); `scale` is the medallions' (smaller on a phone). */
  hit(x: number, y: number, strength: number, scale = 1): void {
    const size = (70 + 55 * strength) * scale;
    this.spawn({ texture: this.textures.glow, x, y, color: WARM, seconds: 0.32, from: [size * 0.4, size * 0.4], to: [size, size], peakAt: 0.15 });
    this.spawn({ texture: this.textures.ring, x, y, color: '#ffffff', seconds: 0.4, from: [size * 0.3, size * 0.3], to: [size * 1.5, size * 1.5], alpha: 0.7 });
  }

  /** The politician goes out in light: a flash, a column that rises, glints flying up. */
  death(x: number, y: number, scale: number): void {
    const s = scale;
    this.spawn({ texture: this.textures.glow, x, y, color: '#ffffff', seconds: 0.55, from: [80 * s, 80 * s], to: [340 * s, 340 * s], peakAt: 0.12 });
    this.spawn({ texture: this.textures.ring, x, y, color: WARM, seconds: 0.6, from: [60 * s, 40 * s], to: [420 * s, 260 * s], alpha: 0.8 });
    this.spawn({ texture: this.textures.beam, x, y: y + 60 * s, color: WARM, seconds: 1.1, from: [70 * s, 40 * s], to: [150 * s, 620 * s], peakAt: 0.3, rooted: true, delay: 0.05 });
    for (let index = 0; index < DEATH_SPARKS; index++) {
      const size = (18 + Math.random() * 26) * s;
      this.spawn({
        texture: this.textures.spark, x: x + (Math.random() - 0.5) * 90 * s, y: y + (Math.random() - 0.3) * 60 * s, color: index % 3 === 0 ? GOLD : '#ffffff',
        seconds: 0.7 + Math.random() * 0.6, from: [size, size], to: [size * 0.4, size * 0.4], dx: (Math.random() - 0.5) * 70 * s, dy: -(160 + Math.random() * 220) * s,
        peakAt: 0.2, delay: 0.08 + Math.random() * 0.25,
      });
    }
  }

  /** A gain: a glow that swells around the card, a few glints going up. `color` is the gain's color. */
  gain(x: number, y: number, color: string, scale = 1): void {
    const s = scale;
    this.spawn({ texture: this.textures.glow, x, y, color, seconds: 0.7, from: [120 * s, 120 * s], to: [260 * s, 260 * s], peakAt: 0.35, alpha: 0.55 });
    for (let index = 0; index < 4; index++) {
      this.spawn({ texture: this.textures.spark, x: x + (Math.random() - 0.5) * 80 * s, y: y + 20 * s, color, seconds: 0.8, from: [26 * s, 26 * s], to: [10 * s, 10 * s], dy: (-120 - Math.random() * 60) * s, delay: index * 0.07 });
    }
  }

  /**
   * A reincarnation (Retour en politique): a blue column comes down where the politician fell, a ring closes in on
   * the place, and glints fall into it, the opposite of a death.
   */
  rebirth(x: number, y: number, scale: number): void {
    const s = scale;
    this.spawn({ texture: this.textures.beam, x, y: y + 60 * s, color: REBIRTH, seconds: 0.9, from: [170 * s, 640 * s], to: [60 * s, 120 * s], peakAt: 0.15, rooted: true });
    this.spawn({ texture: this.textures.ring, x, y, color: '#d6f3ff', seconds: 0.55, from: [380 * s, 240 * s], to: [80 * s, 60 * s], alpha: 0.8, delay: 0.1 });
    this.spawn({ texture: this.textures.glow, x, y, color: REBIRTH, seconds: 0.8, from: [60 * s, 60 * s], to: [300 * s, 300 * s], peakAt: 0.45, delay: 0.2 });
    for (let index = 0; index < DEATH_SPARKS; index++) {
      const size = (16 + Math.random() * 22) * s;
      this.spawn({
        texture: this.textures.spark, x: x + (Math.random() - 0.5) * 120 * s, y: y - (180 + Math.random() * 160) * s, color: index % 3 === 0 ? '#ffffff' : REBIRTH,
        seconds: 0.6 + Math.random() * 0.4, from: [size, size], to: [size * 0.4, size * 0.4], dx: (Math.random() - 0.5) * 40 * s, dy: (160 + Math.random() * 120) * s,
        peakAt: 0.3, delay: Math.random() * 0.25,
      });
    }
  }

  /** An immunity breaks: a blue flash and a ring that bursts. */
  shield(x: number, y: number, scale = 1): void {
    const s = scale;
    this.spawn({ texture: this.textures.glow, x, y, color: '#9fe6ff', seconds: 0.4, from: [120 * s, 120 * s], to: [240 * s, 240 * s], peakAt: 0.1 });
    this.spawn({ texture: this.textures.ring, x, y, color: '#bff0ff', seconds: 0.45, from: [140 * s, 140 * s], to: [320 * s, 320 * s] });
  }

  update(deltaSeconds: number): void {
    this.lights = this.lights.filter((light) => this.updateLight(light, deltaSeconds));
  }

  destroy(): void {
    this.view.destroy({ children: true });
    destroyLightTextures(this.textures);
  }

  private spawn(spec: LightSpec): void {
    const sprite = new Sprite(spec.texture);
    sprite.anchor.set(0.5, spec.rooted ? 1 : 0.5);
    sprite.blendMode = 'add';
    sprite.tint = spec.color;
    sprite.alpha = 0;
    sprite.position.set(spec.x, spec.y);
    this.view.addChild(sprite);
    this.lights.push({ ...spec, sprite, age: -(spec.delay ?? 0) });
  }

  private updateLight(light: Light, deltaSeconds: number): boolean {
    light.age += deltaSeconds;
    if (light.age < 0) return true;
    const progress = Math.min(1, light.age / light.seconds);
    const grow = easeOut(progress);
    const peakAt = light.peakAt ?? 0.05;
    const brightness = progress < peakAt ? progress / peakAt : 1 - (progress - peakAt) / (1 - peakAt);
    const { sprite } = light;
    sprite.width = light.from[0] + (light.to[0] - light.from[0]) * grow;
    sprite.height = light.from[1] + (light.to[1] - light.from[1]) * grow;
    sprite.alpha = (light.alpha ?? 1) * Math.max(0, brightness);
    sprite.position.set(light.x + (light.dx ?? 0) * grow, light.y + (light.dy ?? 0) * grow);
    if (progress < 1) return true;
    sprite.destroy();
    return false;
  }
}
