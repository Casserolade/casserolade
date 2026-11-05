import { PARAMS } from '#src/data/params.ts';

/** The words of the game itself, beside those of the cards: the bestiary explains them with the keywords. */
export const GAME_CONCEPTS: Record<string, string> = {
  Sondages: 'Vos points de vie. Le perdant d\'un combat en perd ; à zéro, il est éliminé.',
  Budget: `${PARAMS.startBudget} au départ, +${PARAMS.budgetPerRound} par manche jusqu'à ${PARAMS.maxBudget}. Il ne se garde pas d'une manche à l'autre. Un politique coûte ${PARAMS.buyCost}, actualiser la boutique ${PARAMS.rollCost}, et renvoyer un politique en rend ${PARAMS.sellValue}.`,
  Échelon: `Le niveau de votre boutique, de 1 à ${PARAMS.tierMax}. Monter coûte du budget, 1 de moins à chaque manche d'attente, et la boutique propose alors des politiques plus forts.`,
  Geler: 'Garde la boutique, casserole comprise, pour la manche suivante.',
  Réserve: `Chaque politique existe en nombre limité, partagé par les huit joueurs : ${PARAMS.copies[1]} exemplaires à l'échelon 1, jusqu'à ${PARAMS.copies[PARAMS.tierMax]} au ${PARAMS.tierMax}. Ce que les autres achètent sort moins chez vous.`,
  Doré: 'Trois exemplaires du même politique, en main ou sur le plateau, fusionnent : ses stats doublent, et chaque effet de sa carte compte double, comme le dit son texte doré. Le poser donne une Investiture.',
  Investiture: 'Découvrez un politique de l\'échelon au-dessus du vôtre, celui du moment où vous posez le doré.',
  Casserole: 'Une vraie affaire ou un vrai ridicule, posé sur un politique : un avantage tout de suite, et un bonus de plus sur son propriétaire, écrit sur la carte. Son défaut dort jusqu\'au scandale.',
  Camps: 'Cinq partis par partie, sur sept, plus la Société civile, toujours là. Les camps se parlent par le texte des cartes.',
};
