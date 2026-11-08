/**
 * How a walk of `seconds` beats: an even number of half-strides, each `beat` long, close to `half` and filling the walk
 * exactly. A yoyo of `halves` half-strides ends where it started, and on time: nothing of the stride outlives the walk.
 */
export function strideBeats(seconds: number, half: number): { halves: number; beat: number } {
  const halves = Math.max(2, Math.round(seconds / half / 2) * 2);
  return { halves, beat: seconds / halves };
}
