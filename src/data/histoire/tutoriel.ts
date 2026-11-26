import type { BotLevel } from '../../bots/bots.ts';
import type { Params } from '../../engine/types.ts';

/**
 * Ce qui doit être là pour qu'une consigne s'affiche : elle ne parle jamais d'une carte absente, et ce qu'elle
 * demande est toujours faisable. Toutes les conditions d'une consigne doivent tenir ; quand elles ne tiennent plus,
 * la consigne est faite.
 * - `carte:X` : X est en boutique avec le budget pour l'acheter, ou en main avec une place sur le plateau.
 * - `boutique:X` : X est en boutique.
 * - `sort:X` : le sort X est en boutique avec le budget pour l'acheter, ou en main.
 * - `triple:X` : de quoi faire le triple de X dans la manche, budget compris.
 * - `echelon:N` : l'échelon N n'est pas atteint, et le budget permet de monter.
 * - `main` : un politique en main, et une place pour le poser.
 * - `achat` : de quoi acheter un politique.
 * - `actualise` : le budget pour le faire.
 * - `budget_vide` : plus rien à dépenser.
 * - `degelee`, `gelee` : la boutique n'est pas gelée, ou l'est.
 * - `dore` : un doré à poser, une Investiture à lancer ou un choix ouvert.
 * - `casserole` : une casserole à acheter ou à poser, et un politique pour la recevoir.
 * - `deuxieme_casserole` : la même chose, et un politique qui en porte déjà une, pas encore oubliée.
 * - `scandale` : un politique en scandale.
 * - `cadenas` : un politique qui ne bouge plus, et deux autres qui bougent.
 * - `plateau_plein` : plus une place sur le plateau.
 */
export type Condition =
  | `carte:${string}`
  | `boutique:${string}`
  | `sort:${string}`
  | `triple:${string}`
  | `echelon:${number}`
  | 'main'
  | 'achat'
  | 'actualise'
  | 'budget_vide'
  | 'degelee'
  | 'gelee'
  | 'dore'
  | 'casserole'
  | 'deuxieme_casserole'
  | 'scandale'
  | 'cadenas'
  | 'plateau_plein';

/**
 * Ce qu'une consigne laisse faire. Le tutoriel est sur des rails : tout autre geste est refusé, sauf ce qui ne coûte
 * rien et ne défait rien, toujours permis : poser un politique de la main, le déplacer, lancer un sort déjà en main,
 * choisir une carte offerte.
 * - `achat` : acheter un politique ; `achat:X`, seulement X.
 * - `sort` : acheter un sort ; `sort:X`, seulement X.
 * - `casserole` : acheter la casserole, et la poser ; `deuxieme_casserole`, seulement sur un politique qui en porte une.
 * - `renvoi` : renvoyer un politique du plateau.
 */
export type Geste =
  | 'achat'
  | `achat:${string}`
  | 'sort'
  | `sort:${string}`
  | 'casserole'
  | 'deuxieme_casserole'
  | 'actualise'
  | 'echelon'
  | 'gel'
  | 'renvoi'
  | 'pret';

/** Une consigne : elle reste à l'écran jusqu'à ce que le joueur l'ait faite, ou que ce qu'elle montre soit parti. */
export interface Etape {
  texte: string;
  si?: Condition[];
  /** Ce qu'elle laisse faire, sur les rails : rien de plus que ce qui est toujours permis, par défaut ; `tout` la fin venue. */
  permis?: Geste[] | 'tout';
  /** Elle est faite par un geste que la vue ne garde pas : un politique déplacé. */
  geste?: 'deplace';
}

/** Les leçons du tutoriel. */
export type Lecon =
  | 'premier_achat'
  | 'premiere_pose'
  | 'combat'
  | 'annonce'
  | 'premier_sort'
  | 'actualise'
  | 'echelon'
  | 'porte_parole'
  | 'immunite'
  | 'fin_de_tour'
  | 'gel'
  | 'gele'
  | 'triple'
  | 'decouvrir'
  | 'casserole_posee'
  | 'echelon_3'
  | 'celebration'
  | 'scandale'
  | 'oubli'
  | 'deplace'
  | 'renvoi'
  | 'victoire';

/**
 * Les rappels, entre deux leçons. Eux aussi sont sur des rails : chacun ne laisse faire que ce qu'il dit. Sur le
 * chemin prévu, il n'en vient que trois : le politique découvert à poser, la dernière pièce à actualiser, Prêt.
 */
export interface Rappels {
  /** Un choix ouvert : trois cartes, une à prendre. */
  choix: string;
  /** Un politique en main, et une place sur le plateau. */
  pose: string;
  /** Un politique en main, et le plateau plein. */
  plein: string;
  /** Du budget, et de quoi acheter un politique. `{budget}` : combien. */
  budget_achat: string;
  /** Du budget, pas assez pour un politique : actualiser. */
  budget: string;
  /** Du budget, et ni achat ni actualisation possibles. */
  depense: string;
  /** Tout est dépensé, et des sorts restent en main. */
  sorts: string;
  /** Tout est dépensé. */
  pret: string;
}

/**
 * Le tutoriel : une partie guidée de quelques minutes, à part de la carrière, sur des rails. Les sept premières manches
 * sont écrites d'un bout à l'autre : la boutique, la découverte, la casserole, et un programme de leçons qui dépense le
 * budget au point près. Seuls les gestes de la consigne passent. Le gel s'apprend une fois, à la manche 4, et il tient :
 * les cartes gelées sont là à la manche 5. La dernière leçon rend la main au joueur, avec du budget à dépenser.
 * Les adversaires sont des débutants, et le joueur a de quoi ne pas perdre. Rien n'est à fermer : chaque consigne
 * s'efface quand elle est faite.
 */
export const TUTORIEL = {
  plateau: 'france3',
  /** Un héros au pouvoir simple : les échelons coûtent 1 de moins. */
  heros: 'attal',
  /** Trois adversaires : à quatre, personne n'affronte un fantôme vide. */
  adversaires: ['debutant', 'debutant', 'debutant'] as BotLevel[],
  /** Budget en moins par manche pour chaque adversaire : qui suit les leçons gagne la plupart de ses combats, dès le premier. */
  malusAdversaires: 1,
  /** Les dégâts restent plafonnés jusqu'au bout : on apprend sans être éliminé. */
  /** Les casseroles n'arrivent qu'à la manche 6, chacune à sa leçon : aucune ne s'invite avant. */
  regles: { startHp: 12, capOffWhenAlive: 1, damageCaps: [[1, 3], [5, 6]], casseroleFromRound: 6 } as Partial<Params>,
  /** Sondages en plus pour le joueur : on apprend sans risque de perdre. */
  bonusJoueur: 30,
  /**
   * La boutique écrite, manche par manche. Aucune de ses cartes ne donne de budget, de carte au hasard ni de politique
   * pris à la boutique : le budget tombe juste. Le premier achat est libre, entre trois politiques sans histoire ; Kazib
   * (Annonce), Delogu (Porte-parole), Guéant (Immunité), Durif (Fin de tour) et Morano (Célébration) arrivent chacun à sa
   * leçon. À la manche 4, deux Kazib restent quand le budget est épuisé : le joueur gèle, et la manche 5 les lui garde.
   * La manche 7 propose de quoi finir en beauté.
   */
  boutique: {
    1: ['leaument', 'lafont', 'thevenoud'],
    2: ['kazib', 'tiberi', 'leaument'],
    3: ['delogu', 'tiberi', 'thevenoud'],
    4: ['gueant', 'durif', 'kazib', 'kazib'],
    5: ['kazib', 'kazib', 'hortefeux', 'rigault'],
    6: ['morano', 'hortefeux', 'rigault', 'boyard'],
    7: ['wauquiez', 'piolle', 'chikirou', 'arthaud'],
  } as Record<number, string[]>,
  /** Ce que propose l'Investiture du doré, à la manche 5 : trois politiques d'échelon 3, simples et forts. */
  decouvertes: { 5: ['chikirou', 'piolle', 'arthaud'] } as Record<number, string[]>,
  /** Les sorts : le Bracelet électronique quand le scandale éclate. */
  sorts: { 7: ['bracelet_electronique'] } as Record<number, string[]>,
  /**
   * La première casserole est un bonus ; la deuxième, sur le même politique, fait scandale et le cloue sur place.
   * Depuis les grades (26 novembre 2026), le Dîner aux homards coûte 2 et le ballon de Dussopt 1.
   */
  casseroles: { 6: 'homards', 7: 'ballon' } as Record<number, string>,
  /**
   * Le programme de chaque manche, dans l'ordre, et ce qu'il coûte. Au-delà de la dernière, la dernière.
   * M1 (3) : un politique (3). M2 (4) : Kazib (3), actualiser (1). M3 (5) : l'échelon (1), Delogu (3), actualiser (1).
   * M4 (6) : Guéant (3), Durif (3), le gel. M5 (7) : deux Kazib (6), actualiser (1). M6 (8) : la casserole (2),
   * l'échelon (2), Morano (3), actualiser (1). M7 (9) : la casserole (1), le Bracelet (1), un renvoi (+1), et 8 à soi.
   */
  programme: {
    1: ['premier_achat', 'premiere_pose', 'combat'],
    2: ['annonce', 'premier_sort', 'actualise'],
    3: ['echelon', 'porte_parole'],
    4: ['immunite', 'fin_de_tour', 'gel', 'gele'],
    5: ['triple', 'decouvrir'],
    6: ['casserole_posee', 'echelon_3', 'celebration'],
    7: ['scandale', 'oubli', 'deplace', 'renvoi', 'victoire'],
    8: ['victoire'],
  } as Record<number, Lecon[]>,
  etapes: {
    premier_achat: {
      texte: 'Votre **budget**, c\'est la pièce dorée : 3 pour commencer, un de plus à chaque manche. Ce qui n\'est pas dépensé est perdu. Un politique coûte 3 : glissez-en un de la boutique vers votre main.',
      si: ['achat'],
      permis: ['achat'],
    },
    premiere_pose: { texte: 'Posez-le sur le plateau. Seuls les politiques du plateau combattent.', si: ['main'] },
    combat: {
      texte: 'Budget à zéro : tout est dépensé, c\'est parfait. Appuyez sur **Prêt**. Le combat se joue tout seul : chacun frappe un ennemi au hasard, de gauche à droite.',
      si: ['budget_vide'],
      permis: ['pret'],
    },
    annonce: {
      texte: 'Les mots en gras disent quand une carte agit. Une **Annonce** agit quand on pose la carte : achetez Anasse Kazib et posez-le.',
      si: ['carte:kazib'],
      permis: ['achat:kazib'],
    },
    premier_sort: {
      texte: 'Son Annonce vous a donné un **Tract**, un sort : glissez-le sur un de vos politiques, il lui donne +1/+1.',
      si: ['sort:tract'],
    },
    actualise: {
      texte: 'Il vous reste 1 de budget. **N\'oubliez jamais d\'actualiser** : la flèche ronde, en haut, renouvelle la boutique pour 1. C\'est comme ça qu\'on trouve ses cartes.',
      si: ['actualise'],
      permis: ['actualise'],
    },
    echelon: {
      texte: 'Montez d\'échelon avec la flèche, en haut : la boutique proposera des politiques plus forts. Le prix baisse à chaque manche d\'attente : ici, 1 seulement.',
      si: ['echelon:2'],
      permis: ['echelon'],
    },
    porte_parole: {
      texte: 'Sébastien Delogu est **Porte-parole** : les ennemis doivent l\'attaquer avant les autres. Achetez-le et posez-le, il protège votre plateau.',
      si: ['carte:delogu'],
      permis: ['achat:delogu'],
    },
    immunite: {
      texte: 'Claude Guéant a l\'**Immunité** : le premier coup qu\'il reçoit est annulé. Elle tombe pendant le combat, et revient au suivant. Achetez-le et posez-le.',
      si: ['carte:gueant'],
      permis: ['achat:gueant'],
    },
    fin_de_tour: {
      texte: 'Sylvain Durif agit en **Fin de tour** : à la fin du recrutement, juste avant le combat, il donne deux fois +1/+1 à un allié au hasard. Achetez-le et posez-le.',
      si: ['carte:durif'],
      permis: ['achat:durif'],
    },
    gel: {
      texte: 'Plus de budget, et deux Anasse Kazib restent en boutique : avec le vôtre, ça ferait trois. **Gelez** la boutique avec le flocon, en haut : à la manche suivante, ses cartes seront encore là. Le gel est gratuit.',
      si: ['budget_vide', 'boutique:kazib', 'degelee'],
      permis: ['gel'],
    },
    gele: {
      texte: 'Boutique gelée : les deux Kazib vous attendent. Appuyez sur **Prêt**.',
      si: ['gelee'],
      permis: ['pret'],
    },
    triple: {
      texte: 'Vos deux Kazib gelés sont restés, et les autres places se sont remplies. Trois exemplaires du même politique fusionnent en un **doré** : stats doublées, et chaque effet compte double. Achetez les deux Kazib.',
      si: ['triple:kazib'],
      permis: ['achat:kazib'],
    },
    decouvrir: {
      texte: 'Posez votre Kazib doré : son Annonce donne deux Tracts au lieu d\'un, et il apporte une **Investiture**. Lancez-la, et choisissez un politique parmi trois, d\'un échelon au-dessus du vôtre.',
      si: ['dore'],
    },
    casserole_posee: {
      texte: 'Une **casserole** ! Achetez-la et posez-la sur un politique : son avantage joue tout de suite, et pour toujours, encore plus fort sur son propriétaire. Son défaut, lui, dort. Pointez-la ensuite, ou touchez son politique : elle montre sa carte.',
      si: ['casserole'],
      permis: ['casserole'],
    },
    echelon_3: {
      texte: 'Le prix de l\'échelon a encore baissé : 2. Montez à l\'échelon 3.',
      si: ['echelon:3'],
      permis: ['echelon'],
    },
    celebration: {
      texte: 'Nadine Morano a une **Célébration**. Si vous gagnez le combat et qu\'elle tient debout, elle joue : l\'Immunité pour un allié au hasard. Achetez-la et posez-la.',
      si: ['carte:morano'],
      permis: ['achat:morano'],
    },
    scandale: {
      texte: 'Une deuxième casserole : posez-la sur le politique qui porte déjà la première. **Scandale** ! Pendant deux manches, les défauts de ses casseroles s\'appliquent : ici, 2 de budget en moins par manche, il ne bouge plus et n\'attaque plus.',
      si: ['deuxieme_casserole'],
      permis: ['deuxieme_casserole'],
    },
    oubli: {
      texte: 'Un scandale ? Pensez au **Bracelet électronique** : achetez-le dans la boutique, pour 1, et lancez-le. Le peuple oublie tout de suite : les défauts s\'en vont, les bonus restent. Sans lui, il faut attendre deux manches.',
      si: ['scandale', 'sort:bracelet_electronique'],
      permis: ['sort:bracelet_electronique'],
    },
    deplace: {
      texte: 'Le cadenas : sous bracelet, il ne bouge plus jusqu\'à la manche suivante. Les autres bougent autour de lui, et l\'ordre compte : glissez un autre politique à une autre place.',
      si: ['cadenas'],
      geste: 'deplace',
    },
    renvoi: {
      texte: 'Plateau plein : sept politiques, pas un de plus. Pour recruter mieux, **renvoyez** le plus faible : glissez-le vers la boutique, il rapporte 1.',
      si: ['plateau_plein'],
      permis: ['renvoi'],
    },
    victoire: {
      texte: 'Vous savez tout. À vous de jouer : à chaque manche, dépensez tout votre budget, actualisez, et gelez ce qui vous plaît. Puis la carrière vous attend.',
      permis: 'tout',
    },
  } as Record<Lecon, Etape>,
  rappels: {
    choix: 'Choisissez une carte parmi les trois : elle va dans votre main.',
    pose: 'Posez votre politique sur le plateau : en main, il ne combat pas.',
    plein: 'Plateau plein : pour poser ce politique, renvoyez-en un plus faible. Glissez-le vers la boutique : il rapporte 1.',
    budget_achat: 'Il vous reste **{budget}** de budget, et ce qui n\'est pas dépensé est perdu : achetez un politique, ou **actualisez** pour 1.',
    budget: 'Il vous reste **{budget}** de budget, et ce qui n\'est pas dépensé est perdu : **actualisez**, la flèche ronde, pour 1.',
    depense: 'Il vous reste **{budget}** de budget : dépensez-le avant le combat.',
    sorts: 'Tout est dépensé. Des sorts restent en main : glissez-les sur vos politiques, ou gardez-les. Puis appuyez sur **Prêt**.',
    pret: 'Tout est dépensé. Appuyez sur **Prêt**.',
  } as Rappels,
  /** Ce qui s'affiche quand un geste est refusé. */
  refus: {
    budget: 'Il vous reste {budget} de budget : dépensez tout avant le combat.',
    geste: 'Pas tout de suite : suivez la consigne du tutoriel.',
  },
};
