import type { EffectArt } from '#src/client/const/gameManifest.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';

/** A sprite sheet of the manifest as CSS variables, for SheetSprite.vue. Sizes are in card units. */
export function sheetSpriteStyle(art: EffectArt, displayWidth: number): Record<string, string> {
  const { cols = 1, rows = 1, cell = [1, 1], fps = 12 } = art;
  const displayHeight = (displayWidth * cell[1]) / cell[0];
  return {
    '--sheet-image': cssImage(art.atlas),
    '--sheet-width': String(displayWidth),
    '--sheet-height': String(displayHeight),
    '--sheet-cols': String(cols),
    '--sheet-rows': String(rows),
    '--sheet-row-seconds': `${cols / fps}s`,
    '--sheet-total-seconds': `${(cols * rows) / fps}s`,
    '--sheet-repeat': art.boucle ? 'infinite' : '1',
    '--sheet-row-repeat': art.boucle ? 'infinite' : String(rows),
  };
}
