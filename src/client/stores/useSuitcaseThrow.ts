import { onUnmounted, ref } from 'vue';
import { distanceToBox } from '#src/client/tools/distanceToBox.ts';
import { suitcaseFlight } from '#src/client/tools/suitcaseFlight.ts';
import type { SuitcaseFlight } from '#src/client/tools/suitcaseFlight.ts';

/** Where the suitcase goes: the Ko-fi link of the home page (TipLink.vue). */
const TARGET = '[data-suitcase-target]';
/** Within this many pixels of the link, out comes the suitcase; it comes out again once the mouse has gone twice as far. */
const REACH = 110;
/** It pops into the hand, then the arm swings: the suitcase leaves at the end of the swing. */
const HOLD_MS = 380;
const SWING_MS = 240;

type Phase = 'idle' | 'holding' | 'throwing';

/**
 * The home page's gag: when the mouse comes near the Ko-fi link, the reporter who runs after it pulls a suitcase
 * of banknotes out of nowhere, turns toward the link and throws it in. One throw per approach.
 */
export function useSuitcaseThrow(options: { reporterX: () => number; hand: () => DOMRect | null; onDelivered: () => void }) {
  const phase = ref<Phase>('idle');
  /** Toward the link while it holds and throws (-1 or 1), whichever way it was running; 0 the rest of the time. */
  const aim = ref(0);
  const flight = ref<SuitcaseFlight | null>(null);
  let armed = true;
  let timer = 0;

  function notice(pointer: { x: number; y: number }): void {
    const link = document.querySelector(TARGET)?.getBoundingClientRect();
    if (!link) return;
    const distance = distanceToBox(link, pointer);
    if (distance > REACH * 2) armed = true;
    if (!armed || distance > REACH || phase.value !== 'idle' || flight.value) return;
    armed = false;
    aim.value = Math.sign(link.left + link.width / 2 - options.reporterX()) || 1;
    phase.value = 'holding';
    timer = window.setTimeout(swing, HOLD_MS);
  }

  function swing(): void {
    phase.value = 'throwing';
    timer = window.setTimeout(release, SWING_MS);
  }

  /** The hand is measured before it lets go: the suitcase leaves from where it was held. */
  function release(): void {
    const hand = options.hand();
    const link = document.querySelector(TARGET)?.getBoundingClientRect();
    if (hand && link) flight.value = suitcaseFlight(hand, link);
    phase.value = 'idle';
  }

  function deliver(): void {
    aim.value = 0;
    options.onDelivered();
  }

  function clearFlight(): void {
    flight.value = null;
  }

  onUnmounted(() => window.clearTimeout(timer));
  return { phase, aim, flight, notice, deliver, clearFlight };
}
