import type { Minion } from '#src/engine/types.ts';

/** A casserole as it hangs on a politician of the board: what its défaut does now, and whether its owner bonus was given. */
export interface WornCasserole {
  /** Forgotten: its défaut is gone for good. Scandal: its défaut plays. Dormant: it waits for a scandal. */
  state: 'dormant' | 'scandal' | 'forgotten';
  /** Rounds of scandal left; 0 outside a scandal. */
  scandalLeft: number;
  /** Laid on its historical owner, maybe before a Ralliement: the bonus on top was given. */
  owned: boolean;
}

type Wearer = Pick<Minion, 'casseroles' | 'oublie' | 'ownerCasseroles' | 'scandal'>;

/** The index-th casserole of this politician at this round. The first `oublie` ones are forgotten. */
export function wornCasserole(minion: Wearer, index: number, round: number): WornCasserole {
  const id = minion.casseroles[index];
  const owned = minion.ownerCasseroles.includes(id);
  if (index < minion.oublie) return { state: 'forgotten', scandalLeft: 0, owned };
  if (!minion.scandal) return { state: 'dormant', scandalLeft: 0, owned };
  return { state: 'scandal', scandalLeft: Math.max(1, minion.scandal.until - round), owned };
}
