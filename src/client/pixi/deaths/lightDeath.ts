import type { CombatCard } from '#src/client/pixi/combatCard.ts';
import type { DeathScene, KillingBlowFx, StageEffect } from '#src/client/pixi/deaths/deathScene.ts';

/** Killed by an effect, not a blow: the politician goes out in light, the column rising from it. */
export function lightDeath(card: CombatCard, scene: DeathScene, blow: KillingBlowFx): StageEffect {
  let gone = false;
  card.dissolve(() => (gone = true));
  scene.lights.death(card.centerX(), card.centerY(), card.scale);
  scene.sound('fall', 0.5 + blow.strength * 0.1);
  return {
    update(deltaSeconds) {
      card.update(deltaSeconds, deltaSeconds);
      return !gone;
    },
    destroy() {
      card.destroy();
    },
  };
}
