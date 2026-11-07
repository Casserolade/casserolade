import type { CombatCard } from '#src/client/pixi/combatCard.ts';
import { breakMedallion } from '#src/client/pixi/deaths/breakMedallion.ts';
import type { DeathScene, KillingBlowFx, StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import { coinShower, sparkBurst } from '#src/client/pixi/particleBursts.ts';

const GOLD_SPARKS = ['#ffffff', '#fff3a0', '#ffd84a', '#ffb020'];

/** A golden politician breaks like a piggy bank: golden pieces, and a shower of coins. */
export function goldDeath(card: CombatCard, scene: DeathScene, blow: KillingBlowFx): StageEffect {
  const x = card.centerX();
  const y = card.centerY();
  coinShower(scene.particles, x, y, 16, card.scale);
  sparkBurst(scene.particles, x, y, 0, -1, 1.6, Math.PI, GOLD_SPARKS, card.scale);
  scene.lights.gain(x, y, '#ffd84a', card.scale);
  scene.lights.death(x, y, card.scale * 1.2);
  scene.sound('coins', 1);
  scene.shake(0.3);
  return breakMedallion(card, scene, blow, { wedges: 6, power: 1.2, tint: '#ffe9a0' });
}
