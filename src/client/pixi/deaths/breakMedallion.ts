import type { CombatCard } from '#src/client/pixi/combatCard.ts';
import type { DeathScene, KillingBlowFx, StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import { releaseTexture } from '#src/client/pixi/releaseTexture.ts';
import { Shards } from '#src/client/pixi/shards.ts';

export interface BreakLook {
  /** How many cracks: twice as many pieces. */
  wedges: number;
  /** How hard the pieces fly: 1 a crack, 2 an explosion. */
  power: number;
  /** A tint over the pieces: charred, golden. */
  tint?: string;
  life?: number;
}

/**
 * The medallion breaks to pieces where it stands, carrying the politician's real face away: the card itself is gone at
 * once, the pieces live on. Returns the pieces, to play with the rest of the death.
 */
export function breakMedallion(card: CombatCard, scene: DeathScene, blow: KillingBlowFx, look: BreakLook): StageEffect {
  const snapshot = card.snapshot(scene.renderer);
  const shards = new Shards(snapshot.texture, snapshot.x, snapshot.y, {
    x: card.view.x,
    y: card.view.y,
    scale: card.view.scale.x,
    dirX: blow.dirX,
    dirY: blow.dirY,
    power: look.power,
    wedges: look.wedges,
    tint: look.tint,
    life: look.life,
  });
  scene.layer.addChild(shards.view);
  card.destroy();
  return {
    update: (deltaSeconds) => shards.update(deltaSeconds),
    destroy() {
      shards.destroy();
      releaseTexture(snapshot.texture);
    },
  };
}
