import type { Card, Casserole, Spell } from '../engine/types.ts';
import { CARTES as CARTES_0_3_9 } from './misesAJour/0.3.9.ts';

/**
 * Les mises à jour et équilibrages, version par version, tels que la page /mises-a-jour les montre : en bref, les
 * règles et mots-clés avant et après, puis les cartes avant et après. Les cartes sont figées par
 * tools/mises_a_jour/instantane.ts ; le texte s'écrit ici, court. À tenir à jour à chaque version.
 */

/** Une carte de casserole telle qu'elle se montre : sa mécanique, sans son fait ni son statut. */
export type CasseroleCard = Omit<Casserole, 'blague' | 'citation' | 'fait' | 'statut' | 'verifie'>;

/** Une carte qui arrive (après seulement), qui change (avant et après), ou qui part (avant seulement). */
export type CardChange<T> = { before?: T; after: T } | { before: T; after?: undefined };

export interface VersionCards {
  cards: CardChange<Card>[];
  casseroles: CardChange<CasseroleCard>[];
  spells: CardChange<Spell>[];
}

export interface RuleChange {
  term: string;
  /** Absente : la règle est nouvelle. */
  before?: string;
  after: string;
}

export interface PatchNote {
  version: string;
  date: string;
  title: string;
  summary: string[];
  rules: RuleChange[];
  /** Pourquoi une carte change, en une ligne, par identifiant de politique, de sort ou de casserole. */
  why: Record<string, string>;
  /** Ce que les casseroles retouchées ont en commun. */
  casserolesWhy?: string;
  cards: VersionCards;
}

/** De la plus récente à la plus ancienne. */
export const MISES_A_JOUR: PatchNote[] = [
  {
    version: '0.3.9',
    date: '13 novembre 2026',
    title: 'Réincarnation, Coup de balai et présidents',
    summary: [
      'Le Retour en politique devient une vraie réincarnation : le politique meurt, son Héritage joue, puis il revient comme sa carte, avec 1 PV, s\'il reste de la place.',
      'Nouveau mot-clé, le Coup de balai : l\'attaque touche aussi les voisins de la cible. Le placement compte.',
      'Chaque casserole a désormais un défaut qui coûte, et un scandale peut éclabousser ses voisins.',
      'De Gaulle, Giscard, Chirac, Mitterrand et Macron passent au niveau des chefs de camp.',
      'Quatre nouveaux politiques, Rima Hassan, Élisabeth Borne, Michel Barnier et Alain Juppé. Dix-huit casseroles, dont dix pour le RN, Reconquête et les Écologistes, qui en avaient le moins.',
      'Les casseroles sortent toutes à égalité en boutique. Deux nouveaux sorts et Francis Lalanne en font découvrir.',
      'Les sorts sont répartis de l\'échelon 1 au 6, selon leur force. Trois sorts qui ne servaient presque à rien sont retirés.',
    ],
    rules: [
      {
        term: 'Retour en politique',
        before: 'Revient une fois avec 1 PV, sur place, avec ses gains du combat.',
        after: 'Meurt, puis se réincarne une fois à sa place, comme sa carte nue avec 1 PV : après son Héritage, s\'il reste de la place.',
      },
      { term: 'Coup de balai', after: 'Ses attaques touchent aussi les voisins de sa cible.' },
      {
        term: 'Les défauts des casseroles',
        before: 'Certains défauts, « perd ses effets » ou « ne bouge plus », ne coûtaient rien à qui n\'avait pas d\'effet ou ne bougeait pas.',
        after: 'Chaque défaut coûte à tout porteur : du budget, des sondages, « n\'attaque plus » ou l\'éclaboussure.',
      },
      { term: 'L\'éclaboussure', after: 'Pendant son scandale, un politique éclabousse ses voisins : −2/−2 en combat, pour les casseroles qui le disent.' },
      { term: 'Après l\'oubli du peuple', after: 'Un nouveau déclencheur : quand le scandale d\'un allié s\'efface, par le temps ou par le Bracelet électronique.' },
      {
        term: 'La casserole de la boutique',
        before: 'Les affaires « à la une » sortaient trois fois plus souvent, et une fois sur deux, celles de vos politiques.',
        after: 'Chaque casserole de la partie sort à égalité. Pour celles de vos politiques, il y a le sort « À la une ».',
      },
      { term: 'Découvrez une casserole', after: 'Trois casseroles de la partie au choix, jamais une que vous avez déjà. Elle arrive en main, gratuite.' },
    ],
    why: {
      hassan: 'Chaque casserole d\'un allié lui rapporte deux Tracts.',
      borne: 'Vingt-trois 49.3 : vos 49.3 se déclenchent deux fois.',
      barnier: 'Son 49.3 donne +2/+2 aux autres, puis il est censuré et se réincarne.',
      juppe: 'Quand le peuple oublie un scandale, le politique revient plus fort.',
      melenchon: 'Il tape sur tout le monde à la fois : Coup de balai, payé par 7/7.',
      poutou: 'Au débat de 2017, il tape sur Fillon et sur Le Pen d\'un même élan.',
      riner: 'La réincarnation repart de sa carte : 6/9 pour compenser.',
      peltier: 'Un peu plus solide.',
      thevenoud: 'Les Socialistes vivent du Retour : compensés après la réincarnation.',
      guedj: 'Les Socialistes vivent du Retour : compensés après la réincarnation.',
      valls: 'Les Socialistes vivent du Retour : compensés après la réincarnation.',
      macron: 'Il amène son transfuge : Darmanin arrive dans votre main.',
      de_gaulle: '« Je vous ai compris » : chaque politique joué ensuite le croit aussi.',
      giscard: 'Sa Chaise vide avait ses PV et 0 d\'attaque ; elle a désormais ses stats : elle tient ce qu\'il tenait.',
      chirac: 'Candidat quatre fois, il revient toujours : les Annonces se rejouent à chaque fin de tour.',
      mitterrand: '« Je ne vous quitterai pas » : son Héritage reste pour de bon.',
      lalanne: 'Un ridicule en attire un autre : il découvre un Ridicule.',
      fuite_dans_la_presse: 'Une fuite, et l\'affaire sort : trois casseroles au choix.',
      a_la_une: 'Vos politiques font la une : leurs casseroles d\'abord, avec leur bonus de propriétaire.',
      grand_menage: 'Le Coup de balai, sur le politique de votre choix.',
      temps_de_parole: 'Retiré : il ne changeait presque rien à une partie.',
      loi_de_finances: 'Retiré : il ne changeait presque rien à une partie.',
      tribune_libre: 'Retiré : il ne changeait presque rien à une partie.',
    },
    casserolesWhy: 'un vrai défaut pour chacune, qui coûte à tout porteur.',
    cards: CARTES_0_3_9,
  },
];
