/**
 * Une cinématique de carrière : une ligne de données, comme une carte. Le même script se joue en direct dans le jeu
 * (une ligne de temps GSAP) ou se capture avec HyperFrames. Style guignol ou Benny Hill : des marionnettes découpées
 * aux grosses têtes, qui disent d'abord leurs vraies petites phrases, avec leur vraie voix quand le jeu l'a, et des
 * répliques inventées quand rien de vrai ne colle ; l'intrigue passe aussi par le narrateur, les animateurs, la foule,
 * les pancartes, les bandeaux et la pantomime.
 * Rien à fermer : elle se joue seule, un geste la passe, et la carrière enchaîne.
 */

/** Où elle se place dans la carrière. */
export type Moment = 'intro' | 'avant_chapitre' | 'tour_scenarise' | 'avant_boss' | 'victoire' | 'defaite';

/**
 * Le ton. Guignol : le castelet, les marionnettes qui surgissent d'en bas et se donnent la réplique. Benny Hill :
 * tout en accéléré, poursuites en boucle, sur l'air de poursuite du jeu (une musique originale). JT : un faux journal,
 * bandeaux et duplex. Muet : cinéma muet, cartons de texte, piano de bastringue.
 */
export type Style = 'guignol' | 'benny_hill' | 'jt' | 'muet';

/** Musiques du jeu, toutes originales ou du domaine public (jamais l'air de Benny Hill lui-même, protégé). */
export const MUSIQUES = ['poursuite', 'marseillaise_pourrie', 'suspense', 'jingle_info', 'fanfare', 'glas', 'piano_muet', 'cosmique', 'aucune'] as const;
export type Musique = (typeof MUSIQUES)[number];

/**
 * Les décors dessinés pour les cinématiques, en plus des plateaux télé du jeu (leurs ids : `PLATEAUX`, `SECOND_TOUR`).
 * Le castelet est le théâtre de guignol : rideau rouge, et les marionnettes entrent par le bas.
 */
export const DECORS = [
  'castelet', 'elysee', 'assemblee', 'senat', 'conseil_constitutionnel', 'tribunal', 'meeting', 'rue', 'campagne',
  'bureau', 'nuit_electorale', 'espace', 'plage', 'mairie', 'salon',
] as const;
export type DecorDessine = (typeof DECORS)[number];

/** Les accessoires dessinés. Aucun objet ne tombe ni ne s'écrase sur un politique (règle du jeu). */
export const ACCESSOIRES = [
  'urne', 'pupitre', 'micro', 'constitution', 'journal', 'pancarte', 'casserole', 'valise_billets', 'menottes',
  'bracelet', 'drapeau', 'echarpe_tricolore', 'couronne', 'trone', 'hologramme', 'soucoupe', 'cle', 'gateau',
  'telephone', 'dossier', 'balai', 'megaphone', 'rose', 'tracteur', 'portique', 'baton', 'banane', 'carapace', 'aimant', 'escalope', 'porte',
  'canape', 'chat',
] as const;
export type Accessoire = (typeof ACCESSOIRES)[number];

/** Les bruitages, synthétisés par le jeu. */
export const BRUITAGES = [
  'coup', 'masse', 'boing', 'klaxon', 'sifflet', 'applaudissements', 'huees', 'cloche', 'tambour', 'gong', 'chute',
  'pouet', 'sirene', 'teleportation', 'tiroir_caisse', 'bip',
] as const;
export type Bruitage = (typeof BRUITAGES)[number];

export type Bord = 'gauche' | 'droite' | 'haut' | 'bas';
export type Expression = 'base' | 'rire' | 'aie' | 'choc';

/** Le cadre de la caméra : la scène entière, plus serré, ou un gros plan sur un rôle. */
export type Cadre = 'large' | 'serre' | { sur: string };

/**
 * Une action. `x` va de 0 (bord gauche) à 100 (bord droit). `en` : sa durée en secondes. `delai` : son départ, en
 * secondes après le début de son plan. Un rôle est un nom de `distribution`.
 */
/**
 * Comment un personnage se déplace : à pied, en courant (de profil, façon South Park), à toute allure, traîné malgré lui
 * (`glisse` : les pieds glissent, le corps résiste en arrière), ou tiré en arrière (`recule` : il regarde toujours là où
 * il voulait aller, penché vers elle, les bras tendus ; un bracelet électronique le rappelle à l'ordre).
 */
export type Allure = 'marche' | 'court' | 'sprint' | 'glisse' | 'recule';

/**
 * Les poses du corps de papier : tenues jusqu'à la suivante. `salue`, `applaudit` et `danse` bougent pendant `en`
 * secondes (1,6 par défaut), puis il se remet debout.
 */
export const POSES = [
  'debout', 'assis', 'bras_leves', 'bras_croises', 'montre', 'poing_leve', 'mains_sur_la_tete', 'tete_basse', 'penche',
  'a_genoux', 'allonge', 'salue', 'applaudit', 'danse',
] as const;
export type Pose = (typeof POSES)[number];

/** Son allure à l'écran : un hologramme bleu qui grésille, un fantôme pâle, géant, minuscule, la tête en bas, ou normal. */
export type Aspect = 'normal' | 'hologramme' | 'fantome' | 'geant' | 'minuscule' | 'renverse';

/**
 * Une action. `x` va de 0 (bord gauche) à 100 (bord droit). `profondeur` de 0 (devant, en grand) à 100 (au fond, en
 * petit). `en` : sa durée en secondes. `delai` : son départ, en secondes après le début de son plan. Un rôle est un nom
 * de `distribution`. Quand le décor change, tout le monde quitte la scène : on replace ceux qui restent (`place`).
 */
export type Action = { delai?: number } & (
  | { entre: string; par: Bord; x: number; en?: number; allure?: Allure; profondeur?: number }
  | { sort: string; par: Bord; en?: number; allure?: Allure }
  | { va: string; x: number; en?: number; allure?: Allure; profondeur?: number }
  /** Il est là, d'un coup, à cette place : pour poser une scène. */
  | { place: string; x: number; profondeur?: number; regarde?: 'gauche' | 'droite' }
  /** Il se tourne : vers un côté (de profil), ou de face. */
  | { regarde: string; vers: 'gauche' | 'droite' | 'face' }
  | { pose: string; quoi: Pose; en?: number }
  /** Benny Hill : ils se courent après d'un bord à l'autre, en accéléré, autant de traversées que `tours`, puis sortent. */
  | { poursuite: string[]; tours?: number }
  | { saute: string }
  | { tremble: string }
  | { tourne: string }
  /** Il tombe tout seul sur le côté : jamais sous un objet. */
  | { tombe: string }
  /** Il trébuche en avant, bras en l'air, et finit à plat ventre. */
  | { trebuche: string }
  | { releve: string }
  | { s_envole: string }
  /** La tête se retourne, façon South Park, puis revient de face. */
  | { retourne: string }
  /** Une tape sur la tête, de marionnette à marionnette : du guignol, sans objet. */
  | { tape: string; sur: string }
  /**
   * Le bâton de Guignol : il sort un gourdin et le cogne sur la tête de l'autre, `coups` fois (3 par défaut). L'autre
   * s'écrase à chaque coup et repart étourdi, des étoiles autour de la tête.
   */
  | { bastonne: string; sur: string; coups?: number }
  /** Du poil à gratter, lancé par `par` ou tombé du ciel : il se gratte, sautille et gigote. */
  | { gratte: string; par?: string }
  /** Un coup de pied aux fesses : l'autre s'envole en tournoyant et sort du cadre. */
  | { coup_de_pied: string; sur: string }
  /** Des étoiles tournent autour de sa tête. */
  | { etourdi: string }
  /** Il glisse (une peau de banane, une escalope) : les pieds en l'air, il retombe sur le dos. */
  | { derape: string }
  /** Il disparaît d'un coup, dans un petit nuage : un hologramme qui saute, un fantôme. */
  | { disparait: string }
  /** BOUM ! Une explosion de bande dessinée, sur un rôle ou à la place `x`. */
  | { boum: string; x?: number }
  | { aspect: string; comme: Aspect }
  /** Toujours suivie d'un retour à `base` dans la même cinématique. */
  | { visage: string; expression: Expression }
  /**
   * Une réplique en bulle. Avec `source` (média et date), c'est une vraie petite phrase, mot pour mot, et `voix` fait
   * entendre son extrait (`VOIX`, durée dans `DUREES_VOIX`).
   */
  | { dit: string; texte: string; source: string; voix?: string }
  /** Une réplique inventée, au service du scénario : en bulle, sans voix, rien ne la distingue à l'écran. */
  | { dit: string; texte: string; invente: true }
  /** Ce qu'il pense, dans une bulle en nuage. */
  | { pense: string; texte: string }
  /** Le carton du narrateur. */
  | { narrateur: string }
  /** Un animateur du jeu (`ANIMATEURS`) : réplique de parodie inventée. */
  | { animateur: string; texte: string }
  | { foule: string }
  | { pancarte: string; tenue_par?: string }
  | { titre: string; sous_titre?: string }
  /** Le bandeau des chaînes d'info : « ALERTE INFO … ». */
  | { bandeau: string }
  /**
   * Un accessoire déclaré : il apparaît au sol, disparaît, est tenu ou brandi (dans la main de `par`), donné (de `par` à `a`),
   * posé, s'envole des mains de `par` en mille morceaux qui retombent par terre (`vole`), traverse la scène (`traverse`, de
   * `par` : un bord, vers l'autre), descend du plafond à la place `x` (`descend`, un aimant géant), ou file de `par` (un
   * rôle, sinon le bord gauche) jusqu'à `a` et le touche (`touche` : la carapace bleue, BOUM, il tournoie et tombe).
   * Il se porte aussi à la cheville de `par` (`cheville` : le bracelet électronique, qui suit sa jambe partout) ; il
   * bipe (`bipe` : sa lumière clignote en rouge, BIP BIP BIP, et celui qui le porte sursaute) ; posé au sol, il s'en va
   * par le bord `par` (`sort`, le bord droit par défaut : le chat qui quitte la pièce).
   */
  | { accessoire: string; fait: 'apparait' | 'disparait' | 'tient' | 'brandi' | 'donne' | 'pose' | 'vole' | 'traverse' | 'descend' | 'touche' | 'cheville' | 'bipe' | 'sort'; par?: string; a?: string; x?: number }
  | { bruitage: Bruitage }
  | { secousse: 1 | 2 | 3 }
  | { eclair: true }
  | { confettis: true }
  /** Benny Hill : la suite du plan en accéléré, de ce facteur (2 = deux fois plus vite). */
  | { accelere: number }
);

/**
 * Un plan : ses actions partent `a` secondes après le début de la cinématique. `decor` change de scène à ce plan (une
 * coupe sèche, un fondu, ou un volet qui balaie l'écran) : tout le monde quitte la scène d'avant.
 */
export interface Plan {
  a: number;
  decor?: string;
  transition?: 'coupe' | 'fondu' | 'volet';
  cadre?: Cadre;
  actions: Action[];
}

/** Un rôle : un personnage du manifeste du jeu (`manifest.personnages`), ou une pancarte à son nom (`pancarte:Nom`). */
export interface Role {
  role: string;
  personnage: string;
  /** Un autre corps de papier que celui de son camp : `prison` (la tenue rayée), ou le corps d'un autre camp. */
  costume?: string;
  /** Sa taille, 1 par défaut : 0,7 pour un enfant de chœur, 1,4 pour un colosse. */
  taille?: number;
}

export interface Cinematique {
  /** `<heros>_<moment>` ou `<heros>_<chapitre>` : unique dans tout le jeu. */
  id: string;
  /** La carrière à laquelle elle appartient. */
  heros: string;
  moment: Moment;
  /** Le chapitre qu'elle ouvre ou ferme, pour `avant_chapitre`, `tour_scenarise` et `victoire` de chapitre. */
  chapitre?: string;
  style: Style;
  /** Secondes, de 8 à 30. Un geste la passe à tout moment. */
  duree: number;
  /** Le décor du premier plan : un plateau du jeu, un décor dessiné de `DECORS`, ou une photo de `PHOTOS`. */
  decor: string;
  musique?: Musique;
  distribution: Role[];
  accessoires?: { id: string; type: Accessoire; texte?: string }[];
  plans: Plan[];
}

/**
 * Une cinématique écrite avec HyperFrames, jouée par le même lecteur que les marionnettes, jamais en vidéo (règle du
 * 9 novembre 2026) : ses scènes sont un module du jeu, posé sur la page et animé avec le GSAP du jeu, et l'image suit son
 * son. Le shōnen de Durif (le délire en anime, la retombée en marionnette de papier) en est fait. Même place dans la
 * carrière, même règle : elle se joue seule, un geste la passe.
 */
export interface CinematiqueComposee {
  /** `<heros>_<moment>` ou `<heros>_<chapitre>` : unique dans tout le jeu. */
  id: string;
  heros: string;
  moment: Moment;
  /** Le chapitre qu'elle ouvre ou ferme. */
  chapitre?: string;
  /** Son titre d'épisode. */
  titre: string;
  /** Son module, sous `src/client/cutscenes/composed/` (`durif/ep1`), écrit par l'export du projet HyperFrames. */
  episode: string;
  /** Son son, sous `assets/game/` : il donne l'heure à l'image. */
  son: string;
  /** Secondes. */
  duree: number;
}

/** Ce qu'une carrière fait jouer : des marionnettes décrites en données, ou une page HyperFrames ; toujours en direct. */
export type Scene = Cinematique | CinematiqueComposee;
