import type { Action, Camp, Keyword } from '../engine/types.ts';

/**
 * Le personnage que joue un bot : une ligne de données par héros.
 * Une personnalité oriente les choix (camp, goûts, rythme). Elle ne change pas la qualité des
 * décisions, qui dépend du niveau, et ne donne aucun avantage caché.
 */
export interface Personnalite {
  heroId: string;
  /** Camp de prédilection. Si ce camp n'est pas dans la partie, le bot en choisit un autre. */
  camp: Camp | null;
  /** Chance de ne jurer que par ce camp pendant toute la partie. */
  purete: number;
  /** Attachement à un camp, de 0 à 1. */
  fidelite: number;
  /** Rythme de montée : +1 fonce, -1 traîne. */
  tempo: number;
  /** Goût pour les casseroles, de 0 à 1. */
  casseroles: number;
  gouts?: {
    motsCles?: Partial<Record<Keyword, number>>;
    effets?: Partial<Record<Action['do'], number>>;
    camps?: Partial<Record<Camp, number>>;
  };
}

const LIGNES: Personnalite[] = [
  { heroId: 'zemmour', camp: 'reconquete', purete: 0.7, fidelite: 1, tempo: 1, casseroles: 0.5, gouts: { motsCles: { polemique: 6 } } },
  { heroId: 'melenchon', camp: 'insoumis', purete: 0.7, fidelite: 1, tempo: 0, casseroles: 0.4, gouts: { effets: { invoquer: 3 } } },
  { heroId: 'lepen', camp: 'rn', purete: 0.6, fidelite: 0.9, tempo: 0, casseroles: 0.4, gouts: { effets: { transmettre: 3 } } },
  { heroId: 'bardella', camp: 'rn', purete: 0.5, fidelite: 0.8, tempo: 1, casseroles: 0.3, gouts: { effets: { transmettre: 3 } } },
  { heroId: 'tondelier', camp: 'ecologistes', purete: 0.7, fidelite: 1, tempo: 0, casseroles: 0.2, gouts: { effets: { buff: 2 } } },
  { heroId: 'hollande', camp: 'socialistes', purete: 0.4, fidelite: 0.7, tempo: 0, casseroles: 0.5, gouts: { motsCles: { retour: 5 } } },
  { heroId: 'glucksmann', camp: 'socialistes', purete: 0.3, fidelite: 0.6, tempo: 0, casseroles: 0.3, gouts: { motsCles: { retour: 3 } } },
  { heroId: 'retailleau', camp: 'republicains', purete: 0.6, fidelite: 0.9, tempo: 0, casseroles: 0.3, gouts: { motsCles: { porte_parole: 4, immunite: 3 } } },
  { heroId: 'sarkozy', camp: 'republicains', purete: 0.3, fidelite: 0.6, tempo: 1, casseroles: 1, gouts: { motsCles: { immunite: 3 } } },
  { heroId: 'balkany', camp: 'republicains', purete: 0.1, fidelite: 0.5, tempo: 0, casseroles: 0.9, gouts: { motsCles: { immunite: 2 } } },
  { heroId: 'philippe', camp: 'macronie', purete: 0.3, fidelite: 0.6, tempo: 0, casseroles: 0.3, gouts: { effets: { budget: 5 } } },
  { heroId: 'attal', camp: 'macronie', purete: 0.2, fidelite: 0.5, tempo: 1, casseroles: 0.3, gouts: { effets: { budget: 3 } } },
  { heroId: 'macron', camp: null, purete: 0, fidelite: 0, tempo: 0, casseroles: 0.5, gouts: { motsCles: { ni_droite_ni_gauche: 5 }, camps: { civile: -4 } } },
  // Le boss du mode histoire : il ne se lie à aucun camp, et préfère ceux qui reviennent et les anciens.
  { heroId: 'giscard', camp: null, purete: 0, fidelite: 0.5, tempo: 0, casseroles: 0.4, gouts: { motsCles: { retour: 4 }, camps: { civile: 2 } } },
  { heroId: 'lassalle', camp: null, purete: 0, fidelite: 0.5, tempo: 0, casseroles: 0.3, gouts: { camps: { civile: 2 } } },
  // Les candidats de 2027 entrés comme héros le 4 novembre 2026.
  { heroId: 'roussel', camp: null, purete: 0, fidelite: 0.4, tempo: 0, casseroles: 0.3, gouts: { camps: { civile: 2 }, effets: { budget: 2 } } },
  { heroId: 'ruffin', camp: 'insoumis', purete: 0.3, fidelite: 0.6, tempo: 0, casseroles: 0.3, gouts: { effets: { jouer_tract: 2 } } },
  { heroId: 'bertrand', camp: 'republicains', purete: 0.4, fidelite: 0.7, tempo: 1, casseroles: 0.3, gouts: { motsCles: { immunite: 2 } } },
  { heroId: 'lisnard', camp: 'republicains', purete: 0.4, fidelite: 0.7, tempo: 0, casseroles: 0.2, gouts: { effets: { budget: 2 } } },
  { heroId: 'dupont_aignan', camp: 'reconquete', purete: 0.5, fidelite: 0.8, tempo: 0, casseroles: 0.3, gouts: { effets: { buff: 2 } } },
  { heroId: 'philippot', camp: 'reconquete', purete: 0.5, fidelite: 0.8, tempo: 0, casseroles: 0.4, gouts: { motsCles: { polemique: 3 } } },
  { heroId: 'arthaud', camp: null, purete: 0, fidelite: 0.5, tempo: -1, casseroles: 0.1, gouts: { camps: { civile: 2 } } },
  { heroId: 'asselineau', camp: 'reconquete', purete: 0.6, fidelite: 0.9, tempo: 1, casseroles: 0.2, gouts: { effets: { buff: 2 } } },
  { heroId: 'cazeneuve', camp: 'socialistes', purete: 0.4, fidelite: 0.7, tempo: 0, casseroles: 0.2, gouts: { motsCles: { porte_parole: 3 } } },
  { heroId: 'bouamrane', camp: 'socialistes', purete: 0.3, fidelite: 0.6, tempo: 0, casseroles: 0.3, gouts: { effets: { invoquer: 2 } } },
  { heroId: 'batho', camp: 'ecologistes', purete: 0.6, fidelite: 0.9, tempo: 0, casseroles: 0.1, gouts: { effets: { buff: 2 } } },
  { heroId: 'kazib', camp: null, purete: 0, fidelite: 0.5, tempo: 0, casseroles: 0.2, gouts: { camps: { civile: 2 } } },
  { heroId: 'durif', camp: null, purete: 0, fidelite: 0.3, tempo: -1, casseroles: 0.4, gouts: { motsCles: { retour: 3 }, camps: { civile: 2 } } },
  { heroId: 'lalanne', camp: null, purete: 0, fidelite: 0.3, tempo: 0, casseroles: 0.5, gouts: { effets: { transmettre: 2 }, camps: { civile: 2 } } },
];

export const PERSONNALITES: Record<string, Personnalite> = Object.fromEntries(LIGNES.map((p) => [p.heroId, p]));
