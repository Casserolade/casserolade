import { onUnmounted, ref, watch } from 'vue';
import type { Ref } from 'vue';

const TICK_MS = 250;

/** Whole seconds until a server deadline, for display only: the server alone decides when time is up. */
export function useCountdown(deadline: Ref<number | null>): Ref<number | null> {
  const seconds = ref<number | null>(null);

  function update(): void {
    seconds.value = deadline.value === null ? null : Math.max(0, Math.ceil((deadline.value - Date.now()) / 1000));
  }

  const timer = window.setInterval(update, TICK_MS);
  watch(deadline, update, { immediate: true });
  onUnmounted(() => window.clearInterval(timer));
  return seconds;
}
