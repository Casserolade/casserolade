import type { GameSources, LineSource, PhotoSource, VoiceSource } from '#src/client/services/loadSources.ts';

/** Where a card's material comes from: its photos, its real voices, the lines it says. */
export interface EntrySources {
  photos: PhotoSource[];
  voices: VoiceSource[];
  lines: LineSource[];
}

/** The sources of a politician, a hero or a host, by its id. */
export function personSources(sources: GameSources, personId: string): EntrySources {
  return {
    photos: sources.photos.filter((p) => p.personne === personId),
    voices: sources.voix.filter((v) => v.personne === personId),
    lines: sources.phrases.filter((l) => l.id === personId),
  };
}
