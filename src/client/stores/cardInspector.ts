import { shallowRef } from 'vue';
import type { ShownCard } from '#src/client/tools/shownCard.ts';

export interface Inspected {
  card: ShownCard;
  /** Where the thing hovered is on the screen: the full card comes up beside it. */
  anchor: { left: number; top: number; right: number; bottom: number };
}

/** The full card of whatever the pointer rests on: one at a time, drawn above the whole table. */
function createCardInspector() {
  const inspected = shallowRef<Inspected | null>(null);
  let paused = false;

  function show(card: ShownCard, element: Element): void {
    if (paused) return;
    const { left, top, right, bottom } = element.getBoundingClientRect();
    inspected.value = { card, anchor: { left, top, right, bottom } };
  }

  function hide(): void {
    inspected.value = null;
  }

  /** While something is carried or aimed, nothing comes up. */
  function pause(isPaused: boolean): void {
    paused = isPaused;
    if (isPaused) hide();
  }

  return { inspected, show, hide, pause };
}

export const cardInspector = createCardInspector();
