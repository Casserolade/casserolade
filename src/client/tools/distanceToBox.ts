/** How far a point of the screen is from a box, in pixels: 0 inside it or on its edge. */
export function distanceToBox(box: { left: number; right: number; top: number; bottom: number }, point: { x: number; y: number }): number {
  const dx = Math.max(box.left - point.x, 0, point.x - box.right);
  const dy = Math.max(box.top - point.y, 0, point.y - box.bottom);
  return Math.hypot(dx, dy);
}
