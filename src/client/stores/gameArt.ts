import { shallowRef } from 'vue';
import { EMPTY_MANIFEST } from '#src/client/const/gameManifest.ts';
import { loadGameManifest } from '#src/client/services/loadGameManifest.ts';

/** The description of the game's assets. Loaded once at startup, read by everything that draws. */
function createGameArt() {
  const manifest = shallowRef(EMPTY_MANIFEST);

  async function load(): Promise<void> {
    manifest.value = await loadGameManifest();
  }

  return { manifest, load };
}

export const gameArt = createGameArt();
