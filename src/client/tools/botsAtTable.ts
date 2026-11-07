/** How many bots fill a room's table: the empty seats, none when the humans already fill it. */
export function botsAtTable(tableSize: number, humanCount: number): number {
  return Math.max(0, tableSize - humanCount);
}
