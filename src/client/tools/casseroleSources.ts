import type { GameSources } from '#src/client/services/loadSources.ts';
import type { EntrySources } from '#src/client/tools/personSources.ts';

/** The sources of a casserole: its illustration, and the real voice that says its quote. Its fact is in its data. */
export function casseroleSources(sources: GameSources, casseroleId: string): EntrySources {
  return {
    photos: sources.photos.filter((p) => p.casserole === casseroleId),
    voices: sources.voix.filter((v) => v.casserole === casseroleId),
    lines: [],
  };
}
