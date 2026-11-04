import type { Casserole, Minion } from '#src/engine/types.ts';

export interface CasseroleOutcome {
  /** Its own affair: everything good counts twice. */
  owner: boolean;
  /**
   * `starts`: the casserole sets off a scandal. `adds`: it lands in one, its défaut joins at once.
   * `forgets`: « Quel compte Facebook ? », the people forget everything.
   */
  scandal: 'starts' | 'adds' | 'forgets' | null;
}

/**
 * What a casserole would do to this minion, said before it lands, as the engine applies it
 * (applyCasserole in game.ts): twice as good on its owner, and the scandal it may set off.
 */
export function casseroleOutcome(minion: Pick<Minion, 'cardId' | 'charges' | 'scandal'>, casserole: Casserole, threshold: number): CasseroleOutcome {
  const owner = casserole.owner === minion.cardId;
  if (casserole.chargesRemoved) return { owner, scandal: minion.scandal || minion.charges > 0 ? 'forgets' : null };
  if (minion.scandal) return { owner, scandal: 'adds' };
  return { owner, scandal: minion.charges + (casserole.charges ?? 1) >= threshold ? 'starts' : null };
}

/** The minion the Bracelet électronique would free: the longest scandal of the board (braceletTarget in recruit.ts). */
export function braceletTargetUid(board: Pick<Minion, 'uid' | 'scandal'>[]): number | null {
  const longest = board.filter((m) => m.scandal).sort((a, b) => (b.scandal?.until ?? 0) - (a.scandal?.until ?? 0))[0];
  return longest?.uid ?? null;
}
