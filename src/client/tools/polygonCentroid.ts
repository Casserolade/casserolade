import type { Point } from '#src/client/tools/shardPolygons.ts';

/** The average of a polygon's corners: the point a broken piece spins around. */
export function polygonCentroid(points: Point[]): Point {
  const [x, y] = points.reduce(([sumX, sumY], [pointX, pointY]) => [sumX + pointX, sumY + pointY], [0, 0]);
  return [x / points.length, y / points.length];
}
