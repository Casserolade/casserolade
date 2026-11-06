import { browserStorage, read, write } from '#src/client/services/localProfile.ts';
import type { ProfileStorage } from '#src/client/services/localProfile.ts';

const VERSION_KEY = 'casserolade.version';

/** A phone's player who chose the computer version: the home page no longer sends them to /m/. */
export function computerChosen(storage: ProfileStorage | null = browserStorage()): boolean {
  return read(storage, VERSION_KEY) === 'ordinateur';
}

/** Keeps the version chosen by hand, for the next visits. */
export function chooseVersion(version: 'telephone' | 'ordinateur', storage: ProfileStorage | null = browserStorage()): void {
  write(storage, VERSION_KEY, version);
}
