import type { PlayerView } from '#src/engine/game.ts';

/**
 * The row of the table to mark as the next opponent: its seat, or for a ghost the eliminated seat whose face it wears.
 * Null when there is none, or for a ghost that copies a board drawn only at the combat (before the first elimination).
 */
export function nextOpponentSeat(table: PlayerView['table'], next: PlayerView['nextOpponent']): number | null {
  if (!next) return null;
  if (next.seat >= 0) return next.seat;
  return table.find((row) => !row.alive && row.heroId === next.ghostOf)?.seat ?? null;
}

/** The next opponent is a ghost without a face yet: the table shows it apart, since no row stands for it. */
export function facelessGhostNext(table: PlayerView['table'], next: PlayerView['nextOpponent']): boolean {
  return next !== null && next.seat < 0 && nextOpponentSeat(table, next) === null;
}
