import type { CombatCard } from '#src/client/pixi/combatCard.ts';
import type { DeathScene, KillingBlowFx, StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import { createTvOffFilter, tvOffUniforms } from '#src/client/pixi/tvOffFilter.ts';

const TV_OFF_SECONDS = 0.9;
/** When the line shrinks to a dot, the dot flashes once before it goes out. */
const DOT_AT = 0.86;

/** A Vedette goes off the air: snow, a white line, a dot, then nothing. Its show is over. */
export function tvOffDeath(card: CombatCard, scene: DeathScene, blow: KillingBlowFx): StageEffect {
  const filter = createTvOffFilter();
  const uniforms = tvOffUniforms(filter);
  card.knockOut();
  card.view.filters = [filter];
  const x = card.centerX();
  const y = card.centerY();
  scene.sound('zap', 1);
  scene.shake(0.12 + blow.strength * 0.05);
  let age = 0;
  let dotShown = false;
  return {
    update(deltaSeconds) {
      age += deltaSeconds;
      const progress = Math.min(1, age / TV_OFF_SECONDS);
      uniforms.uProgress = progress;
      uniforms.uTime = age;
      card.update(deltaSeconds, deltaSeconds);
      if (!dotShown && progress >= DOT_AT) {
        dotShown = true;
        scene.lights.gain(x, y, '#ffffff', card.scale);
      }
      return age < TV_OFF_SECONDS;
    },
    destroy() {
      card.view.filters = [];
      filter.destroy();
      card.destroy();
    },
  };
}
