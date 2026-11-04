/** A big loss drains in at most this many steps: it stays short. */
const MAX_STEPS = 12;

/**
 * The polls shown one after the other as a loss drains them, the last one being what is left
 * (never below 0: a player who is out is shown at 0). One step per point, or quick steps for a big loss.
 */
export function drainSteps(before: number, after: number, maxSteps = MAX_STEPS): number[] {
  const from = Math.max(0, before);
  const to = Math.max(0, after);
  if (to >= from) return [];
  const loss = from - to;
  const count = Math.min(loss, maxSteps);
  const steps = Array.from({ length: count }, (_, index) => Math.round(from - (loss * (index + 1)) / count));
  return steps.filter((value, index) => index === 0 || value !== steps[index - 1]);
}
