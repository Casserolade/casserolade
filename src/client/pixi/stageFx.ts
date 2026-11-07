import { Container, Point, Sprite, Texture } from 'pixi.js';
import type { Filter, Renderer } from 'pixi.js';
import { CameraShake } from '#src/client/pixi/cameraShake.ts';
import { CombatClock } from '#src/client/pixi/combatClock.ts';
import { DamageBadgeLayer } from '#src/client/pixi/damageBadges.ts';
import type { DeathScene, SheetFrames, StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import { FloaterLayer } from '#src/client/pixi/floaterLayer.ts';
import { ImpactLayer } from '#src/client/pixi/impactLayer.ts';
import { LightLayer } from '#src/client/pixi/lightLayer.ts';
import { ParticleLayer } from '#src/client/pixi/particleLayer.ts';
import { createShockwaveFilter, shockwaveUniforms } from '#src/client/pixi/shockwaveFilter.ts';
import type { SynthName } from '#src/client/services/synthSounds.ts';

/** The ring of a shockwave: how far it races, how fast, how thick, and how hard it bends the table. */
const SHOCKWAVE = { seconds: 0.55, reach: 900, width: 70, strength: 26 };
/** The finale: a white flash over the screen, and the camera punching in on the last blow. */
const FINALE = { flashSeconds: 0.16, flashAlpha: 0.6, zoom: 0.07, zoomSeconds: 0.9 };

export interface StageFxOptions {
  renderer: Renderer;
  reducedMotion: boolean;
  /** The stage's size, in its pixels. */
  screen: () => { width: number; height: number };
  sheet: (name: string) => SheetFrames | null;
  sound: (name: SynthName, strength?: number) => void;
  /** A big shock: the TV set outside the canvas flickers too (the DOM table). */
  onShock?: (strength: number) => void;
}

/**
 * Everything that makes a blow felt, around the medallions: the combat's clock (hit-stop, slow motion), the camera
 * (shake, punch-in, shock ring), the lights, sparks, smoke and debris, the damage badges and the words that float, and
 * the deaths playing out. `world` holds the medallions and these layers; it is what the camera moves.
 */
export class StageFx {
  readonly view = new Container();
  readonly world = new Container();
  readonly clock = new CombatClock();
  readonly particles = new ParticleLayer();
  readonly lights = new LightLayer();
  readonly impacts = new ImpactLayer();
  readonly badges = new DamageBadgeLayer();
  readonly floaters = new FloaterLayer();
  /** The deaths draw here: over the medallions, under the sparks. */
  readonly deathLayer = new Container();
  private readonly options: StageFxOptions;
  private readonly shake: CameraShake;
  private readonly zoomer = new Container();
  private readonly flash = new Sprite(Texture.WHITE);
  private effects: StageEffect[] = [];
  private shock: { filter: Filter; age: number; power: number } | null = null;
  private flashLeft = 0;
  private zoom: { x: number; y: number; age: number } | null = null;
  /** The medallions' scale: the shake and the shock rings follow it, smaller on a phone. */
  private scale = 1;

  /** `cards` is the layer of medallions: it goes under every effect. */
  constructor(cards: Container, options: StageFxOptions) {
    this.options = options;
    this.shake = new CameraShake(options.reducedMotion);
    this.world.addChild(cards, this.deathLayer, this.particles.view, this.impacts.view, this.lights.view, this.badges.view, this.floaters.view);
    this.zoomer.addChild(this.world);
    this.flash.alpha = 0;
    this.view.addChild(this.zoomer, this.flash);
  }

  /** What a death may use on the stage. */
  get scene(): DeathScene {
    return {
      layer: this.deathLayer,
      particles: this.particles,
      lights: this.lights,
      renderer: this.options.renderer,
      screen: this.options.screen(),
      reducedMotion: this.options.reducedMotion,
      sheet: this.options.sheet,
      sound: this.options.sound,
      shake: (amount) => this.addShake(amount),
      shockwave: (x, y, power) => this.shockwave(x, y, power),
    };
  }

  /** The medallions' scale on the stage (combatLayout): 1 on a computer's 1080p table. */
  setScale(scale: number): void {
    this.scale = scale;
  }

  /** An effect that plays over several frames, until it says it is over. */
  play(effect: StageEffect): void {
    this.effects.push(effect);
  }

  addShake(amount: number): void {
    this.shake.add(amount);
    if (amount >= 0.45) this.options.onShock?.(amount);
  }

  /** A ring of distortion racing out from (x, y), on the stage. Only one at a time: the newest wins. */
  shockwave(x: number, y: number, power: number): void {
    if (this.options.reducedMotion || this.options.renderer.name !== 'webgl') return;
    this.clearShock();
    const filter = createShockwaveFilter();
    const global = this.world.toGlobal(new Point(x, y));
    shockwaveUniforms(filter).uCenter.set([global.x, global.y]);
    this.world.filters = [filter];
    this.shock = { filter, age: 0, power };
  }

  /** The blow that ends the combat: a white flash, the camera punching in on it, slow motion. */
  finale(x: number, y: number): void {
    this.clock.freeze(0.14);
    this.clock.slowDown(0.3, 0.8);
    this.addShake(1);
    this.options.onShock?.(1);
    if (this.options.reducedMotion) return;
    this.flashLeft = FINALE.flashSeconds;
    this.zoom = { x, y, age: 0 };
  }

  /** Runs one frame; returns how much combat time passed in it. */
  update(realDeltaSeconds: number, speed: number): number {
    const deltaSeconds = this.clock.advance(realDeltaSeconds * speed);
    const { width, height } = this.options.screen();
    this.shake.update(this.world, realDeltaSeconds, width / 2, height / 2, this.scale);
    this.effects = this.effects.filter((effect) => this.updateEffect(effect, deltaSeconds));
    this.particles.update(deltaSeconds);
    // Flashes, numbers and words keep the page's pace: they pop during a hit-stop, and never hang as white blobs
    // through the finale's slow motion.
    const flashSeconds = realDeltaSeconds * speed;
    this.impacts.update(flashSeconds);
    this.lights.update(flashSeconds);
    this.badges.update(flashSeconds);
    this.floaters.update(flashSeconds);
    this.updateShock(realDeltaSeconds * speed);
    this.updateFinale(realDeltaSeconds, width, height);
    return deltaSeconds;
  }

  /** The player skipped: every running effect stops at once. */
  clear(): void {
    this.effects.forEach((effect) => effect.destroy());
    this.effects = [];
    this.clearShock();
  }

  destroy(): void {
    this.clear();
    this.lights.destroy();
    this.particles.destroy();
  }

  private updateEffect(effect: StageEffect, deltaSeconds: number): boolean {
    if (effect.update(deltaSeconds)) return true;
    effect.destroy();
    return false;
  }

  private updateShock(deltaSeconds: number): void {
    if (!this.shock) return;
    this.shock.age += deltaSeconds;
    const progress = this.shock.age / SHOCKWAVE.seconds;
    if (progress >= 1) {
      this.clearShock();
      return;
    }
    const uniforms = shockwaveUniforms(this.shock.filter);
    uniforms.uRadius = SHOCKWAVE.reach * this.shock.power * (1 - (1 - progress) ** 2);
    uniforms.uWidth = SHOCKWAVE.width * this.scale * (1 + progress);
    uniforms.uStrength = SHOCKWAVE.strength * this.shock.power * (1 - progress);
  }

  private clearShock(): void {
    if (!this.shock) return;
    this.world.filters = [];
    this.shock.filter.destroy();
    this.shock = null;
  }

  private updateFinale(realDeltaSeconds: number, width: number, height: number): void {
    this.flashLeft = Math.max(0, this.flashLeft - realDeltaSeconds);
    this.flash.setSize(width, height);
    this.flash.alpha = (this.flashLeft / FINALE.flashSeconds) * FINALE.flashAlpha;
    if (!this.zoom) return;
    this.zoom.age += realDeltaSeconds;
    const progress = Math.min(1, this.zoom.age / FINALE.zoomSeconds);
    this.zoomer.pivot.set(this.zoom.x, this.zoom.y);
    this.zoomer.position.set(this.zoom.x, this.zoom.y);
    this.zoomer.scale.set(1 + FINALE.zoom * Math.sin(progress * Math.PI));
    if (progress < 1) return;
    this.zoom = null;
    this.zoomer.scale.set(1);
  }
}
