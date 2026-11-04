import type { PlayerView } from '#src/engine/game.ts';

/** One line for each board seen in combat, most recent first: the only intelligence on the others. */
export function seenBoardSummary(seen: PlayerView['seen'][number]): string {
  if (seen.board.length === 0) return 'plateau vide';
  return seen.board.map((m) => `${m.name} ${m.atk}/${m.hp}`).join(', ');
}
