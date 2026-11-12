import { onMounted, onUnmounted, shallowRef } from 'vue';
import { fetchLiveCount } from '#src/client/services/liveCount.ts';
import type { LiveCount } from '#src/protocol/liveCount.ts';

const REFRESH_MS = 30_000;
/** The events that bring a page into view: a background tab shown, a page the browser prepared in advance opened. */
const SHOWN_EVENTS = ['visibilitychange', 'prerenderingchange'];

/**
 * The life on the server, for the home page: read on arrival, even in a page still out of view (a background tab, a
 * page the browser prepares while the address is typed), read again as soon as the page comes into view, then every
 * half minute while it stays there. A server that stops answering leaves the last count shown.
 */
export function useLiveCount() {
  const count = shallowRef<LiveCount | null>(null);
  let timer: number | undefined;

  async function load(): Promise<void> {
    count.value = (await fetchLiveCount()) ?? count.value;
  }

  function loadInView(): void {
    if (document.visibilityState === 'visible') void load();
  }

  onMounted(() => {
    void load();
    timer = window.setInterval(loadInView, REFRESH_MS);
    for (const event of SHOWN_EVENTS) document.addEventListener(event, loadInView);
  });
  onUnmounted(() => {
    window.clearInterval(timer);
    for (const event of SHOWN_EVENTS) document.removeEventListener(event, loadInView);
  });
  return { count };
}
