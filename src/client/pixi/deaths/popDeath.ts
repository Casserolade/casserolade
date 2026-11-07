import type { CombatCard } from '#src/client/pixi/combatCard.ts';
import type { DeathScene, KillingBlowFx, StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import { chipBurst, smokePuff } from '#src/client/pixi/particleBursts.ts';

const SWELL_SECONDS = 0.12;
const SWELL = 0.3;

/** A token (a Suppléant…) is nobody: it swells like a balloon and pops, in a puff and a few scraps. */
export function popDeath(card: CombatCard, scene: DeathScene, blow: KillingBlowFx): StageEffect {
  card.knockOut();
  card.detach();
  const scale = card.view.scale.x;
  let age = 0;
  let popped = false;
  return {
    update(deltaSeconds) {
      age += deltaSeconds;
      card.view.scale.set(scale * (1 + SWELL * Math.min(1, age / SWELL_SECONDS)));
      card.update(deltaSeconds, deltaSeconds);
      if (popped || age < SWELL_SECONDS) return true;
      popped = true;
      card.view.visible = false;
      chipBurst(scene.particles, card.view.x, card.view.y, 12, card.color, 0.8 + blow.strength * 0.2, scale);
      smokePuff(scene.particles, card.view.x, card.view.y, 3, '#d8d4e0', 60 * scale);
      scene.sound('pop', 1);
      return false;
    },
    destroy() {
      card.destroy();
    },
  };
}
