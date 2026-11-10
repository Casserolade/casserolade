import type { Camp, CombatResult, Context, Counter, EndOfTurnStep, Hero, HandSpell, HeroMods, Minion, Params, Rng } from './types.ts';

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
  /** Ses adversaires, manche après manche : un siège, ou -1 pour le fantôme. */
  opponents: number[];
  /** Plateaux adverses vus en combat : la seule information sur les autres. */
  seen: { seat: number; heroId: string; round: number; board: Minion[] }[];
  lostLast: boolean;
  /** Les politiques partis pour un temps (en cellule, enlevés par une soucoupe) : ils reviennent à la manche `back`. */
  away: AwayMinion[];
  /** La quête d'une carrière (parrainages, ultimatum, Congrès), quand ses règles en donnent une. */
  quest: Quest | null;
  /** Le retour d'une carrière : une fois, des sondages à zéro ne l'éliminent pas. Déjà servi : vrai. */
  comebackUsed: boolean;
  /** Ce qui lui est arrivé depuis le début de la manche, dans une carrière : la campagne le raconte. */
  events: ScriptEventNote[];
  /** Ce que le joueur a fait dans la partie : les succès s'en nourrissent. */
  stats: { casseroles: number; scandals: number; forgotten: number; triples: number; spells: number };
}

export interface CombatRecord {
  a: number;
  /** -1 contre le fantôme. */
  b: number;
  /** Contre le fantôme : le héros dont il prend les traits, celui dont il joue le plateau. */
  ghostOf?: string;
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
  /** Le dernier éliminé, son héros et son dernier plateau : le fantôme d'une table en nombre impair. */
  lastEliminated: { heroId: string; board: Minion[] } | null;
  ranks: number[];
  /**
   * Les rencontres de la manche, tirées dès le début du recrutement : chacun voit son prochain adversaire pendant qu'il
   * recrute, comme à Battlegrounds. `null` à la place d'un siège : le fantôme.
   */
  pairs: [number, number | null][];
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
  /**
   * Manche → ce qui arrive au siège au début de cette manche, dans une carrière : un autre pouvoir (`mods`), des points
   * de sondage en plus ou en moins. Le Pen joue avec le pouvoir de Bardella jusqu'à l'arrêt d'appel, puis reprend le sien.
   */
  evenements?: Record<number, ScriptEvent>;
  /** Les règles d'une carrière pour ce siège, tout le chapitre durant. */
  regles?: ScriptRules;
}

/** Ce qui arrive au siège au début d'une manche, dans une carrière. */
export interface ScriptEvent {
  mods?: HeroMods;
  sondages?: number;
  /** Du budget en plus pour cette manche. */
  budget?: number;
  /**
   * Son politique le plus fort ou le plus faible (attaque et PV) quitte le plateau : il ne combat pas, et revient au
   * début de la manche `retour`, doré, ou avec `bonus` en attaque et en PV, pour de bon.
   */
  enleve?: { quoi: 'plus_fort' | 'plus_faible'; retour: number; dore?: boolean; bonus?: number };
  /** L'adversaire du dernier siège quitte la table, s'il est encore en lice et qu'il en reste au moins deux autres. */
  abandon?: boolean;
}

/** Ce que raconte la campagne : un départ, un retour, un abandon, un retour de sondages, une quête qui avance. */
export type ScriptEventKey = 'enleve' | 'revient' | 'abandon' | 'retour' | 'quete' | 'quete_reussie' | 'quete_ratee';

/** Un événement raconté, avec le politique qu'il touche quand il en touche un (parti, revenu). */
export interface ScriptEventNote {
  key: ScriptEventKey;
  cardId?: string;
}

/** Un politique parti pour un temps. */
export interface AwayMinion {
  minion: Minion;
  back: number;
  golden: boolean;
  bonus: number;
}

/**
 * Les règles d'une carrière pour un siège (8 et 9 novembre 2026) : de quoi raconter un tour scénarisé sans toucher aux
 * autres joueurs. Chacune est simple et a sa fin.
 */
export interface ScriptRules {
  /** Monter d'échelon lui est impossible avant cette manche, et coûte `remise` de moins ensuite (Philippot). */
  echelon?: { apres: number; remise: number; motif: string };
  /** Renvoyer un politique de ce camp lui rapporte ce budget en plus (Ruffin). */
  renvoi?: { camp: Camp; budget: number };
  /** Au début de chacun de ses combats, le premier politique adverse perd ses effets pour ce combat (Lassalle chante). */
  silenceAdverse?: boolean;
  /** Une fois, des sondages à zéro ne l'éliminent pas : il repart avec autant (le retour de Hollande). */
  retour?: number;
  /** Ses combats gagnés comptent (parrainages, ultimatum, Congrès). */
  compteur?: WinCounter;
  /** Le chapitre se gagne si ce héros est éliminé avant lui, quelle que soit la place (Roussel devant Mélenchon). */
  devant?: string;
  /** Après le combat de cette manche, la partie s'arrête : classement par sondages, puis par les stats du plateau. */
  finApres?: number;
}

/** Une quête qui compte les combats gagnés. */
export interface WinCounter {
  libelle: string;
  /** Ce que rapporte un combat gagné : 100 parrainages, une voix du Congrès. */
  parVictoire: number;
  cible: number;
  /** Les manches où les combats comptent. Toutes par défaut. */
  de?: number;
  a?: number;
  /** Dans ces manches, une égalité ou une défaite fait échouer tout de suite (l'ultimatum). */
  sansFaute?: boolean;
  /** Pas atteinte à la fin du combat de cette manche : ratée. */
  avant?: number;
  /** Autant de défaites : ratée. */
  defaitesMax?: number;
  /** Ratée, elle l'élimine et perd le chapitre ; sinon, rien ne se passe. */
  eliminatoire: boolean;
  /** Atteinte : la séance est levée, la partie s'arrête et il la gagne (le Congrès). */
  fin?: boolean;
  /** Atteinte : ce qu'il gagne tout de suite. */
  recompense?: { sondages?: number; budget?: number };
}

/** Une quête en cours, telle que le joueur la voit. */
export interface Quest {
  libelle: string;
  valeur: number;
  cible: number;
  defaites: number;
  etat: 'en_cours' | 'reussie' | 'ratee';
  /** Ratée, le chapitre est perdu ; « devant », elle seule décide du chapitre. */
  eliminatoire: boolean;
  decisive: boolean;
}
