import type { Camp, CombatResult, Context, Counter, EndOfTurnStep, Hero, HandSpell, Minion, Params, Rng } from './types.ts';

/** Un choix entre trois cartes : serviteurs ou sorts. Les serviteurs proposés sont réservés dans la réserve. */
export interface Offer {
  options: string[];
  kind: 'serviteur' | 'sort';
}

/** Un gain permanent, par camp ou pour tous. */
export interface StatGain {
  camp?: Camp;
  /** Seulement les serviteurs de cette carte (les Suppléants, par exemple). */
  card?: string;
  atk: number;
  hp: number;
}

export interface Player {
  seat: number;
  hero: Hero;
  /** Les héros proposés, tant que le joueur n'a pas choisi. */
  heroOffers: string[] | null;
  /** Combien de héros lui sont proposés : la règle, ou un de plus par succès qui le donne. */
  heroChoices: number;
  hp: number;
  tier: number;
  upgradeCost: number;
  budget: number;
  nextBudgetBonus: number;
  /** Budget maximum gagné en plus (Loi de finances). */
  maxBudgetBonus: number;
  board: Minion[];
  /** Les serviteurs achetés et pas encore posés. Ils ne combattent pas. */
  hand: Minion[];
  /** Les sorts et casseroles en main. Ils comptent dans la limite de la main ; une pile de Tracts compte pour un. */
  spells: HandSpell[];
  shop: string[];
  /** Les sorts de la boutique. */
  shopSpells: string[];
  frozen: boolean;
  casseroleOffer: string | null;
  /** Le choix en cours. */
  discover: Offer | null;
  /** Les choix suivants, dans l'ordre. */
  discoverQueue: Offer[];
  /** Ce que donne un Tract. */
  tract: { atk: number; hp: number };
  /** Gains de camp pour le reste de la partie : ils s'appliquent aussi aux serviteurs à venir. */
  campBuffs: StatGain[];
  /** Gains des serviteurs de la boutique pour le reste de la partie. */
  shopBuffs: StatGain[];
  /** La Fin de tour de la manche, effet par effet : le client la joue sur la table avant le combat. */
  endOfTurnSteps: EndOfTurnStep[];
  /** Les compteurs « cette partie ». */
  counters: Record<Counter, number>;
  /** Budget dépensé depuis le début de la partie : la Dépense le lit. */
  spent: number;
  /** Actualisations gratuites gagnées par des effets. */
  freeRolls: number;
  /** Budget gagné si le prochain combat est perdu (Motion de censure). */
  lossBet: number;
  buysThisRound: number;
  rollsThisRound: number;
  /** Annonces déclenchées pendant cette manche. */
  annoncesThisRound: number;
  /** Les serviteurs déjà relancés cette manche (règle R4). */
  retriggered: Set<number>;
  /** Les effets « une fois par manche » déjà joués : `uid:index`. */
  onceThisRound: Set<string>;
  alive: boolean;
  place: number;
  /** Ses adversaires, manche après manche : un siège, ou -1 pour le fantôme du dernier éliminé. */
  opponents: number[];
  /** Plateaux adverses vus en combat : la seule information sur les autres. */
  seen: { seat: number; heroId: string; round: number; board: Minion[] }[];
  lostLast: boolean;
  /** Ce que le joueur a fait dans la partie : les succès s'en nourrissent. */
  stats: { casseroles: number; scandals: number; forgotten: number; triples: number; spells: number };
}

export interface CombatRecord {
  a: number;
  /** -1 contre le fantôme du dernier éliminé. */
  b: number;
  result: CombatResult;
  /** Égalité d'effectif au début du combat. */
  evenBoards: boolean;
  /** Sondages perdus par chaque camp à cause de ce combat. */
  damage: [number, number];
}

export type GamePhase = 'choix_heros' | 'recrutement' | 'combat' | 'fini';

export interface Game {
  rng: Rng;
  params: Params;
  ctx: Context;
  round: number;
  phase: GamePhase;
  camps: Camp[];
  pool: Map<string, number>;
  /** Les exemplaires de chaque carte au début de la partie : ils ne se créent ni ne se perdent (invariants.ts). */
  poolTotal: ReadonlyMap<string, number>;
  players: Player[];
  nextUid: number;
  lastEliminated: Minion[] | null;
  ranks: number[];
  roundCombats: CombatRecord[];
  heroes: Record<string, Hero>;
  hpSnapshot: Map<number, number[]>;
  combatLog: boolean;
  /** Une boutique écrite d'avance pour un siège : le tutoriel. */
  script: ShopScript | null;
}

/**
 * Le tutoriel écrit la boutique d'un siège, manche par manche, pour que chaque notion arrive à son
 * heure. Les cartes sont prises dans la réserve comme les autres ; une actualisation retire au hasard.
 */
export interface ShopScript {
  seat: number;
  /** Manche → serviteurs proposés. */
  boutique?: Record<number, string[]>;
  /** Manche → sorts proposés. */
  sorts?: Record<number, string[]>;
  /** Manche → casserole proposée. */
  casseroles?: Record<number, string>;
}
