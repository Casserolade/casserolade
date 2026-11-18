import { shallowRef } from 'vue';
import type { ShownCard } from '#src/client/tools/shownCard.ts';

/** A box of the screen: the full card comes up beside it. */
export interface Anchor {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Inspected {
  card: ShownCard;
  /** Where the thing hovered is on the screen. */
  anchor: Anchor;
}

/** The full card of whatever the pointer rests on: one at a time, drawn above the whole table. */
function createCardInspector() {
  const inspected = shallowRef<Inspected | null>(null);
  let paused = false;

  /** Beside a box of the screen: something drawn on a canvas, which is no element of the page. */
  function showAt(card: ShownCard, anchor: Anchor): void {
    if (paused) return;
    inspected.value = { card, anchor };
  }

  function show(card: ShownCard, element: Element): void {
    const { left, top, right, bottom } = element.getBoundingClientRect();
    showAt(card, { left, top, right, bottom });
  }

  function hide(): void {
    inspected.value = null;
  }

  /** While something is carried or aimed, nothing comes up. */
  function pause(isPaused: boolean): void {
    paused = isPaused;
    if (isPaused) hide();
  }

  return { inspected, show, showAt, hide, pause };
}

export const cardInspector = createCardInspector();
