import { NOM_SALON_LONGUEUR } from '../protocol/publicRooms.ts';

/**
 * Le nom d'un salon public, tel que l'accueil l'affiche à tout le monde : du texte seulement, sur une ligne, que le
 * client n'interprète jamais. Vide une fois nettoyé, il n'y a pas de nom : le salon reste privé.
 */
export function nettoyerNomDeSalon(brut: string | undefined): string | undefined {
  if (brut === undefined) return undefined;
  const propre = brut.replace(/\s+/gu, ' ').replace(/[\p{C}]/gu, '').replace(/ {2,}/g, ' ').trim().slice(0, NOM_SALON_LONGUEUR).trim();
  return propre || undefined;
}
