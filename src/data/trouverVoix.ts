import { VOIX } from './voix.ts';

/** Minuscules, sans accents ni ponctuation : « Qu'est-ce que » et « qu est ce que » se valent. */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** L'extrait à jouer quand cette casserole tombe : seulement s'il dit ce qu'elle raconte. */
export function voixPourCasserole(casserole: string): string | null {
  return VOIX.find((v) => v.casserole === casserole)?.fichier ?? null;
}

/**
 * L'extrait à jouer avec la bulle de cette personne : seulement si la bulle contient les mots de
 * l'extrait. Sinon la bulle reste muette, jamais une autre phrase de la même personne.
 */
export function voixPourPhrase(personne: string, texte: string): string | null {
  const bulle = ` ${normaliser(texte)} `;
  return VOIX.find((v) => v.personne === personne && bulle.includes(` ${normaliser(v.phrase)} `))?.fichier ?? null;
}
