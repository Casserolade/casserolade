import type { PlayerView } from '#src/engine/game.ts';

/**
 * The set's screens show the race: you first (a screen of its own when the set has two, the face-to-face of the second
 * round), then the other candidates still in it, the best polled first.
 */
export function candidateFaces(table: PlayerView['table'], seat: number): string[] {
  const own = table.find((row) => row.seat === seat && row.heroId)?.heroId;
  const others = table
    .filter((row) => row.alive && row.heroId && row.seat !== seat)
    .sort((a, b) => b.hp - a.hp)
    .map((row) => row.heroId as string);
  return own ? [own, ...others] : others;
}
