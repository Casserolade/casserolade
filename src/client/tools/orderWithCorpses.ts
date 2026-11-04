/** The order of a row: the living in their order, and those still being crushed left where they fell. */
export function orderWithCorpses(previous: number[], living: number[], corpses: ReadonlySet<number>): number[] {
  const order = [...living];
  previous.forEach((uid, index) => {
    if (corpses.has(uid) && !order.includes(uid)) order.splice(Math.min(index, order.length), 0, uid);
  });
  return order;
}
