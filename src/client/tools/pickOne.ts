/** One item of a list, chosen by `roll` in [0, 1); null for an empty list. */
export function pickOne<T>(items: readonly T[], roll: number): T | null {
  if (items.length === 0) return null;
  return items[Math.min(items.length - 1, Math.floor(roll * items.length))];
}
