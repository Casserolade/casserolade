import { CARD_LAYOUT } from '#src/client/const/cardLayout.ts';
import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { RIG_LAYOUT } from '#src/client/const/rigLayout.ts';
import { campArtKey } from '#src/client/tools/campArtKey.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import type { Camp } from '#src/engine/types.ts';

/**
 * The paper puppet of a card as CSS variables, in card units (see PaperPuppet.vue).
 * Same geometry as the PixiJS rig: the chin rests on the neck of the body, the feet on the card's floor.
 */
export function puppetStyle(manifest: GameManifest, characterId: string, camp: Camp): Record<string, string> {
  const { headScale, bodyScale, bodyWidth, bodyHeight, neckOverlap } = RIG_LAYOUT;
  const neckY = CARD_LAYOUT.feetY - bodyHeight * bodyScale + neckOverlap;
  const style: Record<string, string> = {
    '--body-image': cssImage(manifest.corps[campArtKey(camp)]),
    '--body-left': String(CARD_LAYOUT.feetX - (bodyWidth * bodyScale) / 2),
    '--body-top': String(CARD_LAYOUT.feetY - bodyHeight * bodyScale),
    '--body-width': String(bodyWidth * bodyScale),
    '--body-height': String(bodyHeight * bodyScale),
    '--neck-x': String(CARD_LAYOUT.feetX),
    '--neck-y': String(neckY),
  };
  const art = manifest.personnages[characterId];
  if (!art) return style;
  const { tete: head, machoire: jaw } = art.pieces;
  const [chinX, chinY] = art.ancres.menton;
  return {
    ...style,
    '--atlas-image': cssImage(art.atlas),
    '--atlas-width': String((jaw.x + jaw.w) * headScale),
    '--atlas-height': String(Math.max(head.h, jaw.h) * headScale),
    '--head-left': String(CARD_LAYOUT.feetX - chinX * headScale),
    '--head-top': String(neckY - chinY * headScale),
    '--head-width': String(head.w * headScale),
    '--head-height': String(head.h * headScale),
    '--head-atlas-x': String(head.x * headScale),
    '--head-atlas-y': String(head.y * headScale),
    '--jaw-left': String(jaw.pose[0] * headScale),
    '--jaw-top': String(jaw.pose[1] * headScale),
    '--jaw-width': String(jaw.w * headScale),
    '--jaw-height': String(jaw.h * headScale),
    '--jaw-atlas-x': String(jaw.x * headScale),
    '--jaw-atlas-y': String(jaw.y * headScale),
    '--jaw-pivot-x': String(jaw.pivot[0] * headScale),
    '--jaw-pivot-y': String(jaw.pivot[1] * headScale),
    '--eye-left-x': String(art.ancres.oeil_g[0] * headScale),
    '--eye-left-y': String(art.ancres.oeil_g[1] * headScale),
    '--eye-right-x': String(art.ancres.oeil_d[0] * headScale),
    '--eye-right-y': String(art.ancres.oeil_d[1] * headScale),
  };
}
