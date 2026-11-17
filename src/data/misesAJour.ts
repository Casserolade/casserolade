import type { Card, Casserole, Spell } from '../engine/types.ts';
import { CARTES as CARTES_0_4_0 } from './misesAJour/0.4.0.ts';
import { CARTES as CARTES_0_4_1 } from './misesAJour/0.4.1.ts';
import { CARTES as CARTES_0_4_2 } from './misesAJour/0.4.2.ts';
import { CARTES as CARTES_0_4_3 } from './misesAJour/0.4.3.ts';

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
    version: '0.4.3',
    date: '18 novembre 2026',
    title: 'Salons publics, classement et deux candidats de plus',
    summary: [
      'Les salons publics : un salon ouvert à tous s\'affiche sur l\'accueil, sous le nom que lui donne son hôte. On y entre d\'un clic, on y discute tout de suite, et l\'hôte lance quand il veut : les bots prennent les places vides.',
      'Un salon reste privé si on le veut : on y entre par son lien ou par son code. Tant que la partie n\'est pas lancée, l\'hôte peut l\'ouvrir au public, ou le refermer.',
      'On entre dans un salon même pendant sa partie : on discute avec ceux qui jouent, et on joue la suivante. Le chat suit la table, du salon à la fin de la partie, et dit qui entre et qui part.',
      'L\'hôte tient son salon : il peut couper le chat d\'un joueur, ou l\'exclure, à tout moment, dans le salon comme en partie.',
      'Les parties de salon comptent pour un classement, dès que deux joueurs s\'y affrontent : battre un joueur mieux classé rapporte plus, perdre contre un joueur moins bien classé coûte plus, et les bots ne comptent jamais. La cote donne un rang, de la Salle des fêtes à l\'Élysée, affiché à côté du pseudo.',
      'Toujours sans compte : sur l\'accueil, « Sauvegarder mon profil » télécharge un fichier qui emporte votre rang, vos succès et votre carrière vers un autre navigateur.',
      'Après une partie, « Retour au salon » ramène à la table : qui est là, le chat, les réglages, et la partie suivante.',
      'L\'accueil est refait, et tient dans l\'écran sans défiler : les salons publics et les salons entre amis dans un seul panneau, la carrière puis la partie rapide à côté. Une première visite commence par le tutoriel.',
      'L\'accueil invite à choisir un pseudo ; entré dans un salon sans pseudo, on le choisit sur place.',
      'Les succès sont refaits : 67, en huit rayons, durs et bêtes. Un politique à 2000/2000, une victoire sans perdre un seul sondage, sans actualiser la boutique, avec pile 289 d\'attaque… Les parties en ligne comptent, et ont leur rayon.',
      'À la première place, l\'écran de fin montre votre plateau en carte de victoire, à copier pour Discord, à poster sur X ou à télécharger.',
      'Deux candidats de plus parmi les héros. Juan Branco, « Crépuscule » : les casseroles coûtent 1 de moins, et une défaite rapporte 1 de budget à la manche suivante. Natacha Polony, « Nous sommes la France » : à chaque fin de recrutement, votre premier politique gagne +1/+1, et la première actualisation de chaque manche est gratuite.',
      'Natacha Polony entre aussi en boutique, à l\'échelon 4 de la Société civile. Trois casseroles arrivent : une pour Juan Branco, deux pour elle.',
    ],
    rules: [],
    why: {
      polony: 'Candidate d\'un rassemblement « venu de tous les partis » : à chaque fin de recrutement, elle grandit de +1/+1 par camp différent sur votre plateau.',
      cavale_de_dakar: 'Juan Branco n\'avait pas de casserole.',
      robe_en_chocolat: 'Le Salon du chocolat de 2013 : en scandale, elle fond et tache ses voisins.',
      salauds_face_a_salauds: 'Sa phrase sur le Rwanda, pour laquelle elle a été relaxée : la plus forte de ses deux casseroles, et la plus coûteuse en scandale.',
    },
    cards: CARTES_0_4_3,
  },
  {
    version: '0.4.2',
    date: '15 novembre 2026',
    title: 'Nouveaux plateaux, musique et réglages',
    summary: [
      'Les quatorze plateaux télé sont refaits, chacun d\'après le vrai plateau de son émission : l\'arène de Quotidien, les murs d\'écrans de « Tout beau, tout neuf », les hémicycles de l\'Assemblée et du Sénat, la « fenêtre sur le monde » du 20 heures, la cour de l\'Élysée du débat.',
      'Chaque plateau a son habillage d\'antenne : un bandeau qui défile au pied de l\'écran, avec les bêtises de la chaîne, tirées au hasard à chaque visite, et un carton dans le coin. De temps en temps, quelque chose passe sur le bandeau.',
      'Une musique de fond accompagne la partie : dix morceaux, dans un ordre tiré au hasard. Elle s\'efface sous les vraies voix.',
      'Les sons du jeu et la musique ont chacun leur interrupteur et leur volume. Un nouveau réglage coupe les effets visuels : flashs, lumières qui vacillent, secousses. Sur téléphone, un bouton ouvre ces réglages en bas d\'écran.',
      'Les sondages perdus se lisent sur une courbe qui tombe en travers de la table, d\'autant plus bas que la perte est lourde.',
      'Le coup qui élimine un héros se charge sur le plateau : une boule de votes, puis la casserole. Des bulletins jaillissent du héros battu, des tracts pleuvent sur une déroute.',
      'Un politique n\'explose plus que sur un coup critique. Aucune carte ne change.',
    ],
    rules: [
      {
        term: 'Retour en politique',
        before: 'Meurt, puis se réincarne une fois à sa place, comme sa carte nue avec 1 PV : après son Héritage, s\'il reste de la place.',
        after: 'Meurt, puis se réincarne une fois à sa place, comme sa carte nue avec 1 PV : après son Héritage, s\'il reste de la place. Détruit au recrutement, il revient de même.',
      },
    ],
    why: {},
    cards: CARTES_0_4_2,
  },
  {
    version: '0.4.1',
    date: '14 novembre 2026',
    title: 'Photos libres, sources et affaires en cours',
    summary: [
      'Les têtes du jeu viennent de photos sous licence libre, sauf celles de Yann Bompard, qui n\'a aucun portrait libre. Chacune est créditée, avec son auteur, sa source et sa licence, dans le bestiaire et sur la page À propos.',
      'Les têtes sont découpées plus proprement. Quelques visages disparaissent, faute de photo libre : le politique garde alors sa tête de base.',
      'Une affaire qui n\'est pas jugée pour de bon le dit dans le texte de sa casserole : appel, pourvoi, enquête en cours, non-lieu.',
      'Les épisodes de la carrière de Sylvain Durif ont de nouvelles têtes.',
      'En carrière, l\'épisode qui clôt un chapitre se joue dès la victoire, avant la soirée électorale.',
      'Le bot difficile place mieux ses mots-clés : un Ralliement va là où il sert, jamais deux fois sur le même politique.',
      'La page À propos a ses mentions légales. Aucune carte ne change.',
    ],
    rules: [],
    why: {},
    cards: CARTES_0_4_1,
  },
  {
    version: '0.4.0',
    date: '13 novembre 2026',
    title: 'Réincarnation, Coup de balai et clés de voûte',
    summary: [
      'Le Retour en politique devient une vraie réincarnation : le politique meurt, son Héritage joue, puis il revient comme sa carte, avec 1 PV, s\'il reste de la place.',
      'Nouveau mot-clé, le Coup de balai : l\'attaque touche aussi les voisins de la cible. Le placement compte.',
      'Chaque camp a un montage qui gonfle jusqu\'au bout : Cohn-Bendit compte les Écologistes joués dans la partie, Strauss-Kahn lègue toutes ses stats, Odoul fait grossir le RN de la boutique à chaque débauchage, Vallaud grandit à chaque allié tombé.',
      'Les relances s\'additionnent : Chirac et Seconde délibération, Jadot et Conseil des ministres ; Lassalle fait rejouer Chirac et Jadot. Chirac rejoue les Annonces de ses voisins.',
      'Tous les héros partent à 30 sondages. Seul leur socle électoral, leur armure, les départage : de 0 à 20, à côté des sondages dans la liste des joueurs. Les parties durent deux manches de plus.',
      'Chaque casserole a désormais un défaut qui coûte, et un scandale peut éclabousser ses voisins.',
      'De Gaulle, Giscard, Chirac, Mitterrand et Macron passent au niveau des chefs de camp.',
      'Six nouveaux politiques : Rima Hassan, Élisabeth Borne, Michel Barnier, Alain Juppé, José Bové et Eva Joly. Vingt-deux casseroles, dont quatorze pour le RN, Reconquête et les Écologistes, qui en avaient le moins.',
      'Les camps les plus fournis rendent des cartes : Clémence Guetté, Manon Aubry, Aurore Bergé et Jean-François Copé quittent la boutique. Avec Bové et Joly, les Écologistes passent de 11 à 13 cartes : chaque camp sort à parts plus égales.',
      'En boutique, chaque camp a autant de chances de voir sortir une de ses casseroles. Deux nouveaux sorts et Francis Lalanne en font découvrir ; Lalanne ne se copie plus à chaque victoire.',
      'Les sorts sont répartis de l\'échelon 1 au 6, selon leur force. Deux sorts qui ne servaient presque à rien sont retirés.',
    ],
    rules: [
      {
        term: 'Retour en politique',
        before: 'Revient une fois avec 1 PV, sur place, avec ses gains du combat.',
        after: 'Meurt, puis se réincarne une fois à sa place, comme sa carte nue avec 1 PV : après son Héritage, s\'il reste de la place.',
      },
      { term: 'Coup de balai', after: 'Ses attaques touchent aussi les voisins de sa cible.' },
      {
        term: 'Immunité',
        before: 'Annule le premier coup reçu, puis tombe.',
        after: 'Annule les premiers dégâts reçus, d\'une attaque ou d\'un effet, puis tombe.',
      },
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
        after: 'Un camp de la partie est tiré à égalité, puis une de ses casseroles : un camp qui a beaucoup d\'affaires ne sort pas plus souvent qu\'un autre. Pour celles de vos politiques, il y a le sort « À la une ».',
      },
      { term: 'Découvrez une casserole', after: 'Trois casseroles de la partie au choix, jamais une que vous avez déjà. Elle arrive en main, gratuite.' },
      {
        term: 'Les relances',
        before: 'Un politique n\'était relancé qu\'une fois par manche, quel que soit le relanceur : un sort de relance ne rapportait rien à côté de Chirac ou de Jadot.',
        after: 'Chaque relanceur relance un politique une fois : deux relanceurs s\'additionnent, et un multiplicateur fait rejouer le relanceur (Lassalle avec Chirac ou Jadot).',
      },
      {
        term: 'Les Tracts joués en combat',
        before: 'Ils ne comptaient pas comme des sorts lancés.',
        after: 'Ils comptent, une fois le combat fini : « par Tract lancé » et « Après que vous lancez un sort » les voient.',
      },
      {
        term: 'Une découverte en fin de tour',
        before: 'La première carte était prise d\'office.',
        after: 'Le choix reste ouvert : il s\'affiche au début du recrutement suivant.',
      },
      {
        term: 'Sondages de départ',
        before: '28, plus ou moins selon le héros : de 18 à 37.',
        after: '30 pour tous. Chaque héros y ajoute son socle électoral, son armure : de 0 à 20, d\'autant plus que son pouvoir est discret. Deux manches de plus par partie, en moyenne, pour que les moteurs de fin de partie tournent.',
      },
      { term: 'Cartes par camp', before: 'De 11 (Écologistes) à 17 (Républicains).', after: 'De 13 à 16 : la boutique propose chaque camp à parts plus égales.' },
      {
        term: 'Le premier politique à mourir revient',
        before: 'Le pouvoir de Hollande, Durif et Riner partait sur le premier mort, même un jeton.',
        after: 'Il attend un politique : un jeton tombé ne le consomme pas.',
      },
    ],
    why: {
      hassan: 'Chaque casserole d\'un allié lui rapporte deux Tracts.',
      borne: 'Vingt-trois 49.3 : vos 49.3 se déclenchent deux fois.',
      barnier: 'Son 49.3 donne +2/+2 aux autres, puis il est censuré et se réincarne.',
      juppe: 'Quand le peuple oublie un scandale, le politique revient plus fort.',
      bove: 'Il démonte, et le reste pousse : chaque politique renvoyé fait grossir les Écologistes de la boutique.',
      joly: 'L\'ancienne juge financière fait revenir l\'argent : chaque Écologiste joué rembourse 1 de budget.',
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
      chirac: 'Candidat quatre fois, il revient toujours : à chaque fin de tour, il rejoue les Annonces de ses voisins. On choisit qui placer à côté de lui.',
      mitterrand: '« Je ne vous quitterai pas » : son Héritage reste pour de bon.',
      lalanne: 'Un ridicule en attire un autre : il découvre un Ridicule qui coûte 2 ou moins. Il ne se copie plus à chaque victoire : sa Célébration donne le Retour en politique, comme sa chanson « On se retrouvera ». 4/4 au lieu de 5/6.',
      cohn_bendit: 'Il compte les Écologistes joués dans la partie, et non plus ceux du plateau : son gain grandit tant qu\'on en joue.',
      strauss_kahn: 'Il lègue toutes ses stats, plus seulement son attaque, et grandit de +3/+3 par Socialiste à chaque attaque.',
      vallaud: 'Les Socialistes n\'avaient rien qui grandisse hors du politique de tête : chaque allié tombé le fait grandir pour de bon.',
      odoul: 'Chaque débauchage fait grossir le RN de la boutique, donc le débauchage suivant.',
      maillard: 'Les Ralliements de la Macronie avaient les corps les plus faibles : +2/+2 à l\'hôte.',
      castaner: 'Un corps un peu plus solide.',
      berge: 'Retirée : la Macronie avait plus de cartes que les autres camps, et sortait plus souvent en boutique.',
      guette: 'Retirée : les Insoumis avaient plus de cartes que les autres camps, et sortaient plus souvent en boutique.',
      aubry: 'Retirée : les Insoumis avaient plus de cartes que les autres camps, et sortaient plus souvent en boutique.',
      cope: 'Retiré : les Républicains avaient plus de cartes que les autres camps, et sortaient plus souvent en boutique.',
      fuite_dans_la_presse: 'Une fuite, et l\'affaire sort : trois casseroles au choix.',
      a_la_une: 'Vos politiques font la une : leurs casseroles d\'abord, avec leur bonus de propriétaire.',
      grand_menage: 'Le Coup de balai, sur le politique de votre choix.',
      loi_de_finances: 'Retiré : il ne changeait presque rien à une partie.',
      tribune_libre: 'Retiré : il ne changeait presque rien à une partie.',
    },
    casserolesWhy: 'un vrai défaut pour chacune, qui coûte à tout porteur.',
    cards: CARTES_0_4_0,
  },
];
