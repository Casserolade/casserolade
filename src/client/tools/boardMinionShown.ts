import { minionFace, scandalLeft } from '#src/client/tools/shownCard.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import type { PlayerView } from '#src/engine/game.ts';
import { tripleCopies } from '#src/engine/minion.ts';
import type { Minion } from '#src/engine/types.ts';

/** A politician of the board as its full card shows it: its copies toward a triple, its casseroles, its scandal. */
export function boardMinionShown(minion: Minion, view: Pick<PlayerView, 'board' | 'hand' | 'scandalThreshold' | 'round'>): ShownCard {
  const copies = minion.golden || minion.token ? 0 : tripleCopies([...view.board, ...view.hand], minion.cardId).length;
  const extra = { copies: copies >= 2 ? copies : 0, charges: minion.charges, scandalThreshold: view.scandalThreshold, scandalLeft: scandalLeft(minion, view.round) };
  return { kind: 'minion', face: minionFace(minion, extra) };
}
