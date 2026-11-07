import { Sprite } from 'pixi.js';
import type { CombatCard } from '#src/client/pixi/combatCard.ts';
import type { DeathScene, KillingBlowFx, StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import { sparkBurst } from '#src/client/pixi/particleBursts.ts';

/** Thrown out: pixels a second, plus as much again per strength, upward, falling in an arc like a pinball shot. */
const THROW = { speed: 860, perStrength: 300, sideways: 0.9, lift: 0.6, gravity: 1500 };
/** It spins as it flies, and tumbles edge-on: turns per second. */
const SPIN = { least: 8, more: 6, tumble: 2.4 };
/** A trail of ghosts behind it, a pinball's streak. */
const GHOST = { every: 0.028, life: 0.2, alpha: 0.45, color: '#bfe6ff' };
const LONGEST_SECONDS = 1.6;
/** Past the edge by this much, it is gone. */
const OUT_MARGIN = 160;

interface Ghost {
  sprite: Sprite;
  age: number;
}

/**
 * The pinball death: the blow sends the politician spinning out of the table, toward the nearer side of the screen,
 * leaving a streak of ghosts behind it.
 */
export function ejectDeath(card: CombatCard, scene: DeathScene, blow: KillingBlowFx): StageEffect {
  const snapshot = card.snapshot(scene.renderer);
  card.knockOut();
  card.detach();
  const side = card.view.x < scene.screen.width / 2 ? -1 : 1;
  const rawX = blow.dirX + side * THROW.sideways;
  const rawY = blow.dirY - THROW.lift;
  const length = Math.hypot(rawX, rawY) || 1;
  // A phone's small table: a shorter throw, so that it is still seen flying.
  const reach = Math.min(1.2, Math.max(0.45, card.scale));
  const speed = (THROW.speed + THROW.perStrength * blow.strength) * reach;
  const vx = (rawX / length) * speed;
  let vy = (rawY / length) * speed;
  const spin = side * (SPIN.least + Math.random() * SPIN.more);
  const ghosts: Ghost[] = [];
  let age = 0;
  let sinceGhost = 0;
  sparkBurst(scene.particles, card.view.x, card.view.y, rawX / length, rawY / length, blow.strength + 0.5, 0.6, undefined, card.scale);
  scene.lights.hit(card.view.x, card.view.y, blow.strength + 0.4, card.scale);
  scene.sound('bumper', 0.9);
  scene.shake(0.22);

  function leaveGhost(): void {
    const sprite = new Sprite(snapshot.texture);
    sprite.anchor.set((card.view.pivot.x - snapshot.x) / snapshot.texture.width, (card.view.pivot.y - snapshot.y) / snapshot.texture.height);
    sprite.position.copyFrom(card.view.position);
    sprite.rotation = card.view.rotation;
    sprite.scale.copyFrom(card.view.scale);
    sprite.tint = GHOST.color;
    sprite.alpha = GHOST.alpha;
    sprite.blendMode = 'add';
    scene.layer.addChild(sprite);
    ghosts.push({ sprite, age: 0 });
  }

  function fadeGhost(ghost: Ghost, deltaSeconds: number): boolean {
    ghost.age += deltaSeconds;
    ghost.sprite.alpha = GHOST.alpha * Math.max(0, 1 - ghost.age / GHOST.life);
    if (ghost.age < GHOST.life) return true;
    ghost.sprite.destroy();
    return false;
  }

  function isOut(): boolean {
    const { x, y } = card.view;
    const { width, height } = scene.screen;
    return x < -OUT_MARGIN || x > width + OUT_MARGIN || y < -OUT_MARGIN || y > height + OUT_MARGIN;
  }

  return {
    update(deltaSeconds) {
      age += deltaSeconds;
      sinceGhost += deltaSeconds;
      vy += THROW.gravity * reach * deltaSeconds;
      card.view.x += vx * deltaSeconds;
      card.view.y += vy * deltaSeconds;
      card.view.rotation += spin * deltaSeconds;
      card.tumble(age * SPIN.tumble * Math.PI * 2);
      card.update(deltaSeconds, deltaSeconds);
      if (sinceGhost >= GHOST.every && !isOut()) {
        sinceGhost = 0;
        leaveGhost();
      }
      ghosts.splice(0, ghosts.length, ...ghosts.filter((ghost) => fadeGhost(ghost, deltaSeconds)));
      return age < LONGEST_SECONDS && !(isOut() && ghosts.length === 0);
    },
    destroy() {
      ghosts.forEach((ghost) => ghost.sprite.destroy());
      snapshot.texture.destroy(true);
      card.destroy();
    },
  };
}
