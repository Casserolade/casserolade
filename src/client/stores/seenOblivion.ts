/** For each minion of the board, how many of its casseroles were forgotten when it was last shown. */
const seen = new Map<number, number>();

/**
 * Remembers how many casseroles of this minion are forgotten now, and returns the count shown before,
 * or null for a minion never shown. The people forget at the start of a round, while the table is
 * being set again: this is how the medallion knows that it has just happened.
 */
export function rememberOblivion(uid: number, forgotten: number): number | null {
  const before = seen.get(uid) ?? null;
  seen.set(uid, forgotten);
  return before;
}
