/**
 * Le lore : chaque manche se joue sur un plateau télé, du bas du panier jusqu'au débat final.
 * Purement narratif : un plateau ne change aucune règle, donc il ne touche pas à l'équilibrage.
 * Les grilles bougent : à relire à chaque saison. Dernière vérification : 3 novembre 2026.
 */
export interface Plateau {
  id: string;
  chaine: string;
  emission: string;
  ambiance: string;
}

export const PLATEAUX: Plateau[] = [
  { id: 'france3', chaine: 'France 3 Région', emission: 'Questions pour un champion du canton', ambiance: 'Top ! Vous êtes un candidat que personne ne connaît. Le sujet d\'avant parlait de la foire aux bestiaux.' },
  { id: 'hanouna', chaine: 'W9', emission: 'Tout beau, tout neuf', ambiance: 'Cyril Hanouna vous coupe la parole. Un chroniqueur pleure, on ne sait pas pourquoi.' },
  { id: 'cnews', chaine: 'CNews', emission: 'L\'Heure des pros', ambiance: 'Quatre chroniqueurs d\'accord entre eux, et un cinquième qui est d\'accord plus fort.' },
  { id: 'lcp', chaine: 'LCP', emission: 'Les questions au gouvernement', ambiance: 'Vous êtes enfin compris. Ils sont onze à regarder.' },
  { id: 'public_senat', chaine: 'Public Sénat', emission: 'En séance publique', ambiance: 'Le débat est de très bonne tenue. Personne ne le saura.' },
  { id: 'lci', chaine: 'LCI', emission: '24 h Pujadas', ambiance: 'Un général à la retraite commente votre programme, sur une carte.' },
  { id: 'bfm', chaine: 'BFMTV', emission: 'Face à BFM', ambiance: 'Le bandeau « ALERTE INFO » passe derrière vous. C\'est vous.' },
  { id: 'c_a_vous', chaine: 'France 5', emission: 'C à vous', ambiance: 'On vous sert à dîner. Attention à ce que vous direz la bouche pleine : ça reste.' },
  { id: 'quotidien', chaine: 'TMC', emission: 'Quotidien', ambiance: 'Ils ont retrouvé une vidéo de vous en 2014. Ils ont retrouvé toutes les vidéos.' },
  { id: 'france2_dimanche', chaine: 'France 2', emission: 'Le dimanche politique', ambiance: 'Costume sombre, ton grave, et cinq minutes pour dire que la France va mal.' },
  { id: 'grand_oral', chaine: 'BFMTV et Le Figaro', emission: 'Le Grand Oral', ambiance: 'Vous récitez un chiffre faux avec beaucoup d\'assurance.' },
  { id: 'france2_prime', chaine: 'France 2', emission: 'La grande soirée électorale', ambiance: 'Douze candidats, deux heures, quatre minutes chacun. Et Lassalle.' },
  { id: 'tf1_20h', chaine: 'TF1', emission: 'Le 20 heures', ambiance: 'Vous avez six minutes, et la moitié de la France à table.' },
];

/** Le dernier plateau, réservé aux deux derniers joueurs. */
export const SECOND_TOUR: Plateau = {
  id: 'tf1_second_tour',
  chaine: 'TF1',
  emission: 'Le débat d\'entre-deux-tours',
  ambiance: 'Deux pupitres, deux chronos, des millions de téléspectateurs. Tout le monde a préparé sa petite phrase.',
};

export function plateauFor(round: number, playersAlive: number): Plateau {
  if (playersAlive <= 2) return SECOND_TOUR;
  return PLATEAUX[Math.min(round - 1, PLATEAUX.length - 1)];
}
