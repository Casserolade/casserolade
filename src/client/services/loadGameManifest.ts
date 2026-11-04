import { EMPTY_MANIFEST } from '#src/client/const/gameManifest.ts';
import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';

/** The game must stay playable without any asset: on failure, rectangles and names (contract 1). */
export async function loadGameManifest(): Promise<GameManifest> {
  try {
    const response = await fetch(assetUrl('manifest.json'));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { ...EMPTY_MANIFEST, ...(await response.json()) };
  } catch (error) {
    console.error('Game assets could not be described', error);
    return EMPTY_MANIFEST;
  }
}
