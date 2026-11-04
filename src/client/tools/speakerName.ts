import { ANIMATEURS } from '#src/data/animateurs.ts';
import { PLATEAUX } from '#src/data/plateaux.ts';

/** Who says a line of the story: a real host, or the channel when no real host is on that set. Null for the narrator. */
export function speakerName(speakerId: string): string | null {
  const host = ANIMATEURS.find((candidate) => candidate.id === speakerId);
  if (!host) return null;
  if (host.reel) return host.nom;
  return PLATEAUX.find((plateau) => plateau.id === host.plateau)?.chaine ?? null;
}
