/**
 * Where a card lands when it is dropped at `index`: there, or at the nearest place a nailed politician (scandal,
 * bracelet) leaves free. Dropped right on a nailed one, it used to come back to the hand without a word.
 * The same rule as insertAroundLocked (engine): a place is taken only when a nailed politician holds it.
 */
export function nearestInsertion<T>(items: T[], index: number, isLocked: (item: T) => boolean): number {
  const free = (at: number) => at >= 0 && at <= items.length && (at === items.length || !isLocked(items[at]));
  for (let distance = 0; distance <= items.length; distance++) {
    if (free(index + distance)) return index + distance;
    if (free(index - distance)) return index - distance;
  }
  return index;
}
