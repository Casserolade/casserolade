import type { BotLevel } from '../../bots/bots.ts';
import type { Params } from '../../engine/types.ts';
import type { ScriptEvent } from '../../engine/state.ts';
import type { Declencheur } from './chapitres.ts';

/**
 * Ce qui doit être là pour qu'une consigne s'affiche : elle ne parle jamais d'une carte absente, et ce qu'elle
 * demande est toujours faisable. Toutes les conditions d'une consigne doivent tenir.
 * - `carte:X` : X est en boutique avec le budget pour l'acheter, ou en main avec une place sur le plateau.
 * - `boutique:X` : X est en boutique.
 * - `sort:X` : le sort X est en boutique avec le budget pour l'acheter, ou en main.
 * - `triple:X` : de quoi faire le triple de X dans la manche, budget compris.
 * - `main` : un politique en main, et une place pour le poser.
 * - `achat` : de quoi acheter un politique.
 * - `actualise`, `echelon` : le budget pour le faire.
 * - `budget_vide` : plus rien à dépenser.
 * - `dore` : un doré à poser, une Investiture à lancer ou un choix ouvert.
 * - `casserole` : une casserole à acheter ou à poser, et un politique pour la recevoir.
 * - `deuxieme_casserole` : la même chose, et un politique qui en porte déjà une, pas encore oubliée.
 * - `scandale` : un politique en scandale.
 * - `cadenas` : un politique qui ne bouge plus, et deux autres qui bougent.
 */
export type Condition =
  | `carte:${string}`
  | `boutique:${string}`
  | `sort:${string}`
  | `triple:${string}`
  | 'main'
  | 'achat'
  | 'actualise'
  | 'echelon'
  | 'budget_vide'
  | 'dore'
  | 'casserole'
  | 'deuxieme_casserole'
  | 'scandale'
  | 'cadenas';

/**
 * Ce qu'une consigne laisse faire. Le tutoriel est sur des rails : tout autre geste est refusé, sauf poser un
 * politique de la main et choisir une carte offerte, toujours permis.
 * - `achat` : acheter un politique ; `achat:X`, seulement X.
 * - `sort:X` : acheter le sort X, et le lancer.
 * - `casserole` : acheter la casserole, et la poser ; `deuxieme_casserole`, seulement sur un politique qui en porte une.
 * - `renvoi` : renvoyer un politique du plateau.
 */
export type Geste =
  | 'achat'
  | `achat:${string}`
  | `sort:${string}`
  | 'casserole'
  | 'deuxieme_casserole'
  | 'actualise'
  | 'echelon'
  | 'gel'
  | 'deplace'
  | 'renvoi'
  | 'pret';

/** Une consigne : elle reste à l'écran jusqu'à ce que le joueur l'ait faite, ou que ce qu'elle montre soit parti. */
export interface Etape {
  texte: string;
  si?: Condition[];
  /** Ce qu'elle laisse faire, sur les rails : rien d'autre que poser, par défaut ; `tout` la fin venue. */
  permis?: Geste[] | 'tout';
}

/** Les rappels, entre deux leçons : là, le joueur joue librement, mais il dépense tout avant le combat. */
export interface Rappels {
  /** Un choix ouvert : trois cartes, une à prendre. */
  choix: string;
  /** Un politique en main, et le plateau plein. */
  plein: string;
  /** La main se remplit de sorts : les Célébrations en donnent. */
  sorts: string;
  /** Du budget à dépenser. `{budget}` : combien. */
  budget: string;
  /** Tout est dépensé. */
  pret: string;
}

/**
 * Le tutoriel : une partie guidée de quelques minutes, à part de la carrière, sur des rails. Chaque manche a son
 * programme de leçons, dans l'ordre ; la boutique est écrite d'avance pour que chacune arrive à son heure, et seuls les
 * gestes de la leçon en cours sont permis. Entre deux leçons, des rappels : dépenser tout son budget, actualiser, geler.
 * Prêt est refusé tant qu'une leçon attend ou qu'il reste du budget. Les adversaires sont des débutants, et le joueur a
 * de quoi ne pas perdre. Rien n'est à fermer : chaque consigne s'efface quand elle est faite.
 */
export const TUTORIEL = {
  plateau: 'france3',
  /** Un héros au pouvoir simple : les échelons coûtent 1 de moins. */
  heros: 'attal',
  /** Trois adversaires : à quatre, personne n'affronte un fantôme vide. */
  adversaires: ['debutant', 'debutant', 'debutant'] as BotLevel[],
  /** Les dégâts restent plafonnés jusqu'au bout : on apprend sans être éliminé. */
  /** Les casseroles n'arrivent qu'à la manche 6, chacune à sa leçon : aucune ne s'invite avant. */
  regles: { startHp: 12, capOffWhenAlive: 1, damageCaps: [[1, 3], [5, 6]], casseroleFromRound: 6 } as Partial<Params>,
  /** Sondages en plus pour le joueur : on apprend sans risque de perdre. */
  bonusJoueur: 30,
  /**
   * La boutique écrite, manche par manche. Kazib (Annonce), Delogu (Porte-parole), Guéant (Immunité) et Durif (Fin de
   * tour) arrivent chacun à sa leçon. À la manche 4, deux Cheminade restent quand le budget est épuisé : le joueur gèle,
   * et la manche 5 les lui rend avec le troisième (une boutique gelée garde ses cartes, et le script complète).
   */
  boutique: {
    1: ['cheminade', 'tiberi', 'leaument'],
    2: ['kazib', 'cheminade', 'tiberi'],
    3: ['delogu', 'cheminade', 'tiberi'],
    4: ['gueant', 'durif', 'cheminade', 'cheminade'],
    5: ['cheminade', 'cheminade', 'cheminade', 'morano'],
  } as Record<number, string[]>,
  /** Les sorts : un à 1 pour la première manche à sorts, le Bracelet électronique quand le scandale éclate. */
  sorts: { 2: ['sondage_flatteur'], 7: ['bracelet_electronique'] } as Record<number, string[]>,
  /** La première casserole est un bonus ; la deuxième, sur le même politique, fait scandale et le cloue sur place. */
  casseroles: { 6: 'homards', 7: 'ballon' } as Record<number, string>,
  /** La manche du triple : de quoi acheter les trois Cheminade, même sans en avoir gardé. */
  evenements: { 5: { budget: 2 } } as Record<number, ScriptEvent>,
  /** Le programme de chaque manche, dans l'ordre. Au-delà de la dernière, la dernière. */
  programme: {
    1: ['premier_achat', 'premiere_pose', 'combat'],
    2: ['annonce', 'premier_sort', 'actualise'],
    3: ['echelon', 'porte_parole'],
    4: ['immunite', 'fin_de_tour', 'gel'],
    5: ['triple', 'decouvrir'],
    6: ['decouvrir', 'casserole_posee'],
    7: ['casserole_posee', 'scandale', 'oubli', 'deplace'],
    8: ['victoire'],
  } as Record<number, Declencheur[]>,
  etapes: {
    premier_achat: {
      texte: 'Votre **budget**, c\'est la pièce dorée : 3 pour commencer, un de plus à chaque manche. Ce qui n\'est pas dépensé est perdu. Un politique coûte 3 : glissez-en un de la boutique vers votre main.',
      si: ['achat'],
      permis: ['achat'],
    },
    premiere_pose: { texte: 'Posez-le sur le plateau. Seuls les politiques du plateau combattent.', si: ['main'], permis: [] },
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
      texte: 'Il vous a donné un **Tract**, un sort : lancez-le sur un de vos politiques. La boutique vend aussi des sorts, à côté des politiques.',
      si: ['sort:tract'],
      permis: ['sort:tract'],
    },
    actualise: {
      texte: 'Il vous reste 1 de budget. **N\'oubliez jamais d\'actualiser** : la flèche ronde, en haut, renouvelle la boutique pour 1. C\'est comme ça qu\'on trouve ses cartes.',
      si: ['actualise'],
      permis: ['actualise'],
    },
    echelon: {
      texte: 'Montez d\'échelon avec la flèche, en haut : la boutique proposera des politiques plus forts. Le prix baisse à chaque manche d\'attente : ici, 1 seulement.',
      si: ['echelon'],
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
      texte: 'Sylvain Durif agit en **Fin de tour** : à la fin du recrutement, juste avant le combat, il donne +1/+1 à deux alliés au hasard. Achetez-le et posez-le.',
      si: ['carte:durif'],
      permis: ['achat:durif'],
    },
    gel: {
      texte: 'Plus de budget, mais deux Cheminade restent en boutique. **Gelez-la** avec le flocon, en haut : à la manche suivante, ils seront encore là au lieu d\'être renouvelés. Le gel est gratuit : pensez-y dès qu\'une carte vous plaît et que le budget manque.',
      si: ['budget_vide', 'boutique:cheminade'],
      permis: ['gel'],
    },
    triple: {
      texte: 'Les Cheminade gelés sont là, et le troisième avec. Trois exemplaires du même politique fusionnent en une version dorée : stats doublées, et chaque effet compte double. France 3 vous avance 2 de budget : achetez-en jusqu\'à en avoir trois.',
      si: ['triple:cheminade'],
      permis: ['achat:cheminade'],
    },
    decouvrir: {
      texte: 'Posez le doré : il vous donne une **Investiture**. Lancez-la, et choisissez une carte parmi trois, d\'un échelon au-dessus du vôtre.',
      si: ['dore'],
      permis: ['sort:investiture'],
    },
    casserole_posee: {
      texte: 'Une casserole ! Achetez-la et posez-la sur un politique : son avantage joue tout de suite, et pour toujours, encore plus fort sur son propriétaire. Son défaut, lui, dort. Pointez-la ensuite, ou touchez son politique : elle montre sa carte.',
      si: ['casserole'],
      permis: ['casserole'],
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
      permis: ['deplace'],
    },
    victoire: {
      texte: 'Vous savez tout. Finissez la partie : à chaque manche, dépensez tout votre budget, actualisez, et gelez ce qui vous plaît. Puis la carrière vous attend.',
      permis: 'tout',
    },
  } as Partial<Record<Declencheur, Etape>>,
  rappels: {
    choix: 'Choisissez une carte parmi les trois : elle va dans votre main.',
    plein: 'Plateau plein : pour poser ce politique, renvoyez-en un plus faible. Glissez-le vers la boutique : il rapporte 1.',
    sorts: 'Votre main se remplit : **lancez vos sorts** sur vos politiques. Une main pleine ne peut plus rien acheter.',
    budget: 'Il vous reste **{budget}** de budget, et ce qui n\'est pas dépensé est perdu. Achetez, montez d\'échelon, ou **actualisez** pour 1 : de nouveaux politiques. Pas de combat avant d\'avoir tout dépensé.',
    pret: 'Tout est dépensé. Une carte de la boutique vous plaît encore ? **Gelez** avant de partir. Sinon, appuyez sur **Prêt**.',
  } as Rappels,
  /** Ce qui s'affiche quand un geste est refusé. */
  refus: {
    budget: 'Il vous reste {budget} de budget : dépensez tout avant le combat.',
    geste: 'Pas tout de suite : suivez la consigne du tutoriel.',
  },
};
