import type { Carriere, ChapitreCarriere } from '../data/histoire/carriere.ts';
import type { Chapitre } from '../data/histoire/chapitres.ts';
import type { Cinematique, Moment } from '../data/histoire/cinematique.ts';
import { carriere as lepen } from '../data/histoire/carrieres/lepen.ts';
import { carriere as melenchon } from '../data/histoire/carrieres/melenchon.ts';

/**
 * Les carrières qu'on peut jouer : écrites, avec leurs cinématiques, et validées une à une (8 novembre 2026 : « faisons
 * politique par politique », Mélenchon d'abord, puis Le Pen). Les autres héros jouent la carrière générique de chapitres.ts.
 */
export const CARRIERES: Carriere[] = [melenchon, lepen];

export const CARRIERE_PAR_HEROS: Record<string, Carriere> = Object.fromEntries(CARRIERES.map((c) => [c.heros, c]));

/** Un chapitre de carrière vu comme un chapitre : la table, le moteur et le suivi n'y voient pas de différence. */
export function versChapitre(chapitre: ChapitreCarriere): Chapitre {
  return {
    id: chapitre.id,
    election: chapitre.election,
    annee: chapitre.annee,
    plateaux: chapitre.plateaux,
    decouverte: chapitre.decouverte,
    adversaires: chapitre.adversaires,
    rivaux: chapitre.rivaux,
    boss: chapitre.boss,
    placeRequise: chapitre.placeRequise,
    regles: chapitre.regles,
    camps: chapitre.camps,
    contexteId: chapitre.contexteId,
    pouvoirs: true,
    bloque: [],
    objectifs: chapitre.objectifs,
    dialogues: chapitre.dialogues,
    scenario: chapitre.scenario,
  };
}

/** Les chapitres de la carrière d'un héros, ou null s'il n'en a pas encore. */
export function chapitresDeCarriere(heroId: string): Chapitre[] | null {
  return CARRIERE_PAR_HEROS[heroId]?.chapitres.map(versChapitre) ?? null;
}

/** La cinématique d'un moment de la carrière : celle du chapitre quand elle le précise. */
export function cinematiqueDe(heroId: string, moment: Moment, chapitreId?: string): Cinematique | null {
  const carriere = CARRIERE_PAR_HEROS[heroId];
  if (!carriere) return null;
  if (chapitreId) {
    const avant = carriere.chapitres.find((c) => c.id === chapitreId)?.avant;
    return carriere.cinematiques.find((c) => c.id === avant) ?? null;
  }
  return carriere.cinematiques.find((c) => c.moment === moment) ?? null;
}
