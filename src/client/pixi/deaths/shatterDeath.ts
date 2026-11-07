import type { CombatCard } from '#src/client/pixi/combatCard.ts';
import { breakMedallion } from '#src/client/pixi/deaths/breakMedallion.ts';
import type { DeathScene, KillingBlowFx, StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import { chipBurst, sparkBurst } from '#src/client/pixi/particleBursts.ts';

/** A hard blow breaks the medallion like glass: its pieces fly off, chips of its frame with them. */
export function shatterDeath(card: CombatCard, scene: DeathScene, blow: KillingBlowFx): StageEffect {
  const x = card.centerX();
  const y = card.centerY();
  sparkBurst(scene.particles, x, y, blow.dirX, blow.dirY, blow.strength + 0.6, 1.4, undefined, card.scale);
  chipBurst(scene.particles, x, y, 10, card.color, 1 + blow.strength * 0.2, card.scale);
  scene.lights.hit(x, y, blow.strength + 0.6, card.scale);
  scene.sound('shatter', 0.9 + blow.strength * 0.2);
  scene.shake(0.3);
  return breakMedallion(card, scene, blow, { wedges: 5, power: 0.8 + blow.strength * 0.25, life: 1.2 });
}
