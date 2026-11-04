/** Whether a point falls inside a box of the screen. */
export function isInsideBox(box: { left: number; right: number; top: number; bottom: number }, point: { x: number; y: number }): boolean {
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
}
