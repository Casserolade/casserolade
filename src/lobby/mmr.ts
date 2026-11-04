/** Chaque joueur part de là. */
export const MMR_DEPART = 1000;
/** L'écart de MMR qui donne 10 contre 1 dans un duel, comme aux échecs. */
const ECHELLE = 400;
/**
 * Ce qu'un joueur peut gagner ou perdre au plus dans une partie. Premier devant sept
 * joueurs de même niveau : + K/2. Dernier : - K/2.
 */
export const K_MMR = 64;

export interface ResultatMmr {
  mmr: number;
  /** 1 pour le premier. Deux joueurs à la même place font match nul. */
  place: number;
}

/** La chance que `a` finisse devant `b`, d'après leurs MMR. */
export function chanceDevant(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / ECHELLE));
}

/**
 * Les variations de MMR après une partie publique, dans l'ordre des joueurs reçus. Chaque
 * humain est comparé deux à deux à chaque autre, à la manière d'un Elo : finir devant un
 * joueur mieux classé rapporte plus. Les bots ne sont jamais passés ici. Seul, on ne
 * gagne ni ne perd rien.
 */
export function variationsMmr(joueurs: readonly ResultatMmr[], k = K_MMR): number[] {
  const n = joueurs.length;
  if (n < 2) return joueurs.map(() => 0);
  return joueurs.map((moi, i) => {
    let ecart = 0;
    joueurs.forEach((autre, j) => {
      if (i === j) return;
      const score = moi.place < autre.place ? 1 : moi.place === autre.place ? 0.5 : 0;
      ecart += score - chanceDevant(moi.mmr, autre.mmr);
    });
    return Math.round((k * ecart) / (n - 1));
  });
}

/** Le MMR ne descend jamais sous zéro. */
export function appliquerVariation(mmr: number, variation: number): number {
  return Math.max(0, mmr + variation);
}
