/*
 * The bursts of particles of the combat. Each is drawn for medallions at full size (1), as on a computer's 1080p
 * table; `scale` is the medallions' own, smaller on a phone.
 */
import type { ParticleLayer } from '#src/client/pixi/particleLayer.ts';

const SPARK_COLORS = ['#ffffff', '#fff3a0', '#ffd84a'];

function between(low: number, high: number): number {
  return low + Math.random() * (high - low);
}

/**
 * Sparks spat out by a blow, mostly along (`dirX`, `dirY`) within `spread` radians on each side, a full circle when
 * the spread is π. `strength` from hitStrength: more sparks, faster, for a harder blow.
 */
export function sparkBurst(layer: ParticleLayer, x: number, y: number, dirX: number, dirY: number, strength: number, spread = 1.1, colors = SPARK_COLORS, scale = 1): void {
  const count = Math.round(6 + strength * 8);
  const heading = Math.atan2(dirY, dirX);
  for (let index = 0; index < count; index++) {
    const angle = heading + between(-spread, spread);
    const speed = between(380, 760) * (0.7 + strength * 0.35) * scale;
    layer.spawn({
      texture: 'streak', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: between(0.18, 0.42),
      size: [between(10, 18) * scale, 4 * scale], gravity: 1100 * scale, drag: 3.2, stretch: 0.045, additive: true, color: colors[index % colors.length],
    });
  }
}

/**
 * Speed lines behind a medallion that dashes from (x, y) along (`dirX`, `dirY`): thin streaks racing with it, as in a
 * manga panel. They leave as it leaves, a little after its wind-up.
 */
export function dashLines(layer: ParticleLayer, x: number, y: number, dirX: number, dirY: number, scale = 1): void {
  const across = { x: -dirY, y: dirX };
  for (let index = 0; index < 7; index++) {
    const side = between(-55, 55) * scale;
    const speed = between(900, 1400) * scale;
    layer.spawn({
      texture: 'streak', x: x + across.x * side - dirX * between(10, 60) * scale, y: y + across.y * side - dirY * between(10, 60) * scale,
      vx: dirX * speed, vy: dirY * speed, life: between(0.12, 0.2), size: [between(30, 60) * scale, 6 * scale], alpha: [0.7, 0],
      drag: 5, stretch: 0.03, additive: true, delay: 0.09 + between(0, 0.04),
    });
  }
}

/** Embers rising from a fire, drifting, flickering out. */
export function emberRise(layer: ParticleLayer, x: number, y: number, width: number, count: number, color: string, scale = 1): void {
  for (let index = 0; index < count; index++) {
    layer.spawn({
      texture: 'ember', x: x + between(-width / 2, width / 2), y: y + between(-10, 20) * scale, vx: between(-40, 40) * scale, vy: between(-160, -60) * scale,
      life: between(0.6, 1.2), size: [between(10, 18) * scale, 2 * scale], gravity: -70 * scale, drag: 0.8, additive: true, color, delay: between(0, 0.5),
    });
  }
}

/** Smoke that billows, rises and thins out. `size` is a puff's width, already scaled. */
export function smokePuff(layer: ParticleLayer, x: number, y: number, count: number, color = '#5a5662', size = 70): void {
  for (let index = 0; index < count; index++) {
    const angle = between(0, Math.PI * 2);
    const speed = between(0.4, 1.6) * size;
    layer.spawn({
      texture: 'smoke', x: x + between(-0.3, 0.3) * size, y: y + between(-0.3, 0.3) * size, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 0.7 * size,
      life: between(0.8, 1.4), size: [size * 0.5, size * between(1.3, 1.8)], alpha: [0.75, 0], gravity: -0.6 * size, drag: 1.4,
      rotation: between(0, 6.28), spin: between(-0.8, 0.8), color, delay: between(0, 0.12),
    });
  }
}

/** Chips of the medallion's frame, thrown out and falling. */
export function chipBurst(layer: ParticleLayer, x: number, y: number, count: number, color: string, power = 1, scale = 1): void {
  for (let index = 0; index < count; index++) {
    const angle = between(-Math.PI, 0) + between(-0.4, 0.4);
    const speed = between(260, 620) * power * scale;
    layer.spawn({
      texture: 'chip', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: between(0.7, 1.1),
      size: [between(9, 16) * scale, between(7, 12) * scale], alpha: [1, 0.6], gravity: 1500 * scale, drag: 0.6, rotation: between(0, 6.28), spin: between(-14, 14), color,
    });
  }
}

/** A shower of gold coins: a golden politician breaks into its bank. */
export function coinShower(layer: ParticleLayer, x: number, y: number, count: number, scale = 1): void {
  for (let index = 0; index < count; index++) {
    const angle = between(-Math.PI * 0.9, -Math.PI * 0.1);
    const speed = between(300, 720) * scale;
    layer.spawn({
      texture: 'coin', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: between(0.9, 1.4),
      size: [between(18, 26) * scale, between(16, 22) * scale], alpha: [1, 0.7], gravity: 1600 * scale, drag: 0.4, flip: between(1.5, 3.5), delay: between(0, 0.1),
    });
  }
}
