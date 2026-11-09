import type { BotLevel } from '../../bots/bots.ts';
import type { Params } from '../../engine/types.ts';
import type { Chapitre, Ligne, Objectif } from './chapitres.ts';
import type { Scene } from './cinematique.ts';

/**
 * La carrière d'un candidat, inspirée de sa vraie histoire politique (8 novembre 2026) : ses vrais moments, un tour
 * scénarisé, un boss, des cinématiques. Une carrière est une ligne de données, pas du code.
 * Les cinématiques sont des situations politiques crédibles qui dérapent (8 novembre 2026) : les personnages comme on les
 * connaît, des répliques inventées au service de l'histoire, une vraie petite phrase quand elle colle. Les faits réels
 * restent exacts, vérifiés et datés. Le mode carrière le dit une fois, à son entrée : ici, on invente.
 */

/** 1 facile … 5 impossible. */
export type Difficulte = 1 | 2 | 3 | 4 | 5;

export interface Fait {
  fait: string;
  /** Média et date, ou lien. */
  source: string;
}

export interface TourScenarise {
  /** Ce que le joueur doit savoir en arrivant, une phrase affichée au début du chapitre. */
  consigne: string;
  /** La règle spéciale, telle qu'elle joue, en une ou deux phrases. */
  regle: string;
  /**
   * « existante » : réalisée avec les leviers du chapitre (contexte, règles, adversaires, rivaux, objectifs).
   * « nouvelle » : il faut coder `spec`.
   */
  mecanique: 'existante' | 'nouvelle';
  /** Une mécanique nouvelle, décrite pour être codée : quand elle se déclenche, ce qu'elle fait, quand elle cesse. */
  spec?: string;
}

export interface ChapitreCarriere {
  /** Unique dans la carrière. */
  id: string;
  /** Le titre du chapitre : l'élection ou le moment. */
  election: string;
  /** L'année ou la période réelle (« 2008 », « 2012-2017 »), ou une date de fiction pour l'intrigue inventée. */
  annee: string;
  /** Les plateaux du chapitre, manche après manche. Le dernier se répète. */
  plateaux: string[];
  /** Le défi, une ligne, affichée avant la partie. */
  decouverte: string;
  /** De 1 à 7 adversaires. */
  adversaires: BotLevel[];
  /** Des héros précis assis à la table (les rivaux de l'époque), dans l'ordre des adversaires. */
  rivaux?: string[];
  /** Vrai : le dernier adversaire est le boss de la carrière. */
  boss?: boolean;
  /** Il faut finir à cette place ou mieux. */
  placeRequise: number;
  regles: Partial<Params>;
  /** Nombre de camps en jeu, dont celui du héros. Tous si absent. */
  camps?: number;
  /** Un contexte imposé (`CONTEXTS`). */
  contexteId?: string;
  /** Les étoiles du chapitre. */
  objectifs: Objectif[];
  /** Les lignes du narrateur et des animateurs pendant la partie (`{heros}`, `{adversaire}`). */
  dialogues: Ligne[];
  /** Le tour scénarisé : un seul chapitre par carrière en a un. */
  scenarise?: TourScenarise;
  /**
   * La règle d'un autre chapitre, quand `scenario` en donne une (la partie qui s'arrête à minuit, les parrainages) : une
   * phrase affichée avant la partie, comme la consigne du tour scénarisé.
   */
  consigne?: string;
  /** Ses règles pour le joueur seul : un autre pouvoir, des sondages, un politique qui part, une quête (voir `Chapitre.scenario`). */
  scenario?: Chapitre['scenario'];
  /** Les cinématiques jouées avant ce chapitre, et après sa victoire (ids de `cinematiques`). */
  avant?: string;
  apres?: string;
}

export interface Carriere {
  heros: string;
  difficulte: Difficulte;
  /** Pourquoi ce rang, une phrase, pour l'équipe : jamais affichée. */
  pourquoi: string;
  /** L'accroche de la carrière, affichée au choix du candidat. */
  accroche: string;
  /** Le boss du dernier chapitre : l'id d'un héros. */
  boss: string;
  /** Vrai quand l'intrigue est une fiction assumée (troisième mandat, soucoupes volantes). */
  fiction: boolean;
  faits: Fait[];
  chapitres: ChapitreCarriere[];
  cinematiques: Scene[];
}
