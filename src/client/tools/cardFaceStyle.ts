import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { campArtKey } from '#src/client/tools/campArtKey.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import type { Camp } from '#src/engine/types.ts';

/** The images and the camp color of a card, as CSS variables. Whatever is missing stays empty. */
export function cardFaceStyle(manifest: GameManifest, camp: Camp, tier: number, golden: boolean): Record<string, string> {
  const { cadres = {}, fond_art: artBackground, bandeau, attaque, pv } = manifest.carte;
  return {
    '--frame-image': cssImage(golden ? cadres.dore : (cadres[tier] ?? cadres[5])),
    '--token-image': cssImage(golden ? manifest.carte.jeton_dore : (manifest.carte[`jeton_${tier}`] ?? manifest.carte.jeton_5)),
    '--art-image': cssImage(artBackground),
    '--ribbon-image': cssImage(bandeau),
    '--attack-image': cssImage(attaque),
    '--health-image': cssImage(pv),
    '--camp-color': manifest.camps[campArtKey(camp)]?.couleur ?? `var(--camp-${camp})`,
  };
}
