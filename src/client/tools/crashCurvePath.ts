/** The curve holds on these points, in a 760 × 300 frame, before it falls. */
const PLATEAU = 'M40 92 L130 78 L215 96 L300 70 L385 88 L455 82';
/** The fall, as shares of its depth, at these x: it gives way, drops, and lands. */
const FALL: [number, number][] = [[520, 0.35], [575, 0.63], [640, 0.88], [700, 1]];
const PLATEAU_Y = 82;
/** How deep the curve falls: a dip for one point lost, the bottom of the frame from this many. */
const DEPTH = { least: 46, most: 194, fullAt: 10 };

/**
 * The polls' curve of a combat that cost `lost` points, as an SVG path in a 760 × 300 frame: it holds, then falls, the
 * deeper the more was lost. Also gives where the fall ends (`end`) and the direction it arrives from (`angle`,
 * degrees), for the arrow drawn at its tip.
 */
export function crashCurvePath(lost: number): { path: string; end: { x: number; y: number }; angle: number } {
  const share = Math.min(1, Math.max(0, (lost - 1) / (DEPTH.fullAt - 1)));
  const depth = DEPTH.least + (DEPTH.most - DEPTH.least) * share;
  const points = FALL.map(([x, part]) => ({ x, y: Math.round(PLATEAU_Y + depth * part) }));
  const [before, end] = points.slice(-2);
  return {
    path: `${PLATEAU} ${points.map((point) => `L${point.x} ${point.y}`).join(' ')}`,
    end,
    angle: Math.round((Math.atan2(end.y - before.y, end.x - before.x) * 180) / Math.PI),
  };
}
