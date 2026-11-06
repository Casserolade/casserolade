import type { PlayerView } from '#src/engine/game.ts';
import type { Classement } from '#src/protocol/messages.ts';

/** The human's seat in every game played in the page. */
const HUMAN_SEAT = 0;

/** The human's end of a game in the page: place, rounds played and hero. Null when the ranking does not have them. */
export function humanResult(ranking: Classement, view: PlayerView | null): { place: number; manches: number; heros: string } | null {
  const row = ranking.find((entry) => entry.seat === HUMAN_SEAT);
  if (!row) return null;
  return { place: row.place, manches: Math.max(1, view?.round ?? 1), heros: row.heroId };
}
