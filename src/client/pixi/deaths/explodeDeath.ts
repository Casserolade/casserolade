import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';
import type { CombatCard } from '#src/client/pixi/combatCard.ts';
import { breakMedallion } from '#src/client/pixi/deaths/breakMedallion.ts';
import type { DeathScene, KillingBlowFx, StageEffect } from '#src/client/pixi/deaths/deathScene.ts';
import { chipBurst, emberRise, smokePuff, sparkBurst } from '#src/client/pixi/particleBursts.ts';
import { SheetEffect } from '#src/client/pixi/sheetEffect.ts';

/** The blast is this many medallions wide (the 3D explosion of explosion_3d.py). */
const BLAST_WIDTH = 2.6;
const FIRE_SPARKS = ['#ffffff', '#fff3a0', '#ffb020', '#ff6a14'];

/**
 * A blow far past what it could take: the politician blows up. The 3D explosion (Blender, explosion_3d.py), the
 * medallion's charred pieces flying, embers and smoke, a shock ring through the table.
 */
export function explodeDeath(card: CombatCard, scene: DeathScene, blow: KillingBlowFx): StageEffect {
  const x = card.centerX();
  const y = card.centerY();
  const size = card.scale * MEDALLION_LAYOUT.width;
  const sheet = scene.sheet('explosion');
  const blast = sheet ? new SheetEffect(sheet.frames, sheet.art, size * BLAST_WIDTH) : null;
  if (blast) {
    blast.view.position.set(x, y);
    scene.layer.addChild(blast.view);
  }
  sparkBurst(scene.particles, x, y, blow.dirX, blow.dirY, 2.2, Math.PI, FIRE_SPARKS, card.scale);
  chipBurst(scene.particles, x, y, 14, card.color, 1.6, card.scale);
  emberRise(scene.particles, x, y, size, 12, '#ffb020', card.scale);
  smokePuff(scene.particles, x, y - size * 0.2, 6, '#4a4450', size * 0.9);
  // The blast carries its own light: a short flash only, never a white blob over the fire.
  scene.lights.hit(x, y, 1.2, card.scale);
  scene.shockwave(x, y, card.scale);
  scene.shake(0.6);
  scene.sound('boom', 1.2);
  const pieces = breakMedallion(card, scene, blow, { wedges: 7, power: 2.3, tint: '#8a6a5e', life: 1.2 });
  let blastLeft = blast !== null;
  return {
    update(deltaSeconds) {
      if (blast && blastLeft && blast.update(deltaSeconds)) {
        blastLeft = false;
        blast.view.visible = false;
      }
      const piecesLeft = pieces.update(deltaSeconds);
      return blastLeft || piecesLeft;
    },
    destroy() {
      blast?.destroy();
      pieces.destroy();
    },
  };
}
