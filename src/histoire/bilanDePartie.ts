import type { Fait } from '../data/succes.ts';
import type { PlayerView } from '../engine/game.ts';
import type { Camp } from '../engine/types.ts';
import { plusGrosPolitique } from './suiviDePartie.ts';
import type { SuiviDePartie } from './suiviDePartie.ts';

/** Les présidents de la République qui ont leur carte : le Panthéon, et les chefs de camp passés par l'Élysée. */
const PRESIDENTS = new Set(['de_gaulle', 'giscard', 'mitterrand', 'chirac', 'sarkozy', 'hollande', 'macron']);
const GAUCHE: Camp[] = ['insoumis', 'socialistes', 'ecologistes'];
const DROITES: Camp[] = ['republicains', 'rn', 'reconquete'];

/**
 * Une partie qui n'a pas été suivie depuis son début (une page rechargée en route) : ses sondages perdus ne sont pas
 * sus, et comptent comme perdus. Aucun succès « sans perdre un sondage » ne s'obtient ainsi.
 */
const SONDAGES_NON_SUIVIS = 1_000_000;

/** Les faits d'une partie, chacun un nombre : un succès en demande un, entre deux bornes. */
export type Faits = Record<Fait, number>;

/** Ce que la vue du joueur ne dit pas de la partie : sa place, et la table. */
export interface TableDeFin {
  place: number;
  /** Les sièges de la table. */
  joueurs: number;
  /** Les humains encore à table à la fin ; zéro hors ligne. */
  humains: number;
  /** Le joueur est l'hôte d'un salon public. */
  hotePublic: boolean;
}

/**
 * Les faits d'une partie finie, vus du joueur : sa place et sa table, ce que le moteur a compté de ses gestes, ce
 * que la partie a montré en route (`suivi` ; sans lui, la dernière vue en tient lieu), et son plateau de la fin.
 */
export function bilanDePartie(view: PlayerView, suivi: SuiviDePartie | null, table: TableDeFin): Faits {
  const board = view.board;
  const parCamp = new Map<Camp, number>();
  for (const m of board) parCamp.set(m.camp, (parCamp.get(m.camp) ?? 0) + 1);
  const plusPetitCamp = (camps: Camp[]) => Math.min(...camps.map((camp) => parCamp.get(camp) ?? 0));
  const avec = (keyword: PlayerView['board'][number]['keywords'][number]) => board.filter((m) => m.keywords.includes(keyword)).length;
  return {
    place: table.place,
    joueurs: table.joueurs,
    humains: table.humains,
    hote_public: table.hotePublic ? 1 : 0,
    casseroles: view.stats.casseroles,
    scandales: view.stats.scandals,
    oublis: view.stats.forgotten,
    triples: view.stats.triples,
    sorts: view.stats.spells,
    actualisations: view.stats.rolls,
    renvois: view.stats.sold,
    gels: view.stats.frozen,
    depenses: view.stats.spent,
    plus_gros: Math.max(suivi?.plusGros ?? 0, plusGrosPolitique(board)),
    sondages_perdus: suivi?.complet ? suivi.perdus : SONDAGES_NON_SUIVIS,
    sondages_au_plus_bas: Math.min(suivi?.auPlusBas ?? view.hp, view.hp),
    sondages: view.hp,
    manches: view.round,
    echelon: view.tier,
    politiques: board.length,
    dores: board.filter((m) => m.golden).length,
    camps: parCamp.size,
    meme_camp: Math.max(0, ...parCamp.values()),
    gauche_plurielle: plusPetitCamp(GAUCHE),
    union_des_droites: plusPetitCamp(DROITES),
    presidents: board.filter((m) => PRESIDENTS.has(m.cardId)).length,
    porte_parole: avec('porte_parole'),
    immunites: avec('immunite'),
    vedettes: avec('vedette'),
    casseroles_sur_un: Math.max(0, ...board.map((m) => m.casseroles.length)),
    attaque_totale: board.reduce((sum, m) => sum + m.atk, 0),
  };
}
