import type { CinematiqueComposee } from '../cinematique.ts';

/**
 * La carrière de Durif en épisodes de shōnen (9 novembre 2026) : écrits avec HyperFrames, joués par le lecteur des
 * cinématiques du jeu, le délire en anime, la retombée en marionnette de papier. Chaque épisode ouvre ou ferme un chapitre.
 */
export const CINEMATIQUES_DURIF: CinematiqueComposee[] = [
  { id: 'durif_intro', heros: 'durif', moment: 'intro', titre: 'L\'enfant d\'Aldébaran', episode: 'durif/ep1', son: 'cinematiques/durif/ep1.mp3', duree: 30 },
  { id: 'durif_bugarach', heros: 'durif', moment: 'victoire', chapitre: 'bugarach', titre: 'La fin du monde', episode: 'durif/ep2', son: 'cinematiques/durif/ep2.mp3', duree: 24 },
  { id: 'durif_arques', heros: 'durif', moment: 'avant_chapitre', chapitre: 'arques', titre: 'Le tournoi d\'Arques', episode: 'durif/ep3', son: 'cinematiques/durif/ep3.mp3', duree: 24 },
  { id: 'durif_parrainages', heros: 'durif', moment: 'avant_chapitre', chapitre: 'parrainages', titre: 'Les 500 sceaux', episode: 'durif/ep4', son: 'cinematiques/durif/ep4.mp3', duree: 23 },
  { id: 'durif_vaisseau', heros: 'durif', moment: 'tour_scenarise', chapitre: 'vaisseau_dore', titre: 'Le vaisseau doré', episode: 'durif/ep5', son: 'cinematiques/durif/ep5.mp3', duree: 24 },
  { id: 'durif_rival', heros: 'durif', moment: 'avant_boss', chapitre: 'second_tour', titre: 'Le rival', episode: 'durif/ep6', son: 'cinematiques/durif/ep6.mp3', duree: 24 },
  { id: 'durif_victoire', heros: 'durif', moment: 'victoire', titre: 'La gouvernance pacifique planétaire et cosmique Elvita', episode: 'durif/ep7', son: 'cinematiques/durif/ep7.mp3', duree: 29 },
  { id: 'durif_defaite', heros: 'durif', moment: 'defaite', titre: 'À suivre…', episode: 'durif/ep8', son: 'cinematiques/durif/ep8.mp3', duree: 11 },
];
