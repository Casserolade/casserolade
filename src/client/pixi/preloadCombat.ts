import { EMPTY_MANIFEST } from '#src/client/const/gameManifest.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';

let preloaded = false;

/**
 * Loads the combat's code and its shared pictures (frames, bodies, gags) ahead of the first combat,
 * while the player recruits. PixiJS keeps them in its cache: the combat stage then opens at once
 * instead of leaving the table to the plain medallions. Each combat still loads its own faces.
 */
export function preloadCombat(): void {
  const manifest = gameArt.manifest.value;
  if (preloaded || manifest === EMPTY_MANIFEST) return;
  preloaded = true;
  void (async () => {
    try {
      const [{ Assets, TextureSource }, { loadCombatTextures }] = await Promise.all([
        import('pixi.js'),
        import('#src/client/pixi/loadCombatTextures.ts'),
        import('#src/client/pixi/combatStage.ts'),
      ]);
      // As the stage does (CombatStage.start): mipmaps, no worker, so that the cache serves the stage as is.
      TextureSource.defaultOptions.autoGenerateMipmaps = true;
      Assets.setPreferences({ preferWorkers: false });
      await loadCombatTextures(manifest, []);
    } catch (error) {
      preloaded = false;
      console.error('Combat preload failed', error);
    }
  })();
}
