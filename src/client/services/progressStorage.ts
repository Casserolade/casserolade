import { browserStorage, read, write } from '#src/client/services/localProfile.ts';
import type { ProfileStorage } from '#src/client/services/localProfile.ts';
import { progresValide, progresVierge } from '#src/histoire/succes.ts';
import type { Progres } from '#src/histoire/succes.ts';

const PROGRESS_KEY = 'casserolade.progres';
const TITLE_KEY = 'casserolade.titre';

/** The achievements of this browser. Whatever is stored may be old or damaged: only the sound part is kept. */
export function readProgress(storage: ProfileStorage | null = browserStorage()): Progres {
  const raw = read(storage, PROGRESS_KEY);
  if (!raw) return progresVierge();
  try {
    return progresValide(JSON.parse(raw));
  } catch {
    return progresVierge();
  }
}

export function writeProgress(progress: Progres, storage: ProfileStorage | null = browserStorage()): void {
  write(storage, PROGRESS_KEY, JSON.stringify(progress));
}

/** The title shown next to the pseudo; empty for none. */
export function readTitle(storage: ProfileStorage | null = browserStorage()): string | null {
  return read(storage, TITLE_KEY) || null;
}

export function writeTitle(title: string | null, storage: ProfileStorage | null = browserStorage()): void {
  write(storage, TITLE_KEY, title ?? '');
}
