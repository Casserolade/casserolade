import type { CinematiqueComposee } from '../cinematique.ts';

/**
 * La carrière de Glucksmann en rapports de laboratoire (22 novembre 2026) : « La Cuisine de recherche du vote utile ».
 * Le Parti socialiste y cuit un candidat : de la farine et un peu d'eau plate, puis de la glu, du gluten, une pâte dans
 * un moule, un soufflé, et enfin un homme. Huit épisodes écrits avec HyperFrames, joués par le lecteur des cinématiques
 * du jeu, courts et secs (de 8 à 18 secondes) : une idée par scène, un vrai fait ou sa vraie voix dans le silence, puis
 * le refrain en deux coups.
 */
export const CINEMATIQUES_GLUCKSMANN: CinematiqueComposee[] = [
  { id: 'glucksmann_intro', heros: 'glucksmann', moment: 'intro', titre: 'Farine, eau plate', episode: 'glucksmann/ep1', son: 'cinematiques/glucksmann/ep1.mp3', duree: 18 },
  { id: 'glucksmann_glu', heros: 'glucksmann', moment: 'avant_chapitre', chapitre: 'europeennes_2019', titre: 'La glu', episode: 'glucksmann/ep2', son: 'cinematiques/glucksmann/ep2.mp3', duree: 14 },
  { id: 'glucksmann_gluten', heros: 'glucksmann', moment: 'avant_chapitre', chapitre: 'europeennes_2024', titre: 'Le gluten', episode: 'glucksmann/ep3', son: 'cinematiques/glucksmann/ep3.mp3', duree: 14 },
  { id: 'glucksmann_moule', heros: 'glucksmann', moment: 'tour_scenarise', chapitre: 'primaire', titre: 'Le moule', episode: 'glucksmann/ep4', son: 'cinematiques/glucksmann/ep4.mp3', duree: 15 },
  { id: 'glucksmann_cuisson', heros: 'glucksmann', moment: 'avant_chapitre', chapitre: 'premier_tour', titre: 'La cuisson', episode: 'glucksmann/ep5', son: 'cinematiques/glucksmann/ep5.mp3', duree: 11 },
  { id: 'glucksmann_avant_boss', heros: 'glucksmann', moment: 'avant_boss', chapitre: 'second_tour', titre: 'Glucksmann', episode: 'glucksmann/ep6', son: 'cinematiques/glucksmann/ep6.mp3', duree: 10 },
  { id: 'glucksmann_victoire', heros: 'glucksmann', moment: 'victoire', titre: 'Même Glucksmann', episode: 'glucksmann/ep7', son: 'cinematiques/glucksmann/ep7.mp3', duree: 9 },
  { id: 'glucksmann_defaite', heros: 'glucksmann', moment: 'defaite', titre: 'Un autre sac', episode: 'glucksmann/ep8', son: 'cinematiques/glucksmann/ep8.mp3', duree: 9 },
];
