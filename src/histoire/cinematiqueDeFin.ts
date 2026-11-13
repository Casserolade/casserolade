import { OUTRE_TOMBE } from '../data/histoire/chapitres.ts';
import type { Chapitre } from '../data/histoire/chapitres.ts';
import type { Scene } from '../data/histoire/cinematique.ts';
import { cinematiqueApres, cinematiqueDe } from './carrieres.ts';

/**
 * La cinématique qui clôt un chapitre de carrière : l'épisode qui suit sa victoire ; au duel final, la victoire ou la
 * défaite. Elle se joue dès que la partie est finie, avant la soirée électorale : elle appartient au chapitre qu'on
 * vient de jouer. Jouée après « Élection suivante », elle passait pour celle du chapitre suivant, qui a aussi la
 * sienne : deux épisodes s'enchaînaient autour du même chapitre (13 novembre 2026).
 */
export function cinematiqueDeFin(heroId: string, chapitre: Chapitre, reussi: boolean): Scene | null {
  if (chapitre.boss && chapitre.id !== OUTRE_TOMBE.id) return cinematiqueDe(heroId, reussi ? 'victoire' : 'defaite');
  return reussi ? cinematiqueApres(heroId, chapitre.id) : null;
}
