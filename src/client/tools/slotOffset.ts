import type { SlotBox } from '#src/client/tools/nearestSlotIndex.ts';

/** The shift that brings a card from one slot to another. */
export function slotOffset(from: SlotBox, to: SlotBox): { x: number; y: number } {
  return { x: to.left - from.left, y: to.top - from.top };
}
