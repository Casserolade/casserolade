import type { BotLevel } from '../../bots/bots.ts';
import type { Params, PlayerAction } from '../../engine/types.ts';

/**
 * La carrière : un chapitre est une ligne de données, pas du code. Toutes les règles jouent dès le
 * premier chapitre (le tutoriel est à part, dans tutoriel.ts) : chaque élection est un défi, avec
 * son plateau, son contexte imposé, ses adversaires et ses étoiles. Le scénario est intemporel :
 * ni date ni résultat d'élection.
 * Tout le texte est de la narration inventée, à la troisième personne : le joueur incarne un vrai
 * politique, mais on ne lui fait jamais dire une fausse citation.
 */
export type Declencheur =
  | 'debut'
  | 'premier_achat'
  | 'premiere_pose'
  | 'plateau_plein'
  | 'annonce'
  | 'premier_sort'
  | 'actualise'
  | 'gel'
  | 'decouvrir'
  | 'echelon'
  | 'triple'
  | 'casserole_offerte'
  | 'casserole_posee'
  | 'scandale'
  | 'oubli'
  | 'combat'
  | 'combat_gagne'
  | 'combat_perdu'
  | 'sondages_bas'
  | 'victoire'
  | 'defaite';

export interface Ligne {
  quand: Declencheur;
  /** « narrateur », ou l'id d'un animateur. */
  qui: string;
  texte: string;
}

export type Objectif =
  | { type: 'manches_max'; n: number }
  | { type: 'sans_scandale' }
  | { type: 'scandale' }
  | { type: 'triple' }
  | { type: 'casseroles_min'; n: number }
  | { type: 'echelon_min'; n: number }
  | { type: 'sorts_min'; n: number }
  | { type: 'sondages_min'; n: number };

export interface Chapitre {
  id: string;
  election: string;
  /** Les plateaux du chapitre, manche après manche. Le dernier se répète. */
  plateaux: string[];
  /** Le défi du chapitre, une ligne. */
  decouverte: string;
  adversaires: BotLevel[];
  /** Le dernier adversaire est le boss, tiré au sort. */
  boss?: boolean;
  /** Il faut finir à cette place ou mieux pour passer au chapitre suivant. */
  placeRequise: number;
  regles: Partial<Params>;
  /** Nombre de camps en jeu, dont celui du héros. Tous si absent. */
  camps?: number;
  /** Faux : les héros n'ont pas de pouvoir. */
  pouvoirs: boolean;
  /** Tiré au sort parmi les contextes si vrai. */
  contexte?: boolean;
  /** Un contexte imposé : la règle spéciale de cette élection. */
  contexteId?: string;
  /** Actions interdites. Vide partout depuis que la carrière n'est plus un tutoriel. */
  bloque: PlayerAction['t'][];
  objectifs: Objectif[];
  dialogues: Ligne[];
}

export const CHAPITRES: Chapitre[] = [
  {
    id: 'municipales',
    election: 'Les municipales',
    plateaux: ['france3'],
    decouverte: 'Une petite table, et tout le jeu déjà en main.',
    adversaires: ['debutant', 'debutant', 'debutant'],
    placeRequise: 2,
    regles: { startHp: 16 },
    pouvoirs: true,
    bloque: [],
    objectifs: [{ type: 'manches_max', n: 9 }, { type: 'sondages_min', n: 10 }],
    dialogues: [
      { quand: 'debut', qui: 'narrateur', texte: 'Le parti a changé la serrure. {heros} repart de zéro : conseiller municipal, un jeudi soir, sur France 3 Région.' },
      { quand: 'debut', qui: 'local', texte: 'Ce soir, quatre candidats pour un canton. Trois sont venus pour le buffet.' },
      { quand: 'premier_achat', qui: 'local', texte: 'Belle prise pour le canton. Le maire sortant a quitté le plateau.' },
      { quand: 'combat_perdu', qui: 'local', texte: 'On marque une pause. La régie me dit que c\'est le moment de la météo.' },
      { quand: 'victoire', qui: 'narrateur', texte: 'Élu adjoint à la voirie. {heros} coupe un ruban, et Paris commence à entendre parler de ce nom. Ou à s\'en souvenir.' },
      { quand: 'defaite', qui: 'narrateur', texte: 'Battu par un retraité sans étiquette. Le canton est dur. On recommence.' },
    ],
  },
  {
    id: 'regionales',
    election: 'Le conseil régional',
    plateaux: ['hanouna'],
    decouverte: 'La semaine des affaires : des casseroles dès la première manche.',
    adversaires: ['facile', 'facile', 'facile', 'facile', 'facile'],
    placeRequise: 3,
    regles: { startHp: 18 },
    contexteId: 'affaires',
    pouvoirs: true,
    bloque: [],
    objectifs: [{ type: 'casseroles_min', n: 4 }, { type: 'scandale' }],
    dialogues: [
      { quand: 'debut', qui: 'hanouna', texte: 'Ce soir, {heros} sur le plateau ! Personne ne sait pourquoi, mais c\'est CHAUD ! Un chroniqueur pleure déjà.' },
      { quand: 'casserole_posee', qui: 'narrateur', texte: 'Une casserole ! Sur ce plateau, c\'est presque une décoration.' },
      { quand: 'scandale', qui: 'generique_info', texte: 'ALERTE INFO : scandale à la région. Les chaînes d\'info ouvrent un direct.' },
      { quand: 'oubli', qui: 'generique_info', texte: 'ALERTE INFO : on parle d\'autre chose.' },
      { quand: 'victoire', qui: 'narrateur', texte: 'Vice-président de région, chargé des transports scolaires. {heros} découvre les notes de frais.' },
      { quand: 'defaite', qui: 'narrateur', texte: 'Coupé au montage. La région votera sans vous.' },
    ],
  },
  {
    id: 'legislatives',
    election: 'Les législatives',
    plateaux: ['cnews', 'lcp'],
    decouverte: 'Dissolution : à la manche 8, chaque plateau perd son dernier politique.',
    adversaires: ['moyen', 'facile', 'facile', 'facile', 'facile', 'facile', 'facile'],
    placeRequise: 4,
    regles: { startHp: 20 },
    contexteId: 'dissolution',
    pouvoirs: true,
    bloque: [],
    objectifs: [{ type: 'triple' }, { type: 'echelon_min', n: 4 }],
    dialogues: [
      { quand: 'debut', qui: 'praud', texte: '{heros} candidat dans une circonscription imperdable. Moi, je ne fais que poser la question : imperdable pour qui ?' },
      { quand: 'triple', qui: 'praud', texte: 'Trois fois le même, en or. Je vous laisse conclure.' },
      { quand: 'combat_perdu', qui: 'narrateur', texte: 'Le barrage se forme. {heros} appelle ça « une coalition de circonstance ». Les autres appellent ça une majorité.' },
      { quand: 'victoire', qui: 'narrateur', texte: 'Député. Onze personnes regardent {heros} sur LCP, dont neuf par erreur.' },
      { quand: 'defaite', qui: 'narrateur', texte: 'Le barrage a tenu. Contre vous.' },
    ],
  },
  {
    id: 'ministere',
    election: 'Le ministère',
    plateaux: ['bfm', 'c_a_vous'],
    decouverte: 'Remaniement permanent : les sorts coûtent 1 de moins.',
    adversaires: ['moyen', 'moyen', 'facile', 'facile', 'facile', 'facile', 'facile'],
    placeRequise: 4,
    regles: { startHp: 22 },
    contexteId: 'remaniement',
    pouvoirs: true,
    bloque: [],
    objectifs: [{ type: 'sorts_min', n: 5 }, { type: 'sans_scandale' }],
    dialogues: [
      { quand: 'debut', qui: 'generique_info', texte: 'ALERTE INFO : {heros} entre au gouvernement. On retrouve notre envoyé spécial devant le trottoir.' },
      { quand: 'casserole_posee', qui: 'generique_info', texte: 'ALERTE INFO : il a acheté. De nouvelles images nous parviennent.' },
      { quand: 'scandale', qui: 'generique_info', texte: 'ALERTE INFO : le ministre « reste serein ». Il dîne ce soir sur France 5.' },
      { quand: 'victoire', qui: 'narrateur', texte: 'Le remaniement vous épargne. {heros} dîne sur France 5 et dit quelque chose la bouche pleine. Ça reste.' },
      { quand: 'defaite', qui: 'narrateur', texte: 'Démission pour raisons personnelles. Vous passerez plus de temps avec votre avocat.' },
    ],
  },
  {
    id: 'primaire',
    election: 'La primaire',
    plateaux: ['quotidien', 'france2_dimanche'],
    decouverte: 'Primaire ouverte : à la première manche, chacun découvre un politique de l\'échelon 2.',
    adversaires: ['moyen', 'moyen', 'moyen', 'moyen', 'facile', 'facile', 'facile'],
    placeRequise: 3,
    regles: { startHp: 24 },
    contexteId: 'primaire_ouverte',
    pouvoirs: true,
    bloque: [],
    objectifs: [{ type: 'sans_scandale' }, { type: 'sondages_min', n: 10 }],
    dialogues: [
      { quand: 'debut', qui: 'barthes', texte: 'On a retrouvé une vidéo de {heros} en 2014. On a retrouvé toutes les vidéos.' },
      { quand: 'combat_perdu', qui: 'duhamel', texte: 'Vous avez perdu, oui ou non ? Répondez : oui ou non ?' },
      { quand: 'victoire', qui: 'narrateur', texte: 'La primaire est gagnée à 50,3 %, après recomptage, et trois recours. {heros} est candidat.' },
      { quand: 'defaite', qui: 'narrateur', texte: 'Battu d\'une courte tête. Vous appelez à l\'unité, sans le penser.' },
    ],
  },
  {
    id: 'presidentielle',
    election: 'La présidentielle',
    plateaux: ['grand_oral', 'france2_prime', 'tf1_20h'],
    decouverte: 'Douze candidats, un contexte tiré au sort, deux places pour le second tour.',
    adversaires: ['difficile', 'moyen', 'moyen', 'moyen', 'moyen', 'facile', 'facile'],
    placeRequise: 2,
    regles: {},
    pouvoirs: true,
    contexte: true,
    bloque: [],
    objectifs: [{ type: 'manches_max', n: 14 }, { type: 'sondages_min', n: 10 }],
    dialogues: [
      { quand: 'debut', qui: 'narrateur', texte: 'Douze candidats, deux heures, quatre minutes chacun. {heros} récite un chiffre faux avec beaucoup d\'assurance. Il faut finir dans les deux premiers.' },
      { quand: 'sondages_bas', qui: 'generique_info', texte: 'ALERTE INFO : {heros} décroche. Un général à la retraite commente, sur une carte.' },
      { quand: 'victoire', qui: 'narrateur', texte: '20 heures, dimanche soir : deux visages à l\'écran. L\'un des deux est {heros}. Il reste un débat.' },
      { quand: 'defaite', qui: 'narrateur', texte: 'Éliminé au premier tour. Vous appelez à voter, et personne ne vous demande pour qui.' },
    ],
  },
  {
    id: 'second_tour',
    election: 'Le second tour',
    plateaux: ['tf1_second_tour'],
    decouverte: 'Le débat de TF1, en duel.',
    adversaires: ['difficile'],
    boss: true,
    placeRequise: 1,
    regles: { startBudget: 5, startHp: 30, capOffWhenAlive: 2 },
    pouvoirs: true,
    bloque: [],
    objectifs: [{ type: 'sondages_min', n: 12 }, { type: 'manches_max', n: 9 }],
    dialogues: [
      { quand: 'debut', qui: 'bouleau', texte: 'Deux pupitres, deux chronos. {heros} face à {adversaire}. Le temps de parole est parfaitement équilibré. Tout le monde a préparé sa petite phrase.' },
      { quand: 'combat_perdu', qui: 'bouleau', texte: 'Madame, Monsieur, un peu de tenue.' },
      { quand: 'victoire', qui: 'narrateur', texte: 'Élu. {heros} remonte les Champs-Élysées et découvre l\'état des comptes. La campagne est finie, les ennuis commencent.' },
      { quand: 'defaite', qui: 'narrateur', texte: 'Battu au second tour. Vous annoncez vous retirer de la vie politique. Personne ne vous croit, et on a raison.' },
    ],
  },
];

/** L'épilogue : après une victoire contre un boss ordinaire, il revient. */
export const OUTRE_TOMBE: Chapitre = {
  id: 'outre_tombe',
  election: 'D\'outre-tombe',
  plateaux: ['tf1_second_tour'],
  decouverte: 'Il avait dit au revoir, pas adieu.',
  adversaires: ['difficile'],
  boss: true,
  placeRequise: 1,
  regles: { startBudget: 5, startHp: 30, capOffWhenAlive: 2 },
  pouvoirs: true,
  bloque: [],
  objectifs: [{ type: 'sondages_min', n: 8 }],
  dialogues: [
    { quand: 'debut', qui: 'narrateur', texte: 'Soir de victoire. Sur le plateau de TF1, une chaise vide. Quelqu\'un joue de l\'accordéon. La chaise n\'est plus vide.' },
    { quand: 'debut', qui: 'bouleau', texte: 'Valéry Giscard d\'Estaing, d\'outre-tombe. Il a dit au revoir en 1981 : on aurait dû lire les petites lignes.' },
    { quand: 'combat_perdu', qui: 'narrateur', texte: 'Il s\'invite à dîner chez vous ce soir. Mettez un couvert de plus. Il amène des éboueurs.' },
    { quand: 'sondages_bas', qui: 'narrateur', texte: 'Vous sentez ce souffle ? « L\'homme du passif », disait l\'autre. Il l\'a pris au mot : il a tout le passif, et il revient le présenter.' },
    { quand: 'victoire', qui: 'narrateur', texte: 'La chaise est de nouveau vide. Plan fixe. Cette fois, personne ne jouera d\'accordéon. Personne ne vous le garantit, non plus.' },
    { quand: 'defaite', qui: 'narrateur', texte: 'Les diamants étaient versés à des œuvres, il l\'a toujours dit. Votre défaite aussi. Recommencez.' },
  ],
};
