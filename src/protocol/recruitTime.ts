/**
 * Le temps de recrutement de chaque manche, partagé par le serveur et les parties en local :
 * 75 secondes à la première manche, puis 15 de plus à chaque manche, jusqu'à 120 secondes, comme
 * à Battlegrounds (retour de l'utilisateur, 3 novembre 2026 : « bien trop court »). Prêt l'écourte.
 */
export function recruitTimeMs(round: number): number {
  return Math.min(120_000, 60_000 + round * 15_000);
}
