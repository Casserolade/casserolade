import type { PlayerView } from '../engine/game.ts';

/**
 * Ce qu'une partie a montré au fil de ses manches, et que sa dernière vue ne dit plus : les sondages perdus en route,
 * leur point le plus bas, le plus gros politique passé sur le plateau. Les succès s'en nourrissent.
 */
export interface SuiviDePartie {
  /** La partie est suivie depuis sa première manche : sinon (une page rechargée en route), ce qui a précédé n'est pas su. */
  complet: boolean;
  /** Les sondages à la dernière vue, pour mesurer la prochaine baisse. */
  sondages: number;
  /** Tous les sondages perdus, baisse après baisse : zéro, la partie est sans une égratignure. */
  perdus: number;
  /** Le point le plus bas des sondages. */
  auPlusBas: number;
  /** Le plus gros politique vu sur le plateau : la plus petite de ses deux stats (2000/2000 vaut 2000, 9000/3 vaut 3). */
  plusGros: number;
}

const PREMIERE_MANCHE = 1;

/** La plus petite des deux stats du plus gros politique de ce plateau ; zéro sur un plateau vide. */
export function plusGrosPolitique(board: PlayerView['board']): number {
  return board.reduce((max, m) => Math.max(max, Math.min(m.atk, m.hp)), 0);
}

/**
 * Le suivi après une vue de plus. Au choix du héros, une partie commence : le suivi repart de rien, et les sondages
 * n'y ont pas encore leur socle électoral. Une vue reçue deux fois ne change rien.
 */
export function suivrePartie(avant: SuiviDePartie | null, view: PlayerView): SuiviDePartie | null {
  if (view.phase === 'choix_heros') return null;
  const plusGros = plusGrosPolitique(view.board);
  if (!avant) return { complet: view.round <= PREMIERE_MANCHE, sondages: view.hp, perdus: 0, auPlusBas: view.hp, plusGros };
  return {
    complet: avant.complet,
    sondages: view.hp,
    perdus: avant.perdus + Math.max(0, avant.sondages - view.hp),
    auPlusBas: Math.min(avant.auPlusBas, view.hp),
    plusGros: Math.max(avant.plusGros, plusGros),
  };
}
