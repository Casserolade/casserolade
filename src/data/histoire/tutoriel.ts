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
  /** Les casseroles n'arrivent qu'à la manche 5, chacune à sa consigne : aucune ne s'invite avant. */
  regles: { startHp: 12, capOffWhenAlive: 1, damageCaps: [[1, 3], [5, 6]], casseroleFromRound: 5 } as Partial<Params>,
  /** Sondages en plus pour le joueur : on apprend sans risque de perdre. */
  bonusJoueur: 30,
  /**
   * La boutique écrite. Delogu (Porte-parole), Guéant (Immunité) et Durif (Fin de tour) arrivent chacun à leur
   * consigne, et repassent la manche suivante pour qui les aurait manqués ; deux Cheminade au même tour font le triple,
   * pendant le scandale, pour que l'oubli du peuple arrive en dernier, sous les yeux du joueur.
   */
  boutique: {
    1: ['cheminade', 'tiberi', 'leaument'],
    2: ['kazib', 'cheminade', 'tiberi'],
    3: ['cheminade', 'delogu', 'tiberi', 'leaument'],
    4: ['delogu', 'gueant', 'durif', 'leaument'],
    5: ['cheminade', 'gueant', 'durif', 'kazib'],
    6: ['cheminade', 'cheminade', 'durif', 'leaument'],
    7: ['cheminade', 'cheminade', 'kazib', 'leaument'],
  } as Record<number, string[]>,
  sorts: { 2: ['sondage_flatteur'] } as Record<number, string[]>,
  /** La première casserole est un bonus ; la deuxième, sur le même politique, fait scandale et le cloue sur place. */
  casseroles: { 5: 'homards', 6: 'ballon', 7: 'ballon' } as Record<number, string>,
  etapes: [
    { fini: 'premier_achat', texte: 'Achetez un politique : glissez-le de la boutique vers votre main. Il coûte 3 de budget.' },
    { fini: 'premiere_pose', texte: 'Posez-le sur le plateau. Seuls les politiques du plateau combattent.' },
    { fini: 'combat', texte: 'Quand vous avez fini, appuyez sur Prêt. Le combat se joue tout seul : chacun frappe un ennemi au hasard, de gauche à droite.' },
    { fini: 'annonce', texte: 'Les mots en gras disent quand une carte agit. Une **Annonce** agit quand on pose la carte : achetez Anasse Kazib et posez-le.' },
    { fini: 'premier_sort', texte: 'Il vous a donné un **Tract**, un sort. Lancez-le sur un de vos politiques. La boutique vend aussi un sort, à côté des politiques.' },
    { fini: 'actualise', texte: 'Rien ne vous plaît ? Actualisez la boutique avec la flèche ronde, en haut à droite : pour 1 de budget, de nouveaux politiques.' },
    { fini: 'gel', texte: 'Un politique vous plaît, mais le budget manque ? Gelez la boutique avec le flocon : à la manche suivante, elle sera encore là, au lieu d\'être renouvelée.' },
    { fini: 'echelon', texte: 'Montez d\'échelon avec la flèche, en haut : la boutique proposera des politiques plus forts. Le prix baisse à chaque manche d\'attente.' },
    { fini: 'porte_parole', texte: 'Sébastien Delogu est **Porte-parole** : les ennemis doivent l\'attaquer avant les autres. Posez-le, il protège votre plateau.' },
    { fini: 'immunite', texte: 'Claude Guéant a l\'**Immunité** : le premier coup qu\'il reçoit est annulé. Elle tombe pendant le combat, et revient au suivant.' },
    { fini: 'fin_de_tour', texte: 'Sylvain Durif agit en **Fin de tour** : à la fin du recrutement, juste avant le combat, il donne +1/+1 à deux alliés au hasard. Posez-le, puis appuyez sur Prêt pour le voir jouer.' },
    { fini: 'casserole_posee', texte: 'Une casserole ! Posez-la sur un politique : son avantage joue tout de suite, et pour toujours, encore plus fort sur son propriétaire. Son défaut, lui, dort.' },
    { fini: 'scandale', texte: 'Une deuxième casserole sur le même politique : **Scandale** ! Pendant deux manches, les défauts de ses casseroles s\'appliquent : ici, du budget perdu, et il ne bouge plus.' },
    { fini: 'deplace', texte: 'Le cadenas : cloué par son scandale, il garde sa place. Les autres bougent autour de lui, et l\'ordre compte : glissez un autre politique à une autre place.' },
    { fini: 'triple', texte: 'Trois exemplaires du même politique fusionnent en une version dorée : stats doublées, et chaque effet compte double. Achetez des Cheminade.' },
    { fini: 'decouvrir', texte: 'Posez le doré : il vous donne une **Investiture**. Lancez-la, et choisissez une carte parmi trois.' },
    { fini: 'oubli', texte: 'Le peuple finit toujours par oublier : au bout de deux manches, les défauts s\'en vont et les bonus restent. Pressé ? Le **Bracelet électronique** fait oublier tout de suite, mais sous bracelet, le politique ne bouge plus jusqu\'à la manche suivante.' },
    { fini: 'victoire', texte: 'Vous savez tout. Finissez la partie, puis la carrière vous attend.' },
  ] as Etape[],
};
