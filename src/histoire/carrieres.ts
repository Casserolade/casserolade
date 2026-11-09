import type { Carriere, ChapitreCarriere } from '../data/histoire/carriere.ts';
import type { Chapitre } from '../data/histoire/chapitres.ts';
import type { Moment, Scene } from '../data/histoire/cinematique.ts';
import { carriere as durif } from '../data/histoire/carrieres/durif.ts';
import { carriere as lepen } from '../data/histoire/carrieres/lepen.ts';
import { carriere as melenchon } from '../data/histoire/carrieres/melenchon.ts';

/**
 * Les carrières qu'on peut jouer : écrites, avec leurs cinématiques, et validées une à une (8 novembre 2026 : « faisons
 * politique par politique », Mélenchon d'abord, puis Le Pen ; Durif le 9 novembre, en épisodes de shōnen). Les autres
 * héros jouent la carrière générique de chapitres.ts.
 */
export const CARRIERES: Carriere[] = [melenchon, lepen, durif];

export const CARRIERE_PAR_HEROS: Record<string, Carriere> = Object.fromEntries(CARRIERES.map((c) => [c.heros, c]));

/** Un chapitre de carrière vu comme un chapitre : la table, le moteur et le suivi n'y voient pas de différence. */
export function versChapitre(chapitre: ChapitreCarriere): Chapitre {
  const consigne = chapitre.scenarise?.consigne ?? chapitre.consigne;
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
    ...(consigne ? { consigne } : {}),
  };
}

/** Les chapitres de la carrière d'un héros, ou null s'il n'en a pas encore. */
export function chapitresDeCarriere(heroId: string): Chapitre[] | null {
  return CARRIERE_PAR_HEROS[heroId]?.chapitres.map(versChapitre) ?? null;
}

/**
 * La cinématique d'un moment de la carrière : avec un chapitre, celle qui l'ouvre (`avant`) ; sinon celle du moment qui
 * n'appartient à aucun chapitre (la victoire finale, pas celle d'un chapitre).
 */
export function cinematiqueDe(heroId: string, moment: Moment, chapitreId?: string): Scene | null {
  const carriere = CARRIERE_PAR_HEROS[heroId];
  if (!carriere) return null;
  if (chapitreId) return sceneParId(carriere, carriere.chapitres.find((c) => c.id === chapitreId)?.avant);
  return carriere.cinematiques.find((c) => c.moment === moment && !c.chapitre) ?? null;
}

/** La cinématique qui suit la victoire d'un chapitre (`apres`), s'il en a une. */
export function cinematiqueApres(heroId: string, chapitreId: string): Scene | null {
  const carriere = CARRIERE_PAR_HEROS[heroId];
  if (!carriere) return null;
  return sceneParId(carriere, carriere.chapitres.find((c) => c.id === chapitreId)?.apres);
}

function sceneParId(carriere: Carriere, id: string | undefined): Scene | null {
  return id ? (carriere.cinematiques.find((c) => c.id === id) ?? null) : null;
}
