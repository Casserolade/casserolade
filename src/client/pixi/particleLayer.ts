import { Container, Sprite } from 'pixi.js';
import { createParticleTextures, destroyParticleTextures } from '#src/client/pixi/particleTextures.ts';
import type { ParticleTextures } from '#src/client/pixi/particleTextures.ts';

/** One particle, from birth to death. Sizes in pixels, speeds in pixels per second. */
export interface ParticleSpec {
  texture: keyof ParticleTextures;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  /** Width at birth and at death. */
  size: [number, number];
  alpha?: [number, number];
  color?: string;
  /** Pixels per second², downward; negative rises. */
  gravity?: number;
  /** Share of its speed lost per second. */
  drag?: number;
  rotation?: number;
  spin?: number;
  /** Turned along its flight and drawn longer the faster it goes: sparks. Extra pixels per pixel per second. */
  stretch?: number;
  /** Spins like a coin tossed in the air: turns per second. */
  flip?: number;
  /** Lights add up (sparks, embers); matter covers (smoke, chips, coins). */
  additive?: boolean;
  delay?: number;
}

interface Particle extends ParticleSpec {
  sprite: Sprite;
  age: number;
}

/** Never more than this many at once: a phone keeps its 60 frames a second. */
const MAX_PARTICLES = 220;

/**
 * The sparks, embers, smoke and debris of the combat, in two layers: matter below, light above. Sprites are pooled:
 * a big explosion does not leave garbage behind it.
 */
export class ParticleLayer {
  readonly view = new Container();
  readonly textures: ParticleTextures = createParticleTextures();
  private readonly matter = new Container();
  private readonly light = new Container();
  private particles: Particle[] = [];
  private pool: Sprite[] = [];

  constructor() {
    this.view.addChild(this.matter, this.light);
  }

  spawn(spec: ParticleSpec): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    const sprite = this.pool.pop() ?? new Sprite();
    sprite.texture = this.textures[spec.texture];
    sprite.anchor.set(spec.stretch ? 1 : 0.5, 0.5);
    sprite.blendMode = spec.additive ? 'add' : 'normal';
    sprite.tint = spec.color ?? '#ffffff';
    sprite.visible = false;
    (spec.additive ? this.light : this.matter).addChild(sprite);
    this.particles.push({ ...spec, sprite, age: -(spec.delay ?? 0) });
  }

  update(deltaSeconds: number): void {
    this.particles = this.particles.filter((particle) => this.updateParticle(particle, deltaSeconds));
  }

  get count(): number {
    return this.particles.length;
  }

  destroy(): void {
    this.view.destroy({ children: true });
    this.pool.forEach((sprite) => sprite.destroy());
    destroyParticleTextures(this.textures);
  }

  private updateParticle(particle: Particle, deltaSeconds: number): boolean {
    particle.age += deltaSeconds;
    if (particle.age < 0) return true;
    if (particle.age >= particle.life) {
      this.recycle(particle.sprite);
      return false;
    }
    const step = Math.min(deltaSeconds, particle.age);
    const slowing = Math.exp(-(particle.drag ?? 0) * step);
    particle.vx *= slowing;
    particle.vy = particle.vy * slowing + (particle.gravity ?? 0) * step;
    particle.x += particle.vx * step;
    particle.y += particle.vy * step;
    this.draw(particle);
    return true;
  }

  private draw(particle: Particle): void {
    const { sprite, size, alpha = [1, 0] } = particle;
    const progress = particle.age / particle.life;
    const width = size[0] + (size[1] - size[0]) * progress;
    sprite.visible = true;
    sprite.position.set(particle.x, particle.y);
    sprite.alpha = alpha[0] + (alpha[1] - alpha[0]) * progress * progress;
    if (particle.stretch) {
      const speed = Math.hypot(particle.vx, particle.vy);
      sprite.rotation = Math.atan2(particle.vy, particle.vx);
      sprite.width = width + speed * particle.stretch;
      sprite.height = Math.max(2, width * 0.28);
      return;
    }
    sprite.rotation = (particle.rotation ?? 0) + (particle.spin ?? 0) * particle.age;
    sprite.width = width;
    sprite.height = width * (sprite.texture.height / sprite.texture.width);
    if (particle.flip) sprite.scale.x *= Math.cos(particle.age * particle.flip * Math.PI * 2);
  }

  private recycle(sprite: Sprite): void {
    sprite.removeFromParent();
    sprite.scale.set(1);
    this.pool.push(sprite);
  }
}
