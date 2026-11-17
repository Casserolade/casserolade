import { fetchLiveCount } from '#src/client/services/liveCount.ts';
import { useServerPoll } from '#src/client/stores/useServerPoll.ts';

const REFRESH_MS = 30_000;

/** The life on the server, for the home page: read on arrival, then every half minute while the page is in view. */
export function useLiveCount() {
  const { latest: count } = useServerPoll(fetchLiveCount, REFRESH_MS);
  return { count };
}
