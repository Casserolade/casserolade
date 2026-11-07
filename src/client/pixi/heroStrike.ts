import { Container, Sprite } from 'pixi.js';
import type { StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import { sparkBurst } from '#src/client/pixi/particleBursts.ts';
import type { StageFx } from '#src/client/pixi/stageFx.ts';
import type { SynthName } from '#src/client/services/synthSounds.ts';

/** A comet takes this long to fly, and the next one leaves this much later. */
const FLIGHT = { seconds: 0.4, stagger: 0.08 };
/** How far a comet's path bows out to the side, as a share of its length. */
const BOW = 0.28;
/** A comet's glow and its white heart, for a medallion at full size, in pixels. */
const COMET = { glow: 110, heart: 44 };

interface Comet {
  view: Container;
  fromX: number;
  fromY: number;
  bendX: number;
  bendY: number;
  scale: number;
  age: number;
  landed: boolean;
}

export interface StrikeTarget {
  x: number;
  y: number;
}

function cometView(fx: StageFx, color: string, scale: number): Container {
  const view = new Container();
  const glow = new Sprite(fx.particles.textures.ember);
  const heart = new Sprite(fx.particles.textures.ember);
  for (const [sprite, size, tint] of [[glow, COMET.glow, color], [heart, COMET.heart, '#ffffff']] as const) {
    sprite.anchor.set(0.5);
    sprite.blendMode = 'add';
    sprite.tint = tint;
    sprite.setSize(size * scale, size * scale);
    view.addChild(sprite);
  }
  view.visible = false;
  return view;
}

/**
 * The winners strike the beaten hero, as in Battlegrounds: a comet of light leaves each surviving medallion, bows
 * across the table and crashes into the hero's portrait, one after the other, each with its sparks and its jolt.
 * `color` is the side's: gold for yours, red for the rival's.
 */
export function heroStrike(
  fx: StageFx,
  sources: { x: number; y: number; scale: number }[],
  target: StrikeTarget,
  color: string,
  playSound: (name: SynthName, strength?: number) => void,
): StageEffect {
  const comets: Comet[] = sources.map((source, index) => {
    const view = cometView(fx, color, Math.max(0.5, source.scale));
    fx.deathLayer.addChild(view);
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const side = index % 2 === 0 ? 1 : -1;
    return {
      view,
      fromX: source.x,
      fromY: source.y,
      bendX: (source.x + target.x) / 2 - dy * BOW * side,
      bendY: (source.y + target.y) / 2 + dx * BOW * side,
      scale: source.scale,
      age: -index * FLIGHT.stagger,
      landed: false,
    };
  });

  function land(comet: Comet): void {
    comet.landed = true;
    comet.view.visible = false;
    fx.lights.hit(target.x, target.y, 1.6, comet.scale);
    sparkBurst(fx.particles, target.x, target.y, 0, 1, 1.6, Math.PI, ['#ffffff', color], comet.scale);
    fx.addShake(0.3);
    playSound('hit', 1.3);
  }

  function fly(comet: Comet, deltaSeconds: number): void {
    comet.age += deltaSeconds;
    if (comet.age < 0 || comet.landed) return;
    const t = Math.min(1, comet.age / FLIGHT.seconds);
    const along = t * t;
    const rest = 1 - along;
    const x = rest * rest * comet.fromX + 2 * rest * along * comet.bendX + along * along * target.x;
    const y = rest * rest * comet.fromY + 2 * rest * along * comet.bendY + along * along * target.y;
    comet.view.visible = true;
    comet.view.position.set(x, y);
    // Its tail: sparks left behind, fading where it passed.
    fx.particles.spawn({
      texture: 'ember', x, y, vx: 0, vy: 0, life: 0.28, size: [COMET.heart * 1.2 * comet.scale, 4], alpha: [0.8, 0], additive: true, color,
    });
    if (t >= 1) land(comet);
  }

  return {
    update(deltaSeconds) {
      comets.forEach((comet) => fly(comet, deltaSeconds));
      return comets.some((comet) => !comet.landed);
    },
    destroy() {
      comets.forEach((comet) => comet.view.destroy({ children: true }));
    },
  };
}

/** How long until the first comet lands, in milliseconds of the combat at normal speed: the polls drain from then. */
export const STRIKE_LANDS_MS = FLIGHT.seconds * 1000;
