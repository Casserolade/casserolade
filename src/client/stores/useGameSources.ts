import { shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import { loadSources } from '#src/client/services/loadSources.ts';
import type { GameSources } from '#src/client/services/loadSources.ts';

const sources = shallowRef<GameSources | null>(null);
let requested = false;

/** Every source of the game, loaded once for the page: null until it arrives, or if it never does. */
export function useGameSources(): Readonly<ShallowRef<GameSources | null>> {
  if (!requested) {
    requested = true;
    void loadSources().then((loaded) => (sources.value = loaded));
  }
  return sources;
}
