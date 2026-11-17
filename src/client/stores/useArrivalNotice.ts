import { onMounted, onUnmounted, watch } from 'vue';
import type { Ref } from 'vue';
import { playSound } from '#src/client/services/soundEffects.ts';

/** The tab's title while someone came into the room unseen. */
const ARRIVAL_TITLE = 'Quelqu\'un est entré · Casserolade';

/**
 * A room that waits is often left in a tab behind: when someone walks in (`humans` grows), a sound says so, and the
 * tab's title too until the page is looked at again.
 */
export function useArrivalNotice(humans: Readonly<Ref<number>>): void {
  const ordinaryTitle = document.title;

  function restoreTitleInView(): void {
    if (document.visibilityState === 'visible') document.title = ordinaryTitle;
  }

  watch(humans, (now, before) => {
    if (now <= before) return;
    playSound('pop');
    if (document.visibilityState !== 'visible') document.title = ARRIVAL_TITLE;
  });
  onMounted(() => document.addEventListener('visibilitychange', restoreTitleInView));
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', restoreTitleInView);
    document.title = ordinaryTitle;
  });
}
