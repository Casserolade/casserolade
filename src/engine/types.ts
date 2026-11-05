export type Camp =
  | 'insoumis'
  | 'socialistes'
  | 'ecologistes'
  | 'macronie'
  | 'republicains'
  | 'rn'
  | 'reconquete'
  | 'civile';

/** Les mots-clés : ce sont des états, visibles sur le médaillon. */
export type Keyword =
  /** Bouclier divin : annule le premier coup reçu. */
  | 'immunite'
  /** Provocation : doit être attaqué en priorité. */
  | 'porte_parole'
  /** Furie des vents : attaque deux fois. */
  | 'cumul'
  /** Toxicité : détruit le premier serviteur qu'il blesse, puis se perd. */
  | 'polemique'
  /** Réincarnation : revient une fois avec 1 PV. */
  | 'retour'
  /** Compte comme un serviteur de chaque camp, sauf la Société civile. */
  | 'ni_droite_ni_gauche'
  /** Magnétique : depuis la main, peut se poser sur un allié pour fusionner avec lui. */
  | 'ralliement'
  /** Célèbre en priorité, s'il survit. */
  | 'vedette';

/**
 * Les déclencheurs. Ceux du recrutement sont le cœur du jeu : c'est là que les plateaux grandissent.
 * Ceux du combat restent rares et lisibles.
 */
export type Trigger =
  // Recrutement
  /** Cri de guerre : quand on le joue depuis la main. */
  | 'annonce'
  /** À la fin du recrutement. */
  | 'fin_tour'
  /** Au début du recrutement. */
  | 'debut_tour'
  /** Quand vous jouez un autre serviteur (du camp `camp`, si précisé). */
  | 'joue'
  /** Quand on le renvoie. */
  | 'vente'
  /** Quand vous renvoyez un autre serviteur. */
  | 'vente_allie'
  /** Après que vous lancez un sort (le sort `card`, si précisé). Un Tract joué par un effet compte. */
  | 'sort'
  /** Quand vous actualisez la boutique. */
  | 'actualise'
  /** Après que vous débauchez un serviteur de la boutique. */
  | 'debauche'
  /** Après que vous ralliez un serviteur sur un allié (cible `joue` : l'hôte). */
  | 'rallie'
  /** Quand un de vos serviteurs reçoit une casserole. */
  | 'casserole_recue'
  /** Chaque fois que vous avez dépensé `n` budget. */
  | 'depense'
  // Après le combat
  /** S'il célèbre la victoire. */
  | 'celebration'
  /** S'il répond après une défaite. */
  | 'droit_de_reponse'
  // Combat
  /** Début du combat : le 49.3. */
  | 'debut_combat'
  /** Râle d'agonie : à sa mort, en combat ou au recrutement. */
  | 'heritage'
  /** Après avoir subi des dégâts, s'il survit. */
  | 'riposte'
  /** Quand il attaque. */
  | 'meeting'
  /** Quand il tue un ennemi en attaquant, et qu'il survit. */
  | 'tue'
  /** Vengeance : après la mort de `n` alliés. */
  | 'revanche'
  /** Après qu'un allié perd son Immunité. */
  | 'immunite_perdue'
  /** Effet permanent, tant qu'il est là. */
  | 'aura';

export type Target =
  | 'soi'
  | 'voisins'
  /** Les alliés du même camp que lui (lui compris). */
  | 'meme_camp'
  /** Les alliés du camp `camp` (lui compris). */
  | 'camp'
  | 'allies'
  /** Les alliés sauf lui. */
  | 'autres'
  /** Les autres alliés du camp `camp`. */
  | 'autres_camp'
  | 'premier_allie'
  | 'dernier_allie'
  | 'allie_suivant'
  /** Vos serviteurs dorés. */
  | 'dores'
  /** Un allié choisi par le joueur : Annonce, sort. Relancée, l'Annonce vise un autre allié au hasard. */
  | 'cible'
  /** Un autre allié au hasard (du camp `camp`, si précisé). */
  | 'aleatoire'
  /** Le serviteur qui vient d'être joué, ou qui vient de recevoir une casserole. */
  | 'joue'
  /** Le serviteur qui vient de perdre son Immunité, ou la victime (déclencheur `tue`). */
  | 'declencheur'
  /** Un serviteur de votre main, au hasard. Depuis un combat : appliqué après le combat. */
  | 'main'
  /** Tous les serviteurs de votre main. */
  | 'toute_la_main'
  | 'premier_ennemi'
  | 'dernier_ennemi'
  | 'tous_ennemis'
  /** Un ennemi au hasard. */
  | 'ennemi_aleatoire'
  /** Le joueur lui-même : budget, cartes en main, règles. */
  | 'joueur';

/** Le serviteur de la boutique visé par un débauchage. */
export type ShopPick = 'plus_faible' | 'plus_fort';

/** Ce qu'un joueur compte pendant la partie : les cartes « cette partie » le lisent. */
export type Counter = 'tracts' | 'ecologistes_joues' | 'dores_joues' | 'casseroles' | 'debauchages';

export type Action =
  | { do: 'buff'; atk: number; hp: number }
  | { do: 'buff_par_allie'; atk: number; hp: number }
  /** +atk/+hp par camp différent parmi vos serviteurs. */
  | { do: 'buff_par_camp'; atk: number; hp: number }
  /** +atk/+hp par Ralliement que la cible a reçu. */
  | { do: 'buff_par_ralliement'; atk: number; hp: number }
  | { do: 'degats'; value: number }
  | { do: 'invoquer'; token: string; count: number }
  /** `plus_tard` : au début de la manche suivante. */
  | { do: 'budget'; value: number; plus_tard?: boolean }
  | { do: 'mot_cle'; keyword: Keyword }
  | { do: 'retirer'; keyword: Keyword }
  /** Donne le mot-clé s'il manque, le retire s'il est là (Temps de parole). */
  | { do: 'basculer'; keyword: Keyword }
  | { do: 'exiler' }
  /** Le peuple oublie tout de suite le scandale le plus long. Il ne bouge plus. */
  | { do: 'oublier' }
  /** À l'allié suivant (le premier s'il est le dernier). `tout` : donne ses stats ; sinon son attaque. */
  | { do: 'transmettre'; tout?: boolean }
  /** Ajoute une carte à la main : un serviteur, un sort, `sort_aleatoire`, ou `copie` de lui-même (prise dans la réserve, règle R3). */
  | { do: 'carte'; card: string; count: number }
  /** Propose trois cartes. `echelon` : relatif à votre échelon. `declencheur` : serviteurs qui ont cet effet. */
  | { do: 'decouvrir'; quoi: 'serviteur' | 'sort'; camp?: Camp; echelon?: number; declencheur?: Trigger }
  /** Les serviteurs du camp `camp` (tous si absent) ont +atk/+hp pour le reste de la partie, ceux à venir compris. */
  | { do: 'camp_buff'; atk: number; hp: number }
  /** Les serviteurs de la boutique (du camp `camp`) ont +atk/+hp pour le reste de la partie. */
  | { do: 'boutique_buff'; atk: number; hp: number }
  /** Vos Tracts donnent +atk/+hp de plus pour le reste de la partie. */
  | { do: 'tract_bonus'; atk: number; hp: number }
  /** Joue un Tract sur les cibles. Compte comme un sort lancé. */
  | { do: 'jouer_tract' }
  /** Retire un serviteur de la boutique et donne ses stats aux cibles. */
  | { do: 'debaucher'; pick: ShopPick }
  /** Rend la cible dorée, sans Investiture. Rejouée, elle dore un autre allié qui peut l'être. */
  | { do: 'dorer'; maxTier: number }
  /** Détruit la cible alliée. Son Héritage se déclenche. */
  | { do: 'detruire' }
  /** Détruit la cible alliée, puis découvre un serviteur de son camp. Rejouée, elle ne détruit plus : elle redécouvre. */
  | { do: 'sacrifier'; echelon?: number }
  /** Déclenche les effets `trigger` des cibles, une fois par manche au plus pour chacune (règle R4). Doré, il les joue deux fois. */
  | { do: 'declencher'; trigger: 'annonce' | 'heritage' | 'fin_tour' }
  /** Aura : vos effets `trigger` se déclenchent deux fois (trois, s'il est doré). */
  | { do: 'doubler'; trigger: 'annonce' | 'heritage' | 'fin_tour' | 'celebration' }
  /** Aura : ce serviteur a +atk/+hp par unité du compteur. */
  | { do: 'compteur'; compteur: Counter; atk: number; hp: number }
  /** Aura : il faut `value` casseroles de plus pour faire scandale. */
  | { do: 'scandale_plus'; value: number }
  /** Actualise la boutique tout de suite, sans payer. */
  | { do: 'actualiser'; count?: number }
  /** Vos `value` prochaines actualisations sont gratuites. */
  | { do: 'actualisations_gratuites'; value: number }
  /** Votre budget maximum augmente de `value`. */
  | { do: 'budget_max'; value: number }
  /** Si vous perdez le prochain combat, gagnez `value` budget. */
  | { do: 'pari_defaite'; value: number }
  /** Une actualisation, avec des serviteurs du camp de la cible : « Quand vous actualisez » joue aussi. */
  | { do: 'congres' }
  /** Donne aux cibles les stats de la victime (déclencheur `tue`) : `pv` seulement, ou `tout`. */
  | { do: 'butin'; part: 'pv' | 'tout' };

export type Effect = {
  when: Trigger;
  to: Target;
  /** Filtre de camp : cibles `camp`, `autres_camp`, `aleatoire`, déclencheur `joue`, action `decouvrir`. */
  camp?: Camp;
  /** Filtre de carte : déclencheur `sort`, Revanche (le mort), gain de camp (les serviteurs de cette carte). */
  card?: string;
  /** Revanche (n), Dépense (n). */
  n?: number;
  /** En combat : le gain reste après le combat. */
  perma?: boolean;
  /** Une seule fois par combat, ou par manche. */
  once?: 'combat' | 'manche';
  /**
   * Sa puissance, quand elle ne vient pas du politique qui le porte : 2, il joue doublé. Le moteur la pose sur les
   * effets d'un Ralliement, qui gardent celle de leur carte, et dans les vues, sur chaque effet. Sans elle, un effet
   * de la carte d'un doré joue doublé, et celui d'une casserole, jamais.
   */
  power?: number;
} & Action;

export interface Card {
  id: string;
  name: string;
  camp: Camp;
  tier: number;
  atk: number;
  hp: number;
  keywords?: Keyword[];
  effects?: Effect[];
  token?: boolean;
  /** Ce serviteur ne peut pas attaquer. */
  noAttack?: boolean;
  /** Toujours doré : il arrive doré, sans Investiture. */
  golden?: boolean;
  /** Nom féminin, pour les textes : « une Chaise vide ». */
  feminin?: boolean;
}

/** Un sort : il s'achète en boutique ou se gagne, se garde en main et se joue. */
export interface Spell {
  id: string;
  name: string;
  tier: number;
  cost: number;
  /** Faux : il se joue sans cible. */
  target: boolean;
  effects: Effect[];
  /** Les sorts gagnés seulement : jamais en boutique. */
  token?: boolean;
  /** Échelon maximum de la cible (Remaniement). */
  maxTargetTier?: number;
}

/** Une carte de la main qui n'est pas un serviteur : un sort, une pile de Tracts, une casserole. */
export interface HandSpell {
  uid: number;
  spellId?: string;
  casseroleId?: string;
  /** Les Tracts s'empilent en une seule carte. */
  count?: number;
  /** L'échelon fixé d'une Investiture : celui du joueur à la pose du doré, plus un. */
  tier?: number;
}

export interface Casserole {
  id: string;
  name: string;
  owner: string;
  cost: number;
  atk?: number;
  hp?: number;
  keywords?: Keyword[];
  /** Budget gagné (ou perdu) à chaque manche. */
  budgetPerRound?: number;
  /** Budget gagné tout de suite. */
  instantBudget?: number;
  /** Compte pour plusieurs casseroles vers le scandale. */
  charges?: number;
  /** Le serviteur ne peut plus changer de place. */
  locked?: boolean;
  /** Le serviteur perd ses effets (ceux de ses casseroles restent). */
  silence?: boolean;
  /** Dégâts en plus infligés au héros adverse si le serviteur survit. */
  bonusDamage?: number;
  /** Sondages perdus à la mort du serviteur. */
  hpLossOnDeath?: number;
  /** Invoque ce jeton à côté du serviteur. */
  summon?: string;
  /** Effets ajoutés au serviteur. */
  effects?: Effect[];
  /** Échange l'attaque et les PV du serviteur. */
  swapStats?: boolean;
  /** Ajoute gratuitement un politique de l'échelon du joueur. */
  freeRecruit?: boolean;
  /** +X/+X en combat si le serviteur est le seul de son camp sur le plateau. */
  aloneBonus?: number;
  /** Le peuple oublie tout, tout de suite : son scandale et ses casseroles, qui deviennent des médailles. */
  forgetsAll?: boolean;
  /** Ce que son propriétaire historique gagne en plus, quand elle est posée sur lui. */
  ownerBonus: CasseroleBonus;
  /** Une affaire judiciaire ou un ridicule public. Les règles sont les mêmes. */
  kind: 'affaire' | 'ridicule';
  /** À la une : une affaire que tout le monde connaît. Elle sort plus souvent en boutique (params.uneWeight). */
  une?: boolean;
  /** Le texte affiché sur la carte. */
  blague: string;
  /** Les mots exacts, si la casserole cite quelqu'un. */
  citation?: string;
  /** Fait public dont la casserole se moque. */
  fait: string;
  /** État judiciaire à la date indiquée. */
  statut: string;
  /** Vrai si le statut a été recoupé dans une source pendant la recherche. */
  verifie: boolean;
}

/** Le bonus de propriétaire d'une casserole : les mêmes avantages qu'elle, en plus, sur son propriétaire historique. */
export type CasseroleBonus = Partial<Pick<Casserole, 'atk' | 'hp' | 'keywords' | 'budgetPerRound' | 'instantBudget' | 'bonusDamage' | 'aloneBonus' | 'effects' | 'summon' | 'freeRecruit'>>;

/**
 * Un scandale : les défauts de ses casseroles s'appliquent, jusqu'à l'oubli du peuple. On garde ce
 * qui a été retiré pour le lui rendre à l'oubli.
 */
export interface Scandal {
  /** La manche au début de laquelle le peuple oublie. */
  until: number;
  /** Budget perdu à chaque manche pendant le scandale. */
  budget: number;
  /** Sondages perdus à sa mort, pendant le scandale. */
  hpLoss: number;
  /** Le scandale l'a cloué sur place. */
  locked: boolean;
  /** Ses effets propres, retirés par un scandale qui le réduit au silence. */
  silenced: Effect[] | null;
}

export interface Minion {
  uid: number;
  cardId: string;
  name: string;
  camp: Camp;
  tier: number;
  atk: number;
  hp: number;
  keywords: Keyword[];
  effects: Effect[];
  golden: boolean;
  /** Nombre d'exemplaires de la réserve que ce serviteur représente. */
  copies: number;
  /** Une copie créée par un effet : elle ne compte pas pour un triple. */
  simple: boolean;
  /** Toutes ses casseroles, des plus anciennes aux plus récentes. */
  casseroles: string[];
  /** Les `oublie` premières sont oubliées : leurs défauts ne reviendront jamais. */
  oublie: number;
  /** Les exemplaires ralliés sur lui (trois pour un doré) : ils retournent à la réserve avec lui. */
  merged: string[];
  /** Les cartes ralliées sur lui, une par Ralliement : Bayrou les compte, et leurs effets gardent leur puissance. */
  rallied: string[];
  /** Celles de ses casseroles posées sur leur propriétaire : il porte aussi leur bonus de propriétaire. */
  ownerCasseroles: string[];
  /** Le poids de ses casseroles pas encore oubliées. Au seuil, scandale. */
  charges: number;
  /** En scandale jusqu'au début de cette manche : les défauts de ses casseroles s'appliquent. */
  scandal?: Scandal;
  locked: boolean;
  /** Sous Bracelet électronique : ni déplacé ni renvoyé, jusqu'au début de la manche suivante. */
  bracelet?: boolean;
  noAttack: boolean;
  token: boolean;
  bonusDamage: number;
  hpLossOnDeath: number;
  budgetPerRound: number;
  aloneBonus: number;
  /** Ce doré a déjà donné son Investiture : il n'en redonne pas. */
  investi?: boolean;
}

export interface HeroMods {
  firstBuyDiscount?: number;
  upgradeDiscount?: number;
  budgetPerRound?: number;
  boardDelta?: number;
  frontPolemique?: boolean;
  firstPolemiqueResist?: boolean;
  frontGrowth?: number;
  /** Tracts ajoutés à la main au début de chaque manche. */
  startTracts?: number;
  /** La première Annonce de chaque manche se déclenche deux fois. */
  firstAnnonceTwice?: boolean;
  casseroleDiscount?: number;
  /** Il faut cette quantité de casseroles en plus pour faire scandale. */
  scandalThresholdDelta?: number;
  firstDeathRetour?: boolean;
  frontHp?: number;
  lossBudget?: number;
  firstDeathTransmit?: boolean;
  freeRollsPerRound?: number;
  sellBonus?: number;
}

export interface Hero {
  id: string;
  name: string;
  power: string;
  desc: string;
  /** Points de sondage en plus : le levier d'équilibrage du héros. */
  hpBonus: number;
  mods: HeroMods;
}

export interface Params {
  startBudget: number;
  budgetPerRound: number;
  maxBudget: number;
  buyCost: number;
  sellValue: number;
  rollCost: number;
  boardSize: number;
  /** Cartes gardées en main au maximum, sorts compris. */
  handSize: number;
  startHp: number;
  tierMax: number;
  tierCost: Record<number, number>;
  shopSize: Record<number, number>;
  copies: Record<number, number>;
  /** Sorts proposés en boutique, en plus des serviteurs. */
  spellSlots: number;
  /** Réduction sur le prix des sorts. */
  spellDiscount: number;
  damagePerSurvivor: number;
  damageCaps: [number, number][];
  capOffWhenAlive: number;
  /** À partir de cette manche, tout le monde perd des sondages à chaque manche : la lassitude. */
  wearinessRound: number;
  activeCamps: number;
  casseroleFromRound: number;
  /** La chance que la casserole en boutique soit celle d'un politique du joueur, s'il en a une. */
  casseroleOwnerChance: number;
  /** Actualiser change aussi la casserole, comme les serviteurs et le sort. */
  casseroleOnRoll: boolean;
  /** Le poids en boutique d'une casserole à la une ; les autres pèsent 1. */
  uneWeight: number;
  /** La chance que la boutique propose le Bracelet électronique quand le joueur a un scandale, à tout échelon. */
  braceletChance: number;
  /** Casseroles pas encore oubliées sur un même serviteur pour faire scandale. */
  scandalThreshold: number;
  /** Manches que dure un scandale, avant l'oubli du peuple. */
  scandalRounds: number;
  heroChoices: number;
}

export interface Context {
  id: string;
  name: string;
  desc: string;
  params?: Partial<Params>;
  dissolutionRound?: number;
  /** Dissolution : après la perte, chacun découvre un politique de son échelon. */
  dissolutionDiscover?: boolean;
  /** Fer à cheval : Insoumis, RN et Reconquête comptent comme un même camp. */
  extremesAllied?: boolean;
  /** Primaire ouverte : à la première manche, chacun découvre un politique de cet échelon. */
  firstRoundDiscover?: number;
  /** Ruissellement : budget en plus, à chaque manche, pour le dernier en sondages (ex æquo compris). */
  lastPlaceBudget?: number;
  /** Premier de cordée : à chaque fin de recrutement, le politique le plus à gauche gagne ces stats. */
  firstOfRope?: { atk: number; hp: number };
}

export type PlayerAction =
  /** Achète un serviteur. `main` le garde en main (toujours vrai dans le client). Sinon il est posé. */
  | { t: 'buy'; slot: number; to?: number; main?: boolean }
  /** Achète le sort de la boutique : il va en main. */
  | { t: 'buy_spell'; slot: number }
  /** Achète la casserole de la boutique : elle va en main. */
  | { t: 'buy_casserole' }
  /**
   * Pose une carte de la main à la place `to`, ou à la fin. `target` : la cible de son Annonce.
   * `onto` : un Ralliement fusionne avec cet allié au lieu de prendre une place.
   */
  | { t: 'play'; uid: number; to?: number; target?: number; onto?: number }
  /** Lance un sort ou pose une casserole de la main, sur l'allié `target` s'il en demande un. */
  | { t: 'cast'; uid: number; target?: number }
  /** Renvoie un serviteur du plateau ou de la main. */
  | { t: 'sell'; uid: number }
  | { t: 'roll' }
  | { t: 'freeze' }
  | { t: 'upgrade' }
  | { t: 'move'; uid: number; to: number }
  | { t: 'discover'; i: number }
  | { t: 'hero'; i: number };

export interface Rng {
  next(): number;
  int(n: number): number;
  pick<T>(a: readonly T[]): T;
  shuffle<T>(a: T[]): T[];
}

export interface CombatSide {
  minions: Minion[];
  mods: HeroMods;
  hp: number;
  tier?: number;
  /** Ce que donne un Tract de ce joueur. */
  tract?: { atk: number; hp: number };
  /** Ses gains de camp pour le reste de la partie : les serviteurs invoqués en combat en profitent. */
  campBuffs?: { camp?: Camp; card?: string; atk: number; hp: number }[];
}

/** Ce qu'un combat laisse derrière lui, pour un camp : les gains permanents et les cartes gagnées. */
export interface CombatPersist {
  buffs: { uid: number; atk: number; hp: number }[];
  /** Gains pour la main : `all` pour toute la main, sinon un serviteur au hasard. */
  handBuffs: { all: boolean; atk: number; hp: number }[];
  campBuffs: { camp?: Camp; card?: string; atk: number; hp: number }[];
  cards: string[];
  /** Les copies simples gagnées : jamais dorées, hors réserve (règle R3). */
  copies: string[];
}

/** Ce que le client sait d'un serviteur en combat. Liste blanche : rien d'autre ne sort. */
export interface CombatUnit {
  uid: number;
  cardId: string;
  name: string;
  camp: Camp;
  tier: number;
  atk: number;
  hp: number;
  keywords: Keyword[];
  golden: boolean;
  token: boolean;
  noAttack: boolean;
  casseroles: string[];
  /** Les effets du serviteur, Ralliements et casseroles compris. */
  effects: Effect[];
  /** Bonus de solitude déjà compris dans atk et hp. */
  bonus: number;
  /** En scandale : sa marionnette garde sa tête de choc tout le combat. */
  scandal?: boolean;
}

/**
 * Le journal de combat : la seule chose que le client anime (contrat 4).
 * `applyCombatEvent` (replay.ts) le rejoue sans simulation.
 */
/** Ce qu'un effet de Fin de tour a touché hors du plateau, pour le dire sur la table. */
export type EndOfTurnNote = 'main' | 'sorts' | 'boutique' | 'budget' | 'plateau' | 'tracts';

/**
 * Un effet de Fin de tour, tel que le joueur le voit jouer sur sa table : qui agit (null : le
 * pouvoir du héros), les stats d'après de chaque politique qui a changé, et ce qu'il a touché
 * ailleurs. Sans changement ni note, l'effet n'avait rien à faire.
 */
export interface EndOfTurnStep {
  source: number | null;
  changes: { uid: number; atk: number; hp: number; keywords: Keyword[] }[];
  notes: EndOfTurnNote[];
}

export type CombatEvent =
  | { e: 'debut'; first: 0 | 1; sides: [CombatUnit[], CombatUnit[]] }
  | { e: 'attaque'; from: number; to: number }
  /** `hp` : les PV restants après le coup. */
  | { e: 'degats'; uid: number; value: number; hp: number }
  | { e: 'immunite'; uid: number }
  /** La Polémique de `from` détruit `uid`. */
  | { e: 'polemique'; uid: number; from: number }
  /** `uid` survit à une Polémique grâce au pouvoir de son héros. */
  | { e: 'resiste'; uid: number }
  /** `atk` et `hp` : les valeurs après le gain. */
  | { e: 'stats'; uid: number; atk: number; hp: number }
  | { e: 'mot_cle'; uid: number; keyword: Keyword; gain: boolean }
  /** Un effet se déclenche. `casserole` : la casserole qui l'a apporté, s'il y en a une. */
  | { e: 'effet'; uid: number; when: Trigger; effect: Effect; casserole?: string }
  /** `revient` : il reste en place, un événement `retour` suit. Sinon, il quitte le plateau. */
  | { e: 'mort'; uid: number; revient: boolean }
  | { e: 'retour'; uid: number; hp: number }
  /** Sondages perdus par le camp `side` à la mort de ce serviteur. */
  | { e: 'penalite'; uid: number; side: 0 | 1; value: number }
  | { e: 'invocation'; side: 0 | 1; index: number; unit: CombatUnit }
  /** Retiré du combat sans mourir. */
  | { e: 'exil'; uid: number }
  /** L'état final, identique à celui qu'on obtient en rejouant le journal. */
  | { e: 'fin'; winner: 0 | 1 | null; sides: [CombatUnit[], CombatUnit[]] }
  /** Après la fin : `uid` célèbre la victoire du camp `side`. Son texte de Célébration joue, s'il en a un. */
  | { e: 'celebration'; side: 0 | 1; uid: number; cardId: string }
  /** Après la fin : `uid`, mort, répond pour le perdant `side`. */
  | { e: 'reponse'; side: 0 | 1; uid: number; cardId: string };

export interface CombatResult {
  /** 0 ou 1 pour le vainqueur, null en cas d'égalité. */
  winner: 0 | 1 | null;
  first: 0 | 1;
  survivors: [number, number];
  bonusDamage: [number, number];
  deathPenalty: [number, number];
  persist: [CombatPersist, CombatPersist];
  /** Le serviteur qui prononce la petite phrase de la victoire, et celui qui répond pour le perdant. */
  celebrant: { side: 0 | 1; uid: number } | null;
  /** Les survivants du vainqueur qui ont une Célébration : chacun applique son gain (décision du 3 novembre 2026). */
  celebrants: { side: 0 | 1; uid: number }[];
  /** Celui qui prend la parole pour le perdant : le plus à gauche qui a un Droit de réponse. */
  responder: { side: 0 | 1; uid: number } | null;
  /** Tous ceux du perdant qui ont un Droit de réponse : chacun l'applique, comme les Célébrations (5 novembre 2026). */
  responders: { side: 0 | 1; uid: number }[];
  /** Combien de fois jouent les Célébrations du vainqueur : Macron, s'il a survécu, les double (les triple, doré). */
  celebrationRepeats: number;
  log: CombatEvent[];
}
