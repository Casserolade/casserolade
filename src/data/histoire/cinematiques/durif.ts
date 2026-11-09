import type { CinematiqueComposee } from '../cinematique.ts';

/**
 * La carrière de Durif en épisodes de shōnen (9 novembre 2026) : écrits avec HyperFrames et dessinés en direct dans la
 * page, le délire en anime, la retombée en marionnette de papier du jeu. Chaque épisode ouvre ou ferme un chapitre.
 */
export const CINEMATIQUES_DURIF: CinematiqueComposee[] = [
  { id: 'durif_intro', heros: 'durif', moment: 'intro', titre: 'L\'enfant d\'Aldébaran', page: 'cinematiques/durif/ep1.html', son: 'cinematiques/durif/ep1.mp3', duree: 30 },
  { id: 'durif_bugarach', heros: 'durif', moment: 'victoire', chapitre: 'bugarach', titre: 'La fin du monde', page: 'cinematiques/durif/ep2.html', son: 'cinematiques/durif/ep2.mp3', duree: 24 },
  { id: 'durif_arques', heros: 'durif', moment: 'avant_chapitre', chapitre: 'arques', titre: 'Le tournoi d\'Arques', page: 'cinematiques/durif/ep3.html', son: 'cinematiques/durif/ep3.mp3', duree: 24 },
  { id: 'durif_parrainages', heros: 'durif', moment: 'avant_chapitre', chapitre: 'parrainages', titre: 'Les 500 sceaux', page: 'cinematiques/durif/ep4.html', son: 'cinematiques/durif/ep4.mp3', duree: 23 },
  { id: 'durif_vaisseau', heros: 'durif', moment: 'tour_scenarise', chapitre: 'vaisseau_dore', titre: 'Le vaisseau doré', page: 'cinematiques/durif/ep5.html', son: 'cinematiques/durif/ep5.mp3', duree: 24 },
  { id: 'durif_rival', heros: 'durif', moment: 'avant_boss', chapitre: 'second_tour', titre: 'Le rival', page: 'cinematiques/durif/ep6.html', son: 'cinematiques/durif/ep6.mp3', duree: 24 },
  { id: 'durif_victoire', heros: 'durif', moment: 'victoire', titre: 'La gouvernance pacifique planétaire et cosmique Elvita', page: 'cinematiques/durif/ep7.html', son: 'cinematiques/durif/ep7.mp3', duree: 29 },
  { id: 'durif_defaite', heros: 'durif', moment: 'defaite', titre: 'À suivre…', page: 'cinematiques/durif/ep8.html', son: 'cinematiques/durif/ep8.mp3', duree: 11 },
];
