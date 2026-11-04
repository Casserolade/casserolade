export interface SlotBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function squaredDistance(slot: SlotBox, point: { x: number; y: number }): number {
  const dx = slot.left + slot.width / 2 - point.x;
  const dy = slot.top + slot.height / 2 - point.y;
  return dx * dx + dy * dy;
}

/** The available slot whose center is closest to a point. Works on one row or several. */
export function nearestSlotIndex(slots: SlotBox[], available: number[], point: { x: number; y: number }): number {
  return available.reduce((best, index) => (squaredDistance(slots[index], point) < squaredDistance(slots[best], point) ? index : best));
}
