import { onMounted, onUnmounted, shallowRef } from 'vue';
import { fetchLiveCount } from '#src/client/services/liveCount.ts';
import type { LiveCount } from '#src/protocol/liveCount.ts';

const REFRESH_MS = 30_000;

/**
 * The life on the server, for the home page: read on arrival, then every half minute while the page is in view. A
 * server that stops answering leaves the last count shown.
 */
export function useLiveCount() {
  const count = shallowRef<LiveCount | null>(null);
  let timer: number | undefined;

  async function refresh(): Promise<void> {
    if (document.visibilityState !== 'visible') return;
    count.value = (await fetchLiveCount()) ?? count.value;
  }

  onMounted(() => {
    void refresh();
    timer = window.setInterval(refresh, REFRESH_MS);
  });
  onUnmounted(() => window.clearInterval(timer));
  return { count };
}
