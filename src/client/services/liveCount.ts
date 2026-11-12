import { readLiveCount } from '#src/client/tools/readLiveCount.ts';
import { LIVE_COUNT_PATH } from '#src/protocol/liveCount.ts';
import type { LiveCount } from '#src/protocol/liveCount.ts';

/** The life on the server, for the home page; null when the server does not answer (Vite alone, no network). */
export async function fetchLiveCount(): Promise<LiveCount | null> {
  try {
    const response = await fetch(LIVE_COUNT_PATH, { cache: 'no-store' });
    if (!response.ok) return null;
    return readLiveCount(await response.json());
  } catch {
    return null;
  }
}
