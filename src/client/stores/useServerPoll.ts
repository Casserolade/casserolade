import { onMounted, onUnmounted, shallowRef } from 'vue';
import type { ShallowRef } from 'vue';

/** The events that bring a page into view: a background tab shown, a page the browser prepared in advance opened. */
const SHOWN_EVENTS = ['visibilitychange', 'prerenderingchange'];

/**
 * Something the home page reads from the server again and again: read on arrival, even in a page still out of view
 * (a background tab, a page the browser prepares while the address is typed), read again as soon as the page comes
 * into view, then every `everyMs` while it stays there. A server that stops answering (`load` gives null) leaves the
 * last answer shown.
 */
export function useServerPoll<T>(load: () => Promise<T | null>, everyMs: number): { latest: ShallowRef<T | null>; refresh: () => Promise<void> } {
  const latest = shallowRef<T | null>(null);
  let timer: number | undefined;

  async function refresh(): Promise<void> {
    latest.value = (await load()) ?? latest.value;
  }

  function refreshInView(): void {
    if (document.visibilityState === 'visible') void refresh();
  }

  onMounted(() => {
    void refresh();
    timer = window.setInterval(refreshInView, everyMs);
    for (const event of SHOWN_EVENTS) document.addEventListener(event, refreshInView);
  });
  onUnmounted(() => {
    window.clearInterval(timer);
    for (const event of SHOWN_EVENTS) document.removeEventListener(event, refreshInView);
  });
  return { latest, refresh };
}
