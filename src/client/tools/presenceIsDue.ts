import { PRESENCE_MS } from '#src/protocol/liveCount.ts';

/**
 * Whether the browser should say again it is on the game: never said, said an hour ago or more, or said « in the
 * future » by a clock that went back.
 */
export function presenceIsDue(lastSaidAt: number | null, now: number): boolean {
  if (lastSaidAt === null || !Number.isFinite(lastSaidAt)) return true;
  const elapsed = now - lastSaidAt;
  return elapsed < 0 || elapsed >= PRESENCE_MS;
}
