/**
 * Shows a single number as polls and electoral base, the hero's armor. Every hero starts with the same polls
 * (`startHp`), and its armor on top: the engine only knows the total, and the armor goes first.
 * A player out of the game may hold negative polls: none are shown.
 */
export function splitPolls(hp: number, startHp: number): { polls: number; electoralBase: number } {
  return { polls: Math.max(0, Math.min(hp, startHp)), electoralBase: Math.max(0, hp - startHp) };
}
