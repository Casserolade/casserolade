import { pollsBase } from '#src/client/tools/pollsBase.ts';

/**
 * Shows a single number as polls and electoral base. The engine only knows the total:
 * the base goes first, as armor does, so this changes what is read and never the balance.
 * A player out of the game may hold negative polls: none are shown.
 */
export function splitPolls(hp: number, startHp: number): { polls: number; electoralBase: number } {
  const base = pollsBase(startHp);
  return { polls: Math.max(0, Math.min(hp, base)), electoralBase: Math.max(0, hp - base) };
}
