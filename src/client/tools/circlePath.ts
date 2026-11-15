/** A circle as an SVG path, for a drawing made of paths only: its centre and its radius, on the drawing's grid. */
export function circlePath(cx: number, cy: number, radius: number): string {
  return `M${cx - radius} ${cy}a${radius} ${radius} 0 1 0 ${2 * radius} 0a${radius} ${radius} 0 1 0 ${-2 * radius} 0Z`;
}
