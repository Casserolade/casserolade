/**
 * The items in a random order, none first by right. `rolls` gives one number in [0, 1) per item (a seeded or a real
 * random), so the same rolls give the same order.
 */
export function shuffled<T>(items: readonly T[], rolls: readonly number[]): T[] {
  const order = [...items];
  for (let last = order.length - 1; last > 0; last--) {
    const pick = Math.min(last, Math.floor((rolls[last] ?? 0) * (last + 1)));
    [order[last], order[pick]] = [order[pick], order[last]];
  }
  return order;
}
