export type Point = [number, number];

const TAU = Math.PI * 2;

/**
 * A rectangle (`width` × `height`) broken like glass: cracks run out from a point near the middle, and each wedge
 * breaks once more across. Returns the pieces, each a polygon, together covering the whole rectangle. `random` gives
 * numbers in [0, 1): the same numbers break it the same way.
 */
export function shardPolygons(width: number, height: number, wedges: number, random: () => number): Point[][] {
  const center: Point = [width * (0.4 + random() * 0.2), height * (0.4 + random() * 0.2)];
  const corners: Point[] = [[width, height], [0, height], [0, 0], [width, 0]];
  /** How far round from `from` a point is seen from the centre, in [0, 2π). */
  const turnFrom = (from: number, [x, y]: Point) => (((Math.atan2(y - center[1], x - center[0]) - from) % TAU) + TAU) % TAU;
  /** The point at `share` of the way from the centre to the edge, in that direction. */
  const along = (angle: number, share: number): Point => {
    const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
    const toSide = Math.min(dx > 0 ? (width - center[0]) / dx : dx < 0 ? -center[0] / dx : Infinity, dy > 0 ? (height - center[1]) / dy : dy < 0 ? -center[1] / dy : Infinity);
    return [center[0] + dx * toSide * share, center[1] + dy * toSide * share];
  };
  const start = random() * TAU;
  const angles = Array.from({ length: wedges }, (_, index) => start + ((index + 0.2 + random() * 0.6) / wedges) * TAU);
  return angles.flatMap((from, index) => {
    const to = index + 1 < wedges ? angles[index + 1] : angles[0] + TAU;
    const between = corners.filter((corner) => turnFrom(from, corner) > 0 && turnFrom(from, corner) < to - from).sort((a, b) => turnFrom(from, a) - turnFrom(from, b));
    const crack = 0.35 + random() * 0.3;
    const inner: Point[] = [center, along(from, crack), along(to, crack)];
    const outer: Point[] = [along(from, crack), along(from, 1), ...between, along(to, 1), along(to, crack)];
    return [inner, outer];
  });
}
