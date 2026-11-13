import { MAX_ARMOR } from '#src/data/heroes.ts';
import { PARAMS } from '#src/data/params.ts';

/** The words of the game itself, beside those of the cards: the bestiary explains them with the keywords. */
export const GAME_CONCEPTS: Record<string, string> = {
  Sondages: `Vos points de vie : ${PARAMS.startHp} au départ, pour tous les héros. Le perdant d'un combat en perd, d'autant plus que le vainqueur a un échelon élevé et des survivants ; à zéro, il est éliminé.`,
  'Socle électoral': `L'armure du héros, le bouclier à côté de ses sondages : de 0 à ${MAX_ARMOR} selon le héros, d'autant plus que son pouvoir est discret. Elle encaisse les coups avant les sondages.`,
  Budget: `${PARAMS.startBudget} au départ, +${PARAMS.budgetPerRound} par manche jusqu'à ${PARAMS.maxBudget}. Il ne se garde pas d'une manche à l'autre. Un politique coûte ${PARAMS.buyCost}, actualiser la boutique ${PARAMS.rollCost}, et renvoyer un politique du plateau en rend ${PARAMS.sellValue}.`,
  Échelon: `Le niveau de votre boutique, de 1 à ${PARAMS.tierMax}. Monter coûte du budget, 1 de moins à chaque manche d'attente, et la boutique propose alors des politiques plus forts.`,
  Geler: 'Garde la boutique, casserole comprise, pour la manche suivante. Ses places vides se remplissent.',
  Réserve: `Chaque politique existe en nombre limité, partagé par les huit joueurs : ${PARAMS.copies[1]} exemplaires à l'échelon 1, jusqu'à ${PARAMS.copies[PARAMS.tierMax]} au ${PARAMS.tierMax}. Ce que les autres achètent sort moins chez vous.`,
  Doré: 'Trois exemplaires du même politique, en main ou sur le plateau, fusionnent : ses stats doublent, et chaque effet de sa carte compte double, comme le dit son texte doré. Le poser donne une Investiture.',
  Investiture: 'Découvrez un politique de l\'échelon au-dessus du vôtre, celui du moment où vous posez le doré.',
  Casserole: 'Une vraie affaire ou un vrai ridicule, posé sur un politique : un avantage tout de suite, et un bonus de plus sur son propriétaire, écrit sur la carte. Son défaut dort jusqu\'au scandale.',
  Camps: 'Cinq partis par partie, sur sept, plus la Société civile, toujours là. Les camps se parlent par le texte des cartes.',
  'Pour de bon': 'Un gain « pour de bon » reste après le combat. Les autres gains d\'un combat s\'effacent avec lui : le plateau revient tel qu\'il y est entré.',
  Multiplicateur: 'Une carte qui fait jouer deux fois un type d\'effet : vos Annonces, vos Fins de tour, vos Héritages, vos 49.3, vos Célébrations, vos « Quand il attaque ». Dorée, trois fois. Deux multiplicateurs du même effet ne s\'additionnent pas.',
  Relance: 'Une carte ou un sort qui déclenche l\'effet d\'un autre politique. Un relanceur ne relance le même politique qu\'une fois par manche ; deux relanceurs s\'additionnent, et un multiplicateur fait rejouer le relanceur.',
};
