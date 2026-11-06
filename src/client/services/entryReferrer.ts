import { tabStorage } from '#src/client/services/tabStorage.ts';
import type { TabStorage } from '#src/client/services/tabStorage.ts';

const KEY = 'casserolade.provenance';

/** A phone is about to be sent to its version: the page it came from would be lost on the way, keep it for the tab. */
export function keepEntryReferrer(referrer: string, storage: TabStorage | null = tabStorage()): void {
  if (!referrer) return;
  try {
    storage?.setItem(KEY, referrer);
  } catch {
    // Nothing kept: the visit counts as coming straight.
  }
}

/** The page a visit came from before the redirection, once: reading it forgets it. */
export function takeEntryReferrer(storage: TabStorage | null = tabStorage()): string | null {
  try {
    const referrer = storage?.getItem(KEY) ?? null;
    storage?.removeItem(KEY);
    return referrer;
  } catch {
    return null;
  }
}
