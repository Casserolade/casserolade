import type { Minion } from './types.ts';

/**
 * Le camp le plus représenté d'un plateau, sans les jetons, et combien de politiques en sont ; à égalité, le premier
 * rencontré de gauche à droite. Ce que mesurent les simulations et l'archive des parties en ligne.
 */
export function dominantCamp(board: readonly Pick<Minion, 'camp' | 'token'>[]): { camp: string | null; count: number } {
  const counts = new Map<string, number>();
  for (const m of board) if (!m.token) counts.set(m.camp, (counts.get(m.camp) ?? 0) + 1);
  let camp: string | null = null;
  let count = 0;
  for (const [c, n] of counts) {
    if (n > count) {
      camp = c;
      count = n;
    }
  }
  return { camp, count };
}
