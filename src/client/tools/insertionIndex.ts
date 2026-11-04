import type { SlotBox } from '#src/client/tools/nearestSlotIndex.ts';
import { nearestSlotIndex } from '#src/client/tools/nearestSlotIndex.ts';

/** Where a card dropped at a point lands: before or after the nearest card, on one row or several. */
export function insertionIndex(slots: SlotBox[], point: { x: number; y: number }): number {
  if (slots.length === 0) return 0;
  const nearest = nearestSlotIndex(slots, slots.map((_, index) => index), point);
  const slot = slots[nearest];
  return point.x > slot.left + slot.width / 2 ? nearest + 1 : nearest;
}
