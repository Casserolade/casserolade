import type { BotLevel } from '../bots/bots.ts';

/** L'écart de MMR accepté dès l'entrée dans la file. */
export const FENETRE_DEPART = 100;
/** Ce que la fenêtre gagne par seconde d'attente du plus ancien. */
export const FENETRE_PAR_SECONDE = 10;
/** Au-delà, tout le monde joue avec tout le monde. */
export const FENETRE_MAX = 1000;

export interface Attendant {
  mmr: number;
  /** L'heure d'entrée dans la file, en millisecondes. */
  depuis: number;
}

/** La fenêtre de MMR s'élargit avec l'attente, pour que personne n'attende trop longtemps. */
export function fenetreMmr(attenteMs: number): number {
  return Math.min(FENETRE_MAX, FENETRE_DEPART + (Math.max(0, attenteMs) / 1000) * FENETRE_PAR_SECONDE);
}

/**
 * Répartit la file en tables d'au plus `places` joueurs. Le plus ancien choisit sa table :
 * les joueurs dans sa fenêtre de MMR, du plus proche au plus lointain, à égalité le plus
 * ancien d'abord. Puis le plus ancien de ceux qui restent, et ainsi de suite.
 */
export function formerGroupes<T extends Attendant>(attente: readonly T[], maintenant: number, places: number): T[][] {
  const restants = [...attente].sort((a, b) => a.depuis - b.depuis);
  const groupes: T[][] = [];
  while (restants.length > 0) {
    const doyen = restants[0];
    const fenetre = fenetreMmr(maintenant - doyen.depuis);
    const groupe = restants
      .filter((e) => Math.abs(e.mmr - doyen.mmr) <= fenetre)
      .sort((a, b) => Math.abs(a.mmr - doyen.mmr) - Math.abs(b.mmr - doyen.mmr) || a.depuis - b.depuis)
      .slice(0, places);
    // Le tri est stable et le doyen passe premier : il est toujours dans sa propre table.
    groupes.push(groupe);
    for (const e of groupe) restants.splice(restants.indexOf(e), 1);
  }
  return groupes;
}

/** Majorité stricte : plus de la moitié des présents. */
export function majorite(presents: number): number {
  return Math.floor(presents / 2) + 1;
}

/** Les bots qui complètent une table publique suivent son MMR moyen. */
export function niveauDesBots(mmrMoyen: number): BotLevel {
  if (mmrMoyen < 850) return 'facile';
  if (mmrMoyen < 1150) return 'moyen';
  return 'difficile';
}
