import type { PlayerView } from '#src/engine/game.ts';

/**
 * The view a followed survivor's combat is shown from: ours (the same round, set and host), wearing that survivor's
 * seat, hero and polls, as the table tells them. The combat screen then plays it from its side.
 */
export function spectatorView(own: PlayerView, seat: number): PlayerView {
  const row = own.table.find((entry) => entry.seat === seat);
  if (!row) return own;
  return { ...own, seat, heroId: row.heroId ?? own.heroId, hp: row.hp, alive: row.alive, tier: row.tier };
}
