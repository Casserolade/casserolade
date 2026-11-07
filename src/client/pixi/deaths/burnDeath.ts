import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import { burnUniforms, createBurnFilter } from '#src/client/pixi/burnFilter.ts';
import type { CombatCard } from '#src/client/pixi/combatCard.ts';
import type { DeathScene, KillingBlowFx, StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import { emberRise, smokePuff } from '#src/client/pixi/particleBursts.ts';

const BURN_SECONDS = 1.05;
/** The Polémique is toxic: a green flame, white-hot at its edge, and green embers. */
const FLAME = { hot: [0.95, 1, 0.55] as [number, number, number], cool: [0.35, 1, 0.2] as [number, number, number] };
const EMBERS = '#b8ff5a';
const SMOKE = '#3e4a32';

/** Burnt by a Polémique: a toxic flame climbs from its feet and eats it, embers and smoke rising. */
export function burnDeath(card: CombatCard, scene: DeathScene, blow: KillingBlowFx): StageEffect {
  const filter = createBurnFilter(FLAME.hot, FLAME.cool);
  const uniforms = burnUniforms(filter);
  card.knockOut();
  card.view.filters = [filter];
  const x = card.centerX();
  const y = card.centerY();
  const size = card.scale * MEDALLION_LAYOUT.width;
  emberRise(scene.particles, x, y + size * 0.4, size, 22, EMBERS, card.scale);
  smokePuff(scene.particles, x, y - size * 0.1, 4, SMOKE, size * 0.8);
  scene.lights.gain(x, y, '#9dff5a', card.scale);
  scene.sound('sizzle', 1);
  scene.shake(0.12 + blow.strength * 0.05);
  let age = 0;
  return {
    update(deltaSeconds) {
      age += deltaSeconds;
      uniforms.uProgress = Math.min(1, age / BURN_SECONDS);
      card.update(deltaSeconds, deltaSeconds);
      return age < BURN_SECONDS;
    },
    destroy() {
      card.view.filters = [];
      filter.destroy();
      card.destroy();
    },
  };
}
