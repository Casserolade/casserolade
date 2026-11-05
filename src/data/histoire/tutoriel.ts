import type { BotLevel } from '../../bots/bots.ts';
import type { Params } from '../../engine/types.ts';
import type { Declencheur } from './chapitres.ts';

/** Une consigne : elle reste à l'écran jusqu'à ce que le joueur l'ait faite. */
export interface Etape {
  /** Ce que le joueur doit avoir fait, vu depuis sa vue. */
  fini: Declencheur;
  texte: string;
}

/**
 * Le tutoriel : une partie guidée de quelques minutes, à part de la carrière. La boutique est
 * écrite d'avance pour que chaque notion arrive à son heure ; les adversaires sont des débutants,
 * et le joueur a de quoi ne pas perdre. Rien n'est à fermer : chaque consigne s'efface quand elle
 * est faite. Un tutoriel est une ligne de données, comme une carte.
 */
export const TUTORIEL = {
  plateau: 'france3',
  /** Un héros au pouvoir simple : les échelons coûtent 1 de moins. */
  heros: 'attal',
  /** Trois adversaires : à quatre, personne n'affronte un fantôme vide. */
  adversaires: ['debutant', 'debutant', 'debutant'] as BotLevel[],
  /** Les dégâts restent plafonnés jusqu'au bout : on apprend sans être éliminé. */
  regles: { startHp: 12, capOffWhenAlive: 1, damageCaps: [[1, 3], [5, 6]] } as Partial<Params>,
  /** Sondages en plus pour le joueur : on apprend sans risque de perdre. */
  bonusJoueur: 30,
  boutique: {
    1: ['cheminade', 'tiberi', 'leaument'],
    2: ['kazib', 'cheminade', 'tiberi'],
    3: ['cheminade', 'delogu', 'tiberi', 'leaument'],
    4: ['cheminade', 'delogu', 'tiberi', 'leaument'],
    5: ['cheminade', 'delogu', 'kazib', 'leaument'],
  } as Record<number, string[]>,
  sorts: { 2: ['sondage_flatteur'] } as Record<number, string[]>,
  casseroles: { 3: 'homards', 4: 'homards', 5: 'lapsus', 6: 'lapsus' } as Record<number, string>,
  etapes: [
    { fini: 'premier_achat', texte: 'Achetez un politique : glissez-le de la boutique vers votre main. Il coûte 3 de budget.' },
    { fini: 'premiere_pose', texte: 'Posez-le sur le plateau. Seuls les politiques du plateau combattent.' },
    { fini: 'combat', texte: 'Quand vous avez fini, appuyez sur Prêt. Le combat se joue tout seul : chacun frappe un ennemi au hasard, de gauche à droite.' },
    { fini: 'annonce', texte: 'Les mots en gras disent quand une carte agit. Une Annonce agit quand on pose la carte : achetez Anasse Kazib et posez-le.' },
    { fini: 'premier_sort', texte: 'Il vous a donné un Tract, un sort. Lancez-le sur un de vos politiques. La boutique vend aussi un sort, à côté des politiques.' },
    { fini: 'actualise', texte: 'Rien ne vous plaît ? Actualisez la boutique avec la flèche ronde, en haut à droite : pour 1 de budget, de nouveaux politiques.' },
    { fini: 'gel', texte: 'Un politique vous plaît, mais le budget manque ? Gelez la boutique avec le flocon : à la manche suivante, elle sera encore là, au lieu d\'être renouvelée.' },
    { fini: 'echelon', texte: 'Montez d\'échelon avec la flèche, en haut : la boutique proposera des politiques plus forts. Le prix baisse à chaque manche d\'attente.' },
    { fini: 'casserole_posee', texte: 'Une casserole ! C\'est un bonus, et son propriétaire en tire encore plus. Achetez-la et posez-la sur un politique.' },
    { fini: 'scandale', texte: 'Une deuxième casserole sur le même politique : scandale. Pendant deux manches, les défauts de ses casseroles s\'appliquent.' },
    { fini: 'triple', texte: 'Trois exemplaires du même politique fusionnent en une version dorée. Achetez des Cheminade.' },
    { fini: 'decouvrir', texte: 'Posez le doré : il vous donne une Investiture. Lancez-la, et choisissez une carte parmi trois.' },
    { fini: 'oubli', texte: 'Le peuple finit toujours par oublier : au bout de deux manches, les défauts s\'en vont et les bonus restent.' },
    { fini: 'victoire', texte: 'Vous savez tout. Finissez la partie, puis la carrière vous attend.' },
  ] as Etape[],
};
