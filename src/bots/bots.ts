import type { Card, Casserole, CasseroleBonus, Effect, HandSpell, Keyword, Minion, PlayerAction, Rng, Spell, Target, Trigger } from '../engine/types.ts';
import type { PlayerView } from '../engine/game.ts';
import { resolveCombat } from '../engine/combat.ts';
import { makeMinion } from '../engine/minion.ts';
import { relaunchable } from '../engine/relaunch.ts';
import { createRng } from '../engine/rng.ts';
import { CARD_BY_ID, TOKENS } from '../data/cards.ts';
import { CASSEROLE_BY_ID } from '../data/casseroles.ts';
import { lostSpellReason } from '../engine/lostSpellReason.ts';
import { CONTEXTS } from '../data/heroes.ts';
import { FORCE_CARTES } from '../data/forceCartes.ts';
import { PERSONNALITES } from '../data/personnalites.ts';
import type { Personnalite } from '../data/personnalites.ts';
import { SPELL_BY_ID } from '../data/sorts.ts';

/** « debutant » ne joue jamais à table : il imite un joueur humain qui découvre, pour mesurer les autres. */
export type BotLevel = 'debutant' | 'facile' | 'moyen' | 'difficile';

export interface BotState {
  level: BotLevel;
  rng: Rng;
  /** Décale la courbe de montée en échelon : c'est le style de jeu du bot. */
  tempo: number;
  /** Plus il est haut, plus le bot s'en tient à un camp. */
  focus: number;
  /** Goût du bot pour les casseroles. */
  casseroleTaste: number;
  /**
   * Camp visé dès le départ. Répartit les bots entre les camps : sinon ils iraient tous
   * vers le camp que la formule de valeur favorise, et on ne mesurerait que cette formule.
   */
  commitment: string | null;
  willCommit: boolean;
  pure: boolean;
  round: number;
  ordered: boolean;
  rolls: number;
  /** Les cartes de la main que le bot a décidé de garder cette manche : il ne les réessaie pas. */
  kept: Set<number>;
  /** Le bot joue le personnage de son héros : camp, goûts, rythme. Ne change pas la qualité de ses décisions. */
  personnage: boolean;
  perso: Personnalite | null;
  place: boolean;
  /** Style de mesure (simulateur seulement) : voir BotStyle. */
  rollDown: boolean;
  /**
   * Les combos des humains, que le difficile joue : les casseroles de Sarkozy et le Bracelet, les multiplicateurs, le
   * voisinage, le gel de la boutique, l'ordre de pose.
   */
  combos: boolean;
  /** Le facile, distrait certaines manches : le budget qu'il oubliera de dépenser (0 s'il ne l'est pas). */
  forgets: number;
}

export interface BotStyle {
  /** Force le bot à ne recruter que dans un camp dès que possible. */
  pure?: boolean;
  /** Le bot ne vise aucun camp. */
  opportunist?: boolean;
  /** Le bot joue le personnage de son héros. */
  personnage?: boolean;
  /** Pour le bot de mesure « debutant » : il a compris qu'il faut grouper les camps. */
  place?: boolean;
  /** Mesure : un goût fixé pour les casseroles, de 0 à 1, au lieu d'un goût tiré au hasard. */
  casseroleTaste?: number;
  /** Mesure : à partir de l'échelon 3, une boutique qui déçoit s'actualise avant de dépenser ailleurs (huit fois au plus). */
  rollDown?: boolean;
  /** Mesure : les combos de casseroles, au difficile par défaut ; `false` les retire pour comparer. */
  combos?: boolean;
}

export function createBot(level: BotLevel, seed: number, style: BotStyle = {}): BotState {
  const rng = createRng(seed);
  // Les tirages se font toujours dans le même ordre : un style de mesure ne change pas le reste du bot.
  // Le difficile monte au rythme mesuré comme le meilleur (3 novembre 2026).
  const tempo = level === 'difficile' ? 1 : rng.int(3) - 1;
  const focus = 1 + rng.next() * 2;
  const taste = rng.next();
  return {
    level,
    rng,
    tempo,
    focus,
    casseroleTaste: style.casseroleTaste ?? taste,
    commitment: null,
    willCommit: style.pure || (!style.opportunist && rng.next() < 0.75),
    pure: style.pure ?? false,
    round: 0,
    ordered: false,
    rolls: 0,
    kept: new Set(),
    personnage: style.personnage ?? false,
    perso: null,
    place: style.place ?? false,
    rollDown: style.rollDown ?? false,
    combos: style.combos ?? level === 'difficile',
    forgets: 0,
  };
}

/** Le héros n'est connu qu'à la première vue. Tout vient de la vue : le bot ne triche pas. */
function incarner(view: PlayerView, bot: BotState): void {
  const perso = PERSONNALITES[view.heroId];
  if (!perso) return;
  bot.perso = perso;
  // Le rythme est un style, sauf au difficile, qui garde le meilleur.
  if (bot.level !== 'difficile') bot.tempo = perso.tempo;
  bot.casseroleTaste = perso.casseroles;
  bot.focus = 1 + perso.fidelite * 2;
  const chezLui = perso.camp !== null && view.camps.includes(perso.camp);
  bot.willCommit = chezLui || perso.fidelite >= 0.5;
  if (chezLui) bot.commitment = perso.camp;
  // Le difficile garde le camp de son personnage sans s'y enfermer : un camp pur coûtait près d'une place.
  bot.pure = bot.willCommit && bot.rng.next() < perso.purete && bot.level !== 'difficile';
}

/** Les goûts du personnage : ils orientent le choix sans changer le niveau de jeu. */
function gout(card: Card, bot: BotState): number {
  const g = bot.perso?.gouts;
  if (!g) return 0;
  let v = 0;
  for (const k of card.keywords ?? []) v += g.motsCles?.[k] ?? 0;
  for (const e of card.effects ?? []) v += g.effets?.[e.do] ?? 0;
  if (g.camps?.[card.camp]) v += g.camps[card.camp] as number;
  return v;
}

// La valeur des cartes.

const KEYWORD_VALUE: Record<Keyword, number> = {
  immunite: 3,
  porte_parole: 2,
  cumul: 4,
  polemique: 4,
  retour: 3,
  ni_droite_ni_gauche: 1,
  ralliement: 0,
  vedette: 1,
  /** Un Coup de balai frappe trois politiques au lieu d'un : vaut presque un Cumul des mandats, sans la riposte en plus. */
  balai: 3,
};

/** Combien de fois un effet joue dans une partie, en ordre de grandeur. */
const TRIGGER_SCALE: Partial<Record<Trigger, number>> = {
  annonce: 1,
  fin_tour: 2.5,
  debut_tour: 2.5,
  joue: 2,
  vente: 0.7,
  vente_allie: 1,
  sort: 2,
  actualise: 2,
  debauche: 1.5,
  rallie: 1.5,
  casserole_recue: 1,
  // L'oubli du peuple : un scandale sur deux ou trois manches, et le Bracelet pour le hâter.
  oubli: 0.8,
  depense: 2,
  celebration: 0.6,
  // Since 5 November 2026, every reply plays after a defeat, not only the leftmost one.
  droit_de_reponse: 0.6,
  heritage: 1,
  revanche: 1,
  // « Quand il attaque » : une à trois attaques par combat, plus avec Cumul des mandats ou un Retour.
  meeting: 1.5,
  aura: 1,
};

function reach(to: Target): number {
  switch (to) {
    case 'voisins':
      return 1.5;
    case 'allies':
    case 'camp':
    case 'autres':
    case 'autres_camp':
    case 'meme_camp':
    case 'dores':
    case 'tous_ennemis':
      return 3;
    case 'toute_la_main':
      return 2;
    default:
      return 1;
  }
}

function actionValue(e: Effect): number {
  const r = reach(e.to);
  switch (e.do) {
    case 'buff':
    case 'buff_par_allie':
    case 'buff_par_camp':
    case 'buff_par_ralliement':
      return (e.atk + e.hp) * r;
    case 'degats':
      return e.value * (e.to === 'tous_ennemis' ? 3 : 1.5);
    case 'invoquer': {
      // Un jeton vaut ce qu'il pèse : un Assistant fictif 0/1 ne vaut pas une Chaise vide 0/8 Porte-parole.
      const token = TOKENS[e.token];
      const weight = token ? (token.atk + token.hp) / 2 + (token.keywords ?? []).reduce((v, k) => v + KEYWORD_VALUE[k], 0) : 2;
      return e.count * Math.max(2, weight);
    }
    case 'budget':
      return e.value * 2;
    case 'mot_cle':
    case 'basculer':
      return KEYWORD_VALUE[e.keyword] * r;
    case 'retirer':
      return 2;
    case 'exiler':
      // Un seul exil par combat, sur l'ennemi le plus faible (10 novembre 2026).
      return 3;
    case 'transmettre':
      return (e.tout ? 6 : 3) * r;
    case 'carte':
      return e.count * (e.card === 'tract' ? 2 : 4);
    case 'decouvrir':
      return 5 + (e.echelon ?? 0) * 3;
    case 'camp_buff':
      return (e.atk + e.hp) * 4;
    case 'boutique_buff':
      return (e.atk + e.hp) * 2;
    case 'tract_bonus':
      return (e.atk + e.hp) * 5;
    case 'jouer_tract':
      return 2 * r;
    case 'debaucher':
      return 6;
    case 'dorer':
      return 10;
    case 'detruire':
      return 0;
    case 'sacrifier':
      return 4;
    case 'declencher':
      return 4 * r;
    case 'doubler':
      return 12;
    case 'compteur':
      return (e.atk + e.hp) * 4;
    case 'scandale_plus':
      return 2;
    case 'actualiser':
      return 1.5 * (e.count ?? 1);
    case 'actualisations_gratuites':
      return e.value;
    case 'budget_max':
      return 6;
    case 'oublier':
      // Ne vaut que s'il y a un scandale qui coûte : jugé à l'achat et au lancer.
      return 0;
    case 'pari_defaite':
      return 1;
    case 'congres':
      return 2;
    case 'butin':
      return 4;
    // Re-spécification du 7 novembre 2026 : les doublements valent cher, et d'autant plus qu'ils touchent du monde.
    case 'doubler_stats':
      return 14 * r;
    case 'buff_par_membre':
      return (e.atk + e.hp) * 3 * r;
    case 'gain_debauche':
      return 16;
    case 'buff_compteur':
      return (e.atk + e.hp) * 6;
    // Une Chaise vide qui a ses stats : un second corps, Porte-parole (13 novembre 2026).
    case 'chaise_vide':
      return 14;
  }
}

function effectValue(e: Effect): number {
  // Censuré par son propre 49.3 (Barnier) : il ne combat pas, son corps ne compte presque plus.
  if (e.do === 'detruire' && e.to === 'soi' && e.when === 'debut_combat') return -8;
  return actionValue(e) * (TRIGGER_SCALE[e.when] ?? 1.2);
}

/** Valeur d'une carte sans contexte. Sert aussi de budget de référence pour l'équilibrage. */
export function cardPower(card: Card): number {
  let v = card.atk + card.hp;
  for (const k of card.keywords ?? []) v += KEYWORD_VALUE[k];
  for (const e of card.effects ?? []) v += effectValue(e);
  return card.golden ? v * 1.5 : v;
}

function minionPower(m: Minion): number {
  let v = m.atk + m.hp;
  for (const k of m.keywords) v += KEYWORD_VALUE[k];
  // La vue dit la puissance de chaque effet : un Ralliement doré double les siens, une casserole jamais.
  for (const e of m.effects) v += effectValue(e) * (e.power ?? (m.golden ? 2 : 1));
  return v;
}

/** Ce que vaut 1 de budget, dans l'échelle des valeurs : un sort doit rapporter plus que son prix. */
const BUDGET_WORTH = 2.2;

/**
 * Ce que vaut un sort ici et maintenant, dans la même échelle que le prix × 2,2 : selon le plateau,
 * la manche, les Tracts et le camp. Sans ça, le bot n'achetait jamais 16 sorts sur 24, et l'équilibrage
 * ne savait rien d'eux (revue du 3 novembre 2026).
 */
function spellWorth(spell: Spell, view: PlayerView, bot: BotState | null): number {
  const board = view.board;
  const strongest = board.reduce((best, m) => Math.max(best, minionPower(m)), 0);
  const many = Math.max(1, board.length);
  const engines = (trigger: Trigger) => board.reduce((best, m) => Math.max(best, m.effects.filter((e) => e.when === trigger).reduce((sum, e) => sum + actionValue(e), 0)), 0);
  const refreshes = board.filter((m) => m.effects.some((e) => e.when === 'actualise')).length;
  return spell.effects.reduce((sum, e) => {
    switch (e.do) {
      case 'buff':
        return sum + (e.atk + e.hp) * (e.to === 'allies' ? many : 1);
      case 'mot_cle':
      case 'basculer':
        // Un mot-clé vaut ce que vaut le politique qui le porte : une Immunité sur un 2/2 ne vaut rien.
        return sum + KEYWORD_VALUE[e.keyword] * (1 + strongest / 10);
      case 'carte':
        return sum + e.count * (e.card === 'tract' ? (view.tract.atk + view.tract.hp) * 1.5 : 4);
      case 'decouvrir':
        // Une découverte vaut un achat, et mieux qu'un achat : on choisit.
        return sum + 7 + (e.echelon ?? 0) * 3 + (e.declencheur ? engines('aura') / 2 : 0);
      case 'actualisations_gratuites':
        return sum + e.value * BUDGET_WORTH * (refreshes > 0 ? 1.5 : 1);
      case 'budget_max':
        // Ne sert qu'au plafond de budget : rien au début, beaucoup en fin de partie.
        return sum + BUDGET_WORTH * Math.max(0, Math.min(8, view.round - 3));
      case 'pari_defaite':
        return sum + e.value * BUDGET_WORTH * 0.5;
      case 'declencher':
        return sum + engines(e.trigger === 'annonce' ? 'annonce' : e.trigger === 'heritage' ? 'heritage' : 'fin_tour') * (e.to === 'allies' ? 2 : 1);
      case 'congres':
        // Une actualisation : les « Quand vous actualisez » du plateau jouent aussi.
        return sum + BUDGET_WORTH + (bot?.commitment ? 3 : 0) + rollEngine(view);
      default:
        return sum + actionValue(e);
    }
  }, 0);
}

/** Exemplaires possédés, main et plateau confondus : ce sont eux qui comptent pour le triple. */
function owned(view: PlayerView, cardId: string): number {
  return [...view.board, ...view.hand].filter((m) => m.cardId === cardId && !m.golden && !m.token && !m.simple).length;
}

function handCount(view: PlayerView): number {
  return view.hand.length + view.spells.length;
}

/** La main peut-elle accueillir cette carte, compte tenu d'une éventuelle fusion ? */
function handRoom(view: PlayerView, cardId: string): boolean {
  const fusion = owned(view, cardId) >= 2;
  const freed = fusion ? view.hand.filter((m) => m.cardId === cardId && !m.golden && !m.token && !m.simple).length : 0;
  return handCount(view) - freed < view.handLimit;
}

function dominantCamp(board: Minion[]): string | null {
  const counts = new Map<string, number>();
  for (const m of board) if (m.camp !== 'civile') counts.set(m.camp, (counts.get(m.camp) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [camp, n] of counts) {
    if (n > bestN) {
      best = camp;
      bestN = n;
    }
  }
  return best;
}

/** Ce que le bot ajoute à la valeur brute d'une carte : ses goûts, et son camp. */
function campScore(card: Card, view: PlayerView, bot: BotState): number {
  let v = gout(card, bot);
  const main = bot.commitment ?? dominantCamp(view.board);
  if (main && card.camp === main) v += bot.commitment ? (bot.pure ? 40 : 4 + bot.focus * 2) : bot.focus * 2;
  const sameCamp = view.board.filter((m) => card.camp !== 'civile' && m.camp === card.camp).length;
  v += Math.min(3, sameCamp) * bot.focus;
  return v;
}

/** La force moyenne de chaque échelon dans la table de force, seule et dans son camp. */
const TIER_FORCE: Record<number, { seul: number; camp: number }> = (() => {
  const sums: Record<number, { seul: number; camp: number; n: number }> = {};
  for (const [id, f] of Object.entries(FORCE_CARTES)) {
    const tier = CARD_BY_ID[id]?.tier;
    if (!tier) continue;
    const s = (sums[tier] ??= { seul: 0, camp: 0, n: 0 });
    s.seul += f.seul;
    s.camp += f.camp;
    s.n++;
  }
  return Object.fromEntries(Object.entries(sums).map(([t, s]) => [t, { seul: s.seul / s.n, camp: s.camp / s.n }]));
})();

/** Le poids de cette connaissance : une place gagnée vaut autant que 10 de stats. */
const KNOWLEDGE = 10;

/**
 * Ce qu'un joueur qui connaît le jeu sait d'une carte (difficile) : de combien de places elle dépasse la moyenne de son
 * échelon (`src/data/forceCartes.ts`), dans le camp que suit le bot, ou seule. Cohn-Bendit, Hollande, Zemmour gagnent des
 * parties ; la formule de valeur ne voyait que leurs stats et un forfait par effet.
 */
function knownForce(cardId: string, view: PlayerView, bot: BotState): number {
  const f = FORCE_CARTES[cardId];
  const card = CARD_BY_ID[cardId];
  const mean = card ? TIER_FORCE[card.tier] : undefined;
  if (!bot.combos || !f || !card || !mean) return 0;
  const main = bot.commitment ?? dominantCamp(view.board);
  const inCamp = card.camp !== 'civile' && card.camp === main;
  return KNOWLEDGE * (inCamp ? f.camp - mean.camp : f.seul - mean.seul);
}

function cardScore(card: Card, view: PlayerView, bot: BotState): number {
  let v = cardPower(card) + campScore(card, view, bot);
  if (bot.combos) v += doublerWorth(card.effects ?? [], view) + engineWorth(card.effects ?? [], Boolean(card.golden), view) + knownForce(card.id, view, bot);
  const copies = owned(view, card.id);
  if (copies === 2) v += 20;
  else if (copies === 1) v += 4;
  return v;
}

/**
 * Un serviteur du plateau, sur la même échelle que la boutique (sans le bonus de paire). Comparé
 * à sa seule valeur brute, un serviteur à peine acheté paraissait aussitôt pire que la boutique :
 * le bot achetait, posait et revendait en boucle (un cinquième de ses ventes).
 */
function boardScore(m: Minion, view: PlayerView, bot: BotState): number {
  const card = CARD_BY_ID[m.cardId];
  const combo = bot.combos ? doublerWorth(m.effects, view) + engineWorth(m.effects, m.golden, view, m.uid) + (m.token ? 0 : knownForce(m.cardId, view, bot)) : 0;
  return minionPower(m) + (card ? campScore(card, view, bot) : 0) + combo;
}

function expectedTier(view: PlayerView, bot: BotState): number {
  const r = view.round - bot.tempo;
  if (r >= 11) return 6;
  if (r >= 9) return 5;
  if (r >= 7) return 4;
  if (r >= 5) return 3;
  if (r >= 2) return 2;
  return 1;
}

/** Ce que vaut un avantage de casserole sur ce politique : celui de la carte, ou son bonus de propriétaire. */
function advantageValue(gain: CasseroleBonus, m: Minion, view: PlayerView): number {
  let v = (gain.atk ?? 0) + (gain.hp ?? 0);
  for (const k of gain.keywords ?? []) if (!m.keywords.includes(k)) v += KEYWORD_VALUE[k];
  v += Math.max(0, gain.budgetPerRound ?? 0) * 2;
  for (const e of gain.effects ?? []) v += effectValue(e);
  if (gain.freeRecruit) v += 3 + view.tier * 2;
  if (gain.aloneBonus && !view.board.some((o) => o !== m && o.camp === m.camp)) v += gain.aloneBonus * 2;
  if (gain.summon) v += 2;
  v += gain.instantBudget ?? 0;
  v += (gain.bonusDamage ?? 0) * 1.5;
  return v;
}

/** Ce que la casserole apporte tout de suite et pour toujours : son avantage, et son bonus sur son propriétaire. */
function casseroleValue(c: Casserole, m: Minion, view: PlayerView): number {
  let v = advantageValue(c, m, view) + (m.cardId === c.owner ? advantageValue(c.ownerBonus, m, view) : 0);
  if (c.swapStats) v += Math.max(0, m.hp - m.atk) * 0.5;
  // Les Républicains se nourrissent des affaires.
  v += view.board.filter((o) => o.effects.some((e) => e.when === 'casserole_recue' || (e.do === 'compteur' && e.compteur === 'casseroles'))).length * 2;
  v -= Math.max(0, c.cost - (view.mods.casseroleDiscount ?? 0)) * 0.5;
  return v;
}

/** Ce que coûte le défaut d'une casserole pendant un scandale de deux manches. */
function defectCost(c: Casserole, m: Minion): number {
  // Le scandale coûte ses deux manches de budget : le peuple oublie une fois le budget de la deuxième versé.
  let v = -Math.min(0, c.budgetPerRound ?? 0) * 2 * 2;
  v += (c.hpLossOnDeath ?? 0) * 1.5;
  // Les sondages perdus à chaque manche du scandale, et un politique qui n'attaque plus (7 novembre 2026).
  v += (c.pollsPerRound ?? 0) * 2 * 1.5;
  if (c.noAttack) v += m.atk * 0.5 + 2;
  if (c.locked) v += 1;
  if (c.silence) v += m.effects.reduce((sum, e) => sum + effectValue(e), 0);
  // L'éclaboussure : ses voisins perdent -N/-N en combat, deux combats durant (13 novembre 2026).
  v += (c.splash ?? 0) * 2 * 2;
  return v;
}

/**
 * Le prix du scandale que cette casserole déclencherait ou rejoindrait : les défauts de toutes
 * ses casseroles pas encore oubliées. Zéro si elle reste seule, ou si elle fait tout oublier.
 */
function scandalCost(c: Casserole, m: Minion, view: PlayerView): number {
  if (c.forgetsAll) return -(m.scandal ? m.casseroles.slice(m.oublie).reduce((s, id) => s + defectCost(CASSEROLE_BY_ID[id], m), 0) : 0);
  if (m.scandal) return defectCost(c, m);
  if (m.charges + (c.charges ?? 1) < view.scandalThreshold) return 0;
  return [...m.casseroles.slice(m.oublie).map((id) => CASSEROLE_BY_ID[id]), c].reduce((s, x) => s + defectCost(x, m), 0);
}

/**
 * Le politique qui reçoit la casserole. Avec les combos, le doublement de Sarkozy encore à jouer la fait aller au plus
 * gros, et un Bracelet (en main, ou acheté juste avant, `braceletPrice`) ramène le scandale qu'elle ferait à son prix.
 */
function casseroleTarget(view: PlayerView, c: Casserole, bot: BotState, braceletPrice = braceletInHand(view) ? BUDGET_WORTH : Infinity): Minion | null {
  let best: Minion | null = null;
  let bestScore = 1 + (1 - bot.casseroleTaste) * 3;
  for (const m of view.board) {
    if (m.token) continue;
    const scandal = bot.combos ? Math.min(scandalCost(c, m, view), braceletPrice) : scandalCost(c, m, view);
    const doubling = bot.combos ? doublingGain(view, m, c) * 0.8 : 0;
    const score = casseroleValue(c, m, view) + doubling - scandal + minionPower(m) * 0.1;
    if (score > bestScore) {
      best = m;
      bestScore = score;
    }
  }
  return best;
}

// Les combos du difficile (10 novembre 2026) : ce que les humains font des casseroles, et que les bots ne faisaient pas.

/** La puissance de chaque doublement de Sarkozy encore à jouer cette manche : 1, ou 2 pour un doré. */
function readyDoublings(view: PlayerView): number[] {
  const powers: number[] = [];
  for (const s of view.board) {
    s.effects.forEach((e, i) => {
      if (e.when !== 'casserole_recue' || e.do !== 'doubler_stats') return;
      if (e.once === 'manche' && view.onceThisRound.includes(`${s.uid}:${i}`)) return;
      powers.push(e.power ?? 1);
    });
  }
  return powers;
}

/** Ce que les doublements encore à jouer ajoutent au politique qui reçoit cette casserole, son avantage compris. */
function doublingGain(view: PlayerView, m: Minion, c: Casserole): number {
  const times = readyDoublings(view).reduce((sum, k) => sum + k, 0);
  if (times === 0) return 0;
  const bonus = m.cardId === c.owner ? c.ownerBonus : {};
  const size = m.atk + m.hp + Math.max(0, (c.atk ?? 0) + (c.hp ?? 0)) + Math.max(0, (bonus.atk ?? 0) + (bonus.hp ?? 0));
  return size * (2 ** Math.min(times, 6) - 1);
}

/** Sarkozy, ou une carte qui double comme lui : il vaut ce qu'il doublera, le plus gros politique du plateau. */
function doublerWorth(effects: Effect[], view: PlayerView): number {
  if (!effects.some((e) => e.when === 'casserole_recue' && e.do === 'doubler_stats')) return 0;
  return view.board.reduce((best, m) => Math.max(best, m.token ? 0 : m.atk + m.hp), 0) * 0.5;
}

const isBracelet = (held: HandSpell): boolean => Boolean(held.spellId && SPELL_BY_ID[held.spellId]?.effects.some((e) => e.do === 'oublier'));

function braceletInHand(view: PlayerView): boolean {
  return view.spells.some(isBracelet);
}

/** L'emplacement du Bracelet dans la boutique, ou -1. */
function braceletSlot(view: PlayerView): number {
  return view.shopSpells.findIndex((id) => SPELL_BY_ID[id].effects.some((e) => e.do === 'oublier'));
}

/**
 * La casserole du doublement, achetée avant les politiques : sur un gros politique, elle rapporte plus que tout achat.
 * Si elle le ferait tomber en scandale et que la boutique a un Bracelet, le Bracelet d'abord, pour l'effacer aussitôt.
 */
function casseroleCombo(view: PlayerView, bot: BotState): PlayerAction | null {
  if (!bot.combos || !view.casseroleOffer || view.casseroleCost === null || readyDoublings(view).length === 0) return null;
  const c = CASSEROLE_BY_ID[view.casseroleOffer];
  const slot = braceletSlot(view);
  const canBuyBracelet = !braceletInHand(view) && slot >= 0 && view.budget >= view.shopSpellCosts[slot] + view.casseroleCost && handCount(view) + 2 <= view.handLimit;
  const target = casseroleTarget(view, c, bot, braceletInHand(view) ? BUDGET_WORTH : canBuyBracelet ? view.shopSpellCosts[slot] * BUDGET_WORTH : Infinity);
  if (!target || doublingGain(view, target, c) < 12) return null;
  if (canBuyBracelet && scandalCost(c, target, view) > 3) return { t: 'buy_spell', slot };
  if (view.budget >= view.casseroleCost && handCount(view) < view.handLimit) return { t: 'buy_casserole' };
  return null;
}

/** Le Bracelet gardé en main pour le scandale à venir : Sarkozy au plateau, et de la place en main. */
function wantsBracelet(view: PlayerView): boolean {
  return !braceletInHand(view) && view.board.some((m) => doublerWorth(m.effects, view) > 0) && handCount(view) + 2 <= view.handLimit;
}

// Les multiplicateurs (difficile) : Lassalle, Chirac, Mitterrand, Mélenchon, Macron valent ce qu'ils doublent, et une
// carte vaut plus quand son déclencheur est déjà doublé. Avant, un multiplicateur valait 12, quel que soit le plateau.

type Multiplied = 'annonce' | 'heritage' | 'fin_tour' | 'celebration' | 'meeting' | 'debut_combat';
const MULTIPLIED: Multiplied[] = ['annonce', 'heritage', 'fin_tour', 'celebration', 'meeting', 'debut_combat'];

/** Combien de fois un déclencheur joue avec ce plateau : 1, 2, ou 3 avec un multiplicateur doré (le plus fort compte). */
function multiplier(board: Minion[], trigger: Multiplied): number {
  let n = 1;
  for (const m of board) {
    for (const e of m.effects) if (e.when === 'aura' && e.do === 'doubler' && e.trigger === trigger) n = Math.max(n, (e.power ?? (m.golden ? 2 : 1)) > 1 ? 3 : 2);
  }
  return n;
}

/** Ce que valent les effets `trigger` du plateau et de la main, puissance comprise. */
function triggerWorth(view: PlayerView, trigger: Multiplied, except?: number): number {
  let v = 0;
  for (const m of [...view.board, ...view.hand]) {
    if (m.uid === except) continue;
    for (const e of m.effects) if (e.when === trigger) v += effectValue(e) * (e.power ?? (m.golden ? 2 : 1));
  }
  return v;
}

/**
 * Ce qu'une carte ajoute aux moteurs du plateau : un multiplicateur, ce qu'il double de plus ; un relanceur (« déclenche
 * l'Annonce de vos autres politiques »), ce qu'il relance ; un effet déjà doublé, sa valeur une fois de plus.
 */
function engineWorth(effects: Effect[], golden: boolean, view: PlayerView, self?: number): number {
  let v = 0;
  const power = (e: Effect) => e.power ?? (golden ? 2 : 1);
  for (const e of effects) {
    if (e.when === 'aura' && e.do === 'doubler') {
      const now = multiplier(view.board.filter((m) => m.uid !== self), e.trigger);
      const next = Math.max(now, power(e) > 1 ? 3 : 2);
      v += triggerWorth(view, e.trigger, self) * (next - now) - actionValue(e);
    } else if (e.do === 'declencher') {
      const relaunched = e.to === 'voisins' ? 0.4 : e.to === 'autres' ? 1 : 0.3;
      v += triggerWorth(view, e.trigger, self) * relaunched * power(e) - actionValue(e);
    }
    if ((MULTIPLIED as string[]).includes(e.when)) v += effectValue(e) * power(e) * (multiplier(view.board.filter((m) => m.uid !== self), e.when as Multiplied) - 1);
  }
  return v * 0.5;
}

/** Le Bracelet : un scandale qui coûte. */
function braceletUseful(view: PlayerView): boolean {
  // « Après l'oubli du peuple » (Juppé) : un Bracelet sur n'importe quel scandale paie tout de suite.
  const forgets = view.board.some((m) => m.effects.some((e) => e.when === 'oubli'));
  return view.board.some((m) => m.scandal && (forgets || m.casseroles.slice(m.oublie).reduce((s, id) => s + defectCost(CASSEROLE_BY_ID[id], m), 0) > 3));
}

// Le placement.

/** Trie le plateau : les protecteurs devant, les gros attaquants ensuite, les relanceurs à leur place. */
function preferredOrder(board: Minion[]): Minion[] {
  const score = (m: Minion): number => {
    let s = -m.hp;
    if (m.keywords.includes('porte_parole')) s -= 50;
    if (m.keywords.includes('immunite')) s -= 25;
    if (m.keywords.includes('polemique')) s += 25;
    // Glucksmann relance l'Héritage du premier : les Héritages devant.
    if (m.effects.some((e) => e.when === 'heritage')) s -= 10;
    // « Quand il attaque » : devant, il attaque le premier et plus souvent (re-spécification du 7 novembre 2026).
    if (m.effects.some((e) => e.when === 'meeting')) s -= 30;
    // Un Coup de balai frappe tôt : devant aussi (13 novembre 2026).
    if (m.keywords.includes('balai')) s -= 20;
    // Un scandale qui éclabousse : au bout du plateau, il n'a qu'un voisin (13 novembre 2026).
    if ((m.scandal?.splash ?? 0) > 0) s += 200;
    return s;
  };
  return [...board].sort((a, b) => score(a) - score(b));
}

function firstOrderingMove(board: Minion[], target: Minion[]): PlayerAction | null {
  const movable = board.filter((m) => !m.locked);
  const wanted = target.filter((m) => !m.locked);
  for (let i = 0; i < wanted.length; i++) {
    if (movable[i].uid !== wanted[i].uid) {
      const to = board.findIndex((m) => m.uid === movable[i].uid);
      const destination = board.findIndex((m) => m.uid === wanted[i].uid);
      return { t: 'move', uid: board[destination].uid, to };
    }
  }
  return null;
}

/** Évalue un plateau contre les adversaires déjà vus, en moyenne : les cibles du combat sont tirées au hasard. */
function strength(board: Minion[], view: PlayerView, runs = 2): number {
  const ctx = CONTEXTS.find((c) => c.id === view.contextId) ?? null;
  const rng = createRng(view.round * 97 + view.seat);
  let total = 0;
  // Les trois derniers plateaux vus suffisent : le bot difficile simule un combat contre chacun.
  const recent = view.seen.slice(0, 3);
  for (const seen of recent) {
    for (let i = 0; i < runs; i++) {
      const r = resolveCombat(
        { minions: board, mods: view.mods, hp: view.hp, tier: view.tier, tract: view.tract },
        { minions: seen.board, mods: {}, hp: view.hp, tier: view.tier },
        { params: view.params, ctx, rng },
      );
      if (r.winner === 0) total += 10 + r.survivors[0];
      else if (r.winner === 1) total -= 10 + r.survivors[1];
    }
  }
  return recent.length ? total / (recent.length * runs) : 0;
}

/**
 * Ce que les effets de voisinage rapportent selon l'ordre (difficile) : Jadot entre deux Fins de tour, un gain aux voisins
 * ou à l'allié suivant (celui de droite, ou le premier, règle R15) sur un vrai politique plutôt qu'un jeton, un mot-clé à
 * qui ne l'a pas encore.
 */
function neighborWorth(order: Minion[]): number {
  let v = 0;
  const power = (m: Minion, e: Effect) => e.power ?? (m.golden ? 2 : 1);
  const gain = (e: Effect, to: Minion | undefined): number => {
    if (!to) return 0;
    if (e.do === 'declencher') return to.effects.filter((x) => x.when === e.trigger).reduce((sum, x) => sum + effectValue(x) * power(to, x), 0);
    if (e.do === 'mot_cle') return to.token || to.keywords.includes(e.keyword) ? 0 : 3;
    return to.token ? 0 : 2;
  };
  order.forEach((m, i) => {
    for (const e of m.effects) {
      if (e.to === 'voisins') v += (gain(e, order[i - 1]) + gain(e, order[i + 1])) * power(m, e);
      else if (e.to === 'allie_suivant' && order.length > 1) v += gain(e, order[i + 1] ?? order[0]) * power(m, e);
    }
  });
  return v;
}

function bestOrdering(view: PlayerView, bot: BotState): Minion[] {
  // Le point de départ ne dépend pas de l'ordre actuel : sinon chaque déplacement change la cible,
  // et le bot passe son tour à échanger deux serviteurs.
  let best = preferredOrder([...view.board].sort((a, b) => a.uid - b.uid));
  if (best.length < 2 || (!bot.combos && view.seen.length === 0)) return best;
  // Le combat contre les plateaux vus ; avec les combos, le voisinage au recrutement, qui compte dès la première manche.
  const score = (order: Minion[]) => (view.seen.length > 0 ? strength(order, view) : 0) + (bot.combos ? neighborWorth(order) : 0);
  let bestScore = score(best);
  for (let i = 0; i < best.length; i++) {
    for (let j = i + 1; j < best.length; j++) {
      if (best[i].locked || best[j].locked) continue;
      const next = [...best];
      [next[i], next[j]] = [next[j], next[i]];
      const s = score(next);
      if (s > bestScore + 1) {
        best = next;
        bestScore = s;
      }
    }
  }
  return best;
}

// Les cibles.

/** Le meilleur allié pour recevoir un gain : le plus fort, sauf les jetons. */
/** Celui dont la réincarnation vaut le plus : sa carte nue, Héritage compris, doré s'il l'est. */
function bestBareCard(board: Minion[]): Minion | null {
  const worth = (m: Minion) => {
    const card = CARD_BY_ID[m.cardId];
    if (!card) return 0;
    const heritage = m.effects.filter((e) => e.when === 'heritage').reduce((sum, e) => sum + effectValue(e) * (e.power ?? (m.golden ? 2 : 1)), 0);
    return cardPower(card) * (m.golden ? 2 : 1) + heritage;
  };
  let best: Minion | null = null;
  for (const m of board) if (!best || worth(m) > worth(best)) best = m;
  return best;
}

function strongest(board: Minion[], except?: Minion): Minion | null {
  let best: Minion | null = null;
  for (const m of board) {
    if (m === except) continue;
    if (!best || Number(!m.token) * 100 + minionPower(m) > Number(!best.token) * 100 + minionPower(best)) best = m;
  }
  return best;
}

/**
 * L'allié qu'on peut sacrifier : un jeton, sinon le plus faible, de préférence avec un Héritage. Jamais un exemplaire
 * de la carte qui sacrifie : ce serait l'échanger contre lui-même (Hidalgo sacrifiait l'Hidalgo d'avant, redécouvrait
 * Hidalgo et tournait en rond : fuzz, graine 156, 7 novembre 2026).
 */
function sacrificial(board: Minion[], except?: Minion): Minion | null {
  let best: Minion | null = null;
  const cost = (m: Minion) => (m.token ? -50 : 0) + minionPower(m) - (m.effects.some((e) => e.when === 'heritage') ? 8 : 0) + (m.golden ? 40 : 0);
  for (const m of board) {
    if (m === except || (except && m.cardId === except.cardId)) continue;
    if (!best || cost(m) < cost(best)) best = m;
  }
  return best;
}

/** La cible d'un ensemble d'effets « cible ». Null : rien de bon à viser. */
function targetFor(effects: Effect[], board: Minion[], self: Minion | null, maxTier?: number): Minion | null {
  const aimed = effects.filter((e) => e.to === 'cible');
  if (aimed.length === 0) return null;
  const first = aimed[0];
  switch (first.do) {
    case 'detruire':
    case 'sacrifier':
      return sacrificial(board, self ?? undefined);
    case 'dorer': {
      const limit = maxTier ?? first.maxTier;
      const eligible = board.filter((m) => m !== self && !m.golden && !m.token && !m.simple && m.tier <= limit);
      return strongest(eligible);
    }
    case 'mot_cle':
    case 'basculer': {
      // Le bot donne le mot-clé au plus fort qui ne l'a pas ; il ne s'en sert pas pour le retirer.
      const lacking = board.filter((m) => m !== self && !m.keywords.includes(first.keyword) && !m.token);
      // Le Retour réincarne la carte nue, et rejoue son Héritage (13 novembre 2026) : il va à la meilleure carte, pas
      // au politique le plus gonflé.
      if (first.keyword === 'retour' && lacking.length > 0) return bestBareCard(lacking);
      return strongest(lacking.length > 0 ? lacking : board, self ?? undefined);
    }
    case 'declencher': {
      // Seulement un politique qui a de quoi être relancé : une Annonce qui détruit ne se relance pas.
      const withTrigger = board.filter((m) => m !== self && relaunchable(m.effects, first.trigger).length > 0);
      return strongest(withTrigger);
    }
    default:
      return strongest(board, self ?? undefined);
  }
}

// Les gestes.

/** Jouer la meilleure carte de la main : rallier, poser avec sa cible, ou faire de la place. */
function handMove(view: PlayerView, bot: BotState, margin = 3): PlayerAction | null {
  const candidates = view.hand.filter((m) => !bot.kept.has(m.uid));
  if (candidates.length === 0) return null;
  // Le difficile pose d'abord ce qui profite des suivants : « quand vous jouez un Écologiste » avant les Écologistes,
  // Maillard ou Macron avant les Ralliements.
  const feeds = (m: Minion) =>
    bot.combos &&
    m.effects.some(
      (e) =>
        (e.when === 'joue' && candidates.some((o) => o !== m && !o.keywords.includes('ralliement') && (!e.camp || o.camp === e.camp))) ||
        (e.when === 'rallie' && candidates.some((o) => o !== m && o.keywords.includes('ralliement'))),
    );
  const ranked = [...candidates].sort((a, b) => Number(feeds(b)) - Number(feeds(a)) || Number(b.golden) - Number(a.golden) || minionPower(b) - minionPower(a));
  const m = ranked[0];
  // Un Ralliement rejoint le plus fort quand le plateau est plein, quand il n'a presque pas de corps, ou quand un
  // allié en profite (Maillard, Bayrou, Macron qui double l'hôte : re-spécification du 7 novembre 2026).
  if (m.keywords.includes('ralliement') && view.board.length > 0) {
    // Un Ralliement qui arme (Immunité, Cumul, Retour, « Quand il attaque ») rejoint de préférence celui qui attaque.
    const arms = m.keywords.some((k) => k === 'immunite' || k === 'cumul' || k === 'retour') || m.effects.some((e) => e.when === 'meeting');
    const attackers = view.board.filter((x) => !x.token && x.effects.some((e) => e.when === 'meeting'));
    const host = (arms ? strongest(attackers) : null) ?? strongest(view.board.filter((x) => !x.token));
    const payoff = view.board.some((x) => x.effects.some((e) => e.when === 'rallie' || e.do === 'buff_par_ralliement')) || (arms && attackers.length > 0);
    if (host && (view.board.length >= view.boardLimit || m.atk + m.hp <= 6 || payoff)) return { t: 'play', uid: m.uid, onto: host.uid };
  }
  if (view.board.length < view.boardLimit) {
    const annonce = m.effects.filter((e) => e.when === 'annonce');
    const target = targetFor(annonce, view.board, m);
    if (target) return { t: 'play', uid: m.uid, target: target.uid };
    // Sans bonne cible, une Annonce qui détruit viserait le premier allié, souvent le meilleur : le politique attend.
    const destroys = annonce.some((e) => e.to === 'cible' && (e.do === 'detruire' || e.do === 'sacrifier'));
    if (!destroys || view.board.length === 0) return { t: 'play', uid: m.uid };
    bot.kept.add(m.uid);
    return handMove(view, bot, margin);
  }
  const worst = worstMinion(view, bot);
  if (worst && (m.golden || minionPower(m) > minionPower(worst) + margin)) return { t: 'sell', uid: worst.uid };
  bot.kept.add(m.uid);
  return handMove(view, bot, margin);
}

/** Lancer un sort ou poser une casserole de la main, si ça vaut le coup maintenant. */
function castMove(view: PlayerView, bot: BotState): PlayerAction | null {
  for (const held of view.spells) {
    if (bot.kept.has(held.uid)) continue;
    const action = castAction(view, bot, held);
    if (action) return action;
    // Avec les combos, le Bracelet attend le scandale que la casserole suivante va faire, dans la même manche.
    if (!(bot.combos && isBracelet(held))) bot.kept.add(held.uid);
  }
  return null;
}

function castAction(view: PlayerView, bot: BotState, held: HandSpell): PlayerAction | null {
  if (held.casseroleId) {
    const target = casseroleTarget(view, CASSEROLE_BY_ID[held.casseroleId], bot);
    return target ? { t: 'cast', uid: held.uid, target: target.uid } : null;
  }
  const spell = SPELL_BY_ID[held.spellId as string];
  if (spell.effects.some((e) => e.do === 'oublier')) return braceletUseful(view) ? { t: 'cast', uid: held.uid } : null;
  // Jamais un sort que le moteur refuserait : il serait perdu (7 novembre 2026).
  const table = { board: view.board, shopSize: view.shop.length, boardLimit: view.boardLimit, relaunched: view.relaunched };
  if (!spell.target) {
    if (lostSpellReason(spell, null, table)) return null;
    // Une découverte attend que la main ait de la place.
    if (spell.effects.some((e) => e.do === 'decouvrir' || e.do === 'carte') && handCount(view) >= view.handLimit) return null;
    return { t: 'cast', uid: held.uid };
  }
  if (view.board.length === 0) return null;
  const candidates = view.board.filter((m) => lostSpellReason(spell, m, table) === null);
  if (candidates.length === 0) return null;
  const target = targetFor(spell.effects, candidates, null, spell.maxTargetTier);
  if (!target) return null;
  if (spell.effects.some((e) => e.do === 'sacrifier' || e.do === 'detruire') && (target.golden || minionPower(target) > 12)) return null;
  return { t: 'cast', uid: held.uid, target: target.uid };
}

/** Le sort de la boutique, s'il rapporte assez pour son prix. */
function spellBuy(view: PlayerView, reserve: number, bot: BotState): PlayerAction | null {
  if (handCount(view) >= view.handLimit) return null;
  let best: { slot: number; score: number } | null = null;
  view.shopSpells.forEach((id, slot) => {
    const cost = view.shopSpellCosts[slot];
    if (view.budget - cost < reserve) return;
    const spell = SPELL_BY_ID[id];
    if (spell.target && view.board.length === 0) return;
    const frees = spell.effects.some((e) => e.do === 'oublier');
    // Le Bracelet ne vaut que s'il y a un scandale qui coûte.
    const value = frees ? (braceletUseful(view) ? 8 : bot.combos && wantsBracelet(view) ? 5 : 0) : spellWorth(spell, view, bot);
    const score = value - cost * BUDGET_WORTH;
    if (score > 0 && (!best || score > best.score)) best = { slot, score };
  });
  return best ? { t: 'buy_spell', slot: (best as { slot: number }).slot } : null;
}

function shopChoice(view: PlayerView, bot: BotState): { slot: number; score: number } | null {
  let best: { slot: number; score: number } | null = null;
  const base = bot.level === 'difficile' ? strength(view.board, view, 1) : 0;
  view.shop.forEach((id, slot) => {
    const card = CARD_BY_ID[id];
    const gain = view.shopGains[slot] ?? { atk: 0, hp: 0 };
    let score = cardScore(card, view, bot) + gain.atk + gain.hp;
    if (bot.level === 'difficile' && view.seen.length > 0 && view.board.length < view.boardLimit) {
      const hypothetical = preferredOrder([...view.board, { ...makeMinion(card, -1 - slot), atk: card.atk + gain.atk, hp: card.hp + gain.hp }]);
      score += (strength(hypothetical, view, 1) - base) * 0.6;
    }
    if (!best || score > best.score) best = { slot, score };
  });
  return best;
}

/**
 * Geler la boutique en fin de tour (difficile), quand le budget ne suffit plus et qu'elle garde de quoi compléter un
 * triple, ou une pièce de combo (multiplicateur, relanceur, Sarkozy) : la manche suivante, elle est encore là.
 */
function freezeMove(view: PlayerView, bot: BotState): PlayerAction | null {
  if (!bot.combos || view.frozen || view.shop.length === 0 || view.budget >= view.buyCost) return null;
  const keeps = view.shop.some((id) => {
    const card = CARD_BY_ID[id];
    if (owned(view, id) >= 2) return true;
    return doublerWorth(card.effects ?? [], view) + engineWorth(card.effects ?? [], Boolean(card.golden), view) > 10;
  });
  return keeps ? { t: 'freeze' } : null;
}

function worstMinion(view: PlayerView, bot?: BotState): Minion | null {
  // Un bot pur garde son camp, sauf ce qui rapporte à la revente (Poisson) : le vendre, c'est jouer la carte.
  const sellsWell = (m: Minion) => m.effects.some((e) => e.when === 'vente');
  const combo = (m: Minion) => (bot?.combos ? doublerWorth(m.effects, view) + engineWorth(m.effects, m.golden, view, m.uid) + (m.token ? 0 : knownForce(m.cardId, view, bot)) : 0);
  const keep = (m: Minion) => (bot?.pure && m.camp === bot.commitment && !sellsWell(m) ? 100 : 0) + minionPower(m) + combo(m);
  let worst: Minion | null = null;
  for (const m of view.board) {
    // Sous bracelet, il ne se renvoie pas avant la prochaine manche.
    if (m.bracelet || (m.golden && !bot?.pure)) continue;
    if (!worst || keep(m) < keep(worst)) worst = m;
  }
  return worst;
}

/** Le meilleur score de la boutique, pour savoir si elle vaut la peine d'être gardée. */
/**
 * Ce qu'une actualisation rapporte au plateau, en stats : les gains « quand vous actualisez » de ses politiques
 * (Dupont-Aignan, Lafont, Asselineau, Knafo), le budget rendu (Messiha) compté 2. Un doré compte double.
 */
function rollEngine(view: PlayerView): number {
  let value = 0;
  for (const m of view.board) {
    for (const e of m.effects) {
      if (e.when !== 'actualise') continue;
      const k = e.power ?? (m.golden ? 2 : 1);
      if (e.do !== 'buff') {
        value += 2 * k;
        continue;
      }
      const ofCamp = (x: Minion) => !e.camp || x.camp === e.camp;
      const targets = e.to === 'camp' ? view.board.filter(ofCamp).length : e.to === 'toute_la_main' ? view.hand.filter(ofCamp).length : 1;
      value += (e.atk + e.hp) * targets * k;
    }
  }
  return value;
}

function bestShopScore(view: PlayerView, bot: BotState): number {
  let best = -Infinity;
  for (const id of view.shop) best = Math.max(best, cardScore(CARD_BY_ID[id], view, bot));
  return best;
}

function discoverChoice(view: PlayerView, bot: BotState): PlayerAction {
  const options = view.discover as string[];
  let bestI = 0;
  let bestScore = -Infinity;
  options.forEach((id, i) => {
    const s = view.discoverKind === 'sort' ? spellWorth(SPELL_BY_ID[id], view, bot) : cardScore(CARD_BY_ID[id], view, bot);
    if (s > bestScore) {
      bestScore = s;
      bestI = i;
    }
  });
  return { t: 'discover', i: bestI };
}

const SPENDS = new Set<PlayerAction['t']>(['buy', 'buy_spell', 'buy_casserole', 'roll', 'upgrade']);

/** Le facile distrait : il pose et lance encore ce qu'il a en main, mais oublie le budget qui lui reste. */
function distracted(action: PlayerAction | null, view: PlayerView, bot: BotState): PlayerAction | null {
  if (action && SPENDS.has(action.t) && view.budget <= bot.forgets) return null;
  return action;
}

function easyTurn(view: PlayerView, bot: BotState): PlayerAction | null {
  if (view.discover) return { t: 'discover', i: bot.rng.int(view.discover.length) };
  const fromHand = handMove(view, bot, 4);
  if (fromHand) return fromHand;
  const cast = castMove(view, bot);
  if (cast) return cast;
  // Il suit la courbe de montée : monter au hasard le ruinait depuis que les plateaux grandissent au recrutement.
  const behind = view.tier < expectedTier(view, bot);
  if (view.tier < view.params.tierMax && !view.upgradeLock && view.budget >= view.upgradeCost && behind) return { t: 'upgrade' };

  // Un débutant croit tout ce qu'on lui vend : il prend la casserole sans regarder où elle mène.
  if (view.casseroleOffer && view.casseroleCost !== null && view.budget - view.casseroleCost >= view.buyCost && handCount(view) < view.handLimit) {
    if (view.board.some((m) => !m.token) && bot.rng.next() < 0.15 + bot.casseroleTaste * 0.35) return { t: 'buy_casserole' };
  }

  if (view.budget >= view.buyCost && view.shop.length > 0) {
    const a = bot.rng.int(view.shop.length);
    const b = bot.rng.int(view.shop.length);
    const note = (i: number) => {
      const card = CARD_BY_ID[view.shop[i]];
      const copain = bot.commitment && card.camp === bot.commitment ? 4 : 0;
      return cardPower(card) + gout(card, bot) + copain;
    };
    const slot = note(a) >= note(b) ? a : b;
    if (view.board.length + view.hand.length < view.boardLimit && handRoom(view, view.shop[slot])) return { t: 'buy', slot, main: true };
    // Plateau plein : il renvoie le plus faible quand la boutique propose nettement mieux.
    const worst = worstMinion(view, bot);
    if (worst && view.hand.length === 0 && cardPower(CARD_BY_ID[view.shop[slot]]) > minionPower(worst) + 4) return { t: 'sell', uid: worst.uid };
  }
  const spell = spellBuy(view, 0, bot);
  if (spell && bot.rng.next() < 0.5) return spell;
  if (view.budget >= view.rollCost + view.buyCost && bot.rolls < 1) {
    bot.rolls++;
    return { t: 'roll' };
  }
  if (!bot.ordered) {
    bot.ordered = true;
    // Il oublie souvent de ranger son plateau.
    if (bot.rng.next() < 0.6) return null;
    const move = firstOrderingMove(view.board, preferredOrder(view.board));
    if (move) {
      bot.ordered = false;
      return move;
    }
  }
  return null;
}

/** Imite un humain qui découvre : les plus grosses stats, une montée régulière, des sorts au jugé, pas de placement. */
function debutantTurn(view: PlayerView, bot: BotState): PlayerAction | null {
  const stats = (c: { atk: number; hp: number }) => c.atk + c.hp;
  if (view.discover) return { t: 'discover', i: 0 };
  const fromHand = handMove(view, bot, 3);
  if (fromHand) return fromHand;
  const cast = castMove(view, bot);
  if (cast) return cast;
  const paliers = [0, 0, 3, 5, 7, 9, 11];
  if (view.tier < view.params.tierMax && !view.upgradeLock && view.round >= paliers[view.tier + 1] && view.budget >= view.upgradeCost) return { t: 'upgrade' };
  if (view.casseroleOffer && view.casseroleCost !== null && view.budget >= view.casseroleCost + view.buyCost && handCount(view) < view.handLimit) {
    const c = CASSEROLE_BY_ID[view.casseroleOffer];
    if (casseroleTarget(view, c, bot)) return { t: 'buy_casserole' };
  }
  if (view.budget >= view.buyCost && view.shop.length > 0) {
    let slot = 0;
    view.shop.forEach((id, i) => {
      if (stats(CARD_BY_ID[id]) > stats(CARD_BY_ID[view.shop[slot]])) slot = i;
    });
    if (view.board.length + view.hand.length < view.boardLimit && handRoom(view, view.shop[slot])) return { t: 'buy', slot, main: true };
    const worst = view.board.filter((m) => !m.bracelet).sort((x, y) => stats(x) - stats(y))[0];
    if (worst && stats(CARD_BY_ID[view.shop[slot]]) > stats(worst) + 3) return { t: 'sell', uid: worst.uid };
  }
  if (bot.place) {
    const move = firstOrderingMove(view.board, preferredOrder(view.board));
    if (move) return move;
  }
  return null;
}

/** Décide de la prochaine action. Retourne null pour terminer le recrutement. */
export function decide(view: PlayerView, bot: BotState): PlayerAction | null {
  if (view.heroOffers) return { t: 'hero', i: bot.rng.int(view.heroOffers.length) };
  if (view.phase !== 'recrutement') return null;
  if (bot.round !== view.round) {
    if (bot.personnage && !bot.perso) incarner(view, bot);
    bot.round = view.round;
    bot.ordered = false;
    bot.rolls = 0;
    bot.kept = new Set();
    // Le difficile ne tire pas de camp au hasard : il suit celui que son plateau a pris (`dominantCamp`). Sauf le bot de
    // mesure « pur », qui doit avoir un camp.
    if (bot.willCommit && !bot.commitment && (bot.level !== 'difficile' || bot.pure)) bot.commitment = bot.rng.pick(view.camps);
    // Le facile oublie parfois ses derniers sous : à partir de la manche 3, une manche sur sept, il cesse de dépenser
    // quand il lui reste 2 ou 3 de budget.
    if (bot.level === 'facile') bot.forgets = view.round >= 3 && bot.rng.next() < 0.15 ? 2 + bot.rng.int(2) : 0;
  }
  if (bot.level === 'debutant') return debutantTurn(view, bot);
  if (bot.level === 'facile') return distracted(easyTurn(view, bot), view, bot);

  if (view.discover) return discoverChoice(view, bot);

  const wantTier = expectedTier(view, bot);
  // Dans une carrière, monter peut être interdit pour un temps (« Vice-président à rien »).
  const canUpgrade = view.tier < view.params.tierMax && !view.upgradeLock && view.budget >= view.upgradeCost;
  if (canUpgrade) {
    let want = view.tier < wantTier;
    if (bot.level === 'difficile' && view.seen.length > 0) {
      const margin = strength(view.board, view, 1);
      // Monter parce qu'on domine coûtait 0,3 place : le budget vaut mieux sur le plateau.
      if (margin < -8 && view.hp < 12 && view.board.length < view.boardLimit) want = false;
    }
    if (want || view.upgradeCost === 0) return { t: 'upgrade' };
  }

  // Après la montée : poser, rallier, lancer ce qu'on a en main.
  const fromHand = handMove(view, bot);
  if (fromHand) return fromHand;
  const cast = castMove(view, bot);
  if (cast) return cast;
  const combo = casseroleCombo(view, bot);
  if (combo) return combo;

  if (bot.rollDown && view.tier >= 3 && bot.rolls < 8 && view.budget >= view.rollCost + view.buyCost && bestShopScore(view, bot) < 6 + 3 * view.tier) {
    bot.rolls++;
    return { t: 'roll' };
  }

  // Une actualisation gratuite se prend avant d'acheter, tant que la boutique déçoit.
  if (view.rollCost === 0 && bot.rolls < 4 && bestShopScore(view, bot) < 6 + 3 * view.tier) {
    bot.rolls++;
    return { t: 'roll' };
  }

  // Revendre le plus faible pour s'offrir mieux. La revente rapporte plus à certains héros.
  if (view.budget < view.buyCost && view.shop.length > 0) {
    const refund = view.params.sellValue + (view.mods.sellBonus ?? 0);
    const worst = worstMinion(view, bot);
    if (worst && view.budget + refund >= view.buyCost) {
      const choice = shopChoice(view, bot);
      // Un Assistant fictif n'attaque pas : c'est de l'argent qui attend, on le revend sans hésiter.
      const margin = worst.noAttack ? 0 : 8 - (view.mods.sellBonus ?? 0) * 4;
      const camp = bot.pure && worst.camp === bot.commitment && !worst.effects.some((e) => e.when === 'vente') ? 100 : 0;
      if (choice && choice.score > boardScore(worst, view, bot) + margin + camp) return { t: 'sell', uid: worst.uid };
    }
  }

  if (view.budget >= view.buyCost && view.shop.length > 0) {
    const choice = shopChoice(view, bot);
    if (choice) {
      const card = CARD_BY_ID[view.shop[choice.slot]];
      const completes = owned(view, card.id) >= 2 && handRoom(view, card.id);
      // Un bot pur ne prend hors de son camp que pour ne pas rester avec un plateau vide au début.
      const offCamp = bot.pure && card.camp !== bot.commitment && card.camp !== 'civile';
      const hole = view.board.length < Math.min(view.boardLimit, 2 + Math.floor(view.round / 2));
      const tolerated = !offCamp || view.board.length < 2 || (view.round <= 3 && view.board.length < 3) || hole;
      const rallies = (card.keywords ?? []).includes('ralliement');
      const hasRoom = (view.board.length + view.hand.length < view.boardLimit || rallies) && handRoom(view, card.id);
      if ((hasRoom && tolerated) || completes) return { t: 'buy', slot: choice.slot, main: true };
      const worst = worstMinion(view, bot);
      const swap = bot.pure ? card.camp === bot.commitment && worst !== null && worst.camp !== bot.commitment : false;
      const swapMargin = 3 - (view.mods.sellBonus ?? 0) * 2;
      if (worst && view.hand.length === 0 && (swap || (!bot.pure && cardScore(card, view, bot) > boardScore(worst, view, bot) + swapMargin))) {
        return { t: 'sell', uid: worst.uid };
      }
    }
  }

  // Un moteur d'actualisation (Reconquête) : chaque actualisation fait grandir le plateau, elle passe avant les sorts
  // et la casserole. Sans lui, le bot n'actualisait que cinq fois par partie, et le camp semblait le plus faible.
  const keep = view.board.length < view.boardLimit ? view.buyCost : 0;
  if (rollEngine(view) >= 2 && bot.rolls < 12 && (view.rollCost === 0 || view.budget >= view.rollCost + keep)) {
    bot.rolls++;
    return { t: 'roll' };
  }

  const spell = spellBuy(view, view.board.length < view.boardLimit ? view.buyCost : 0, bot);
  if (spell) return spell;

  // Plateau plein : l'argent qui reste prépare un triple en main.
  if (view.board.length >= view.boardLimit && view.budget >= view.buyCost) {
    const paire = view.shop.findIndex((id) => owned(view, id) >= 1 && handRoom(view, id));
    if (paire >= 0) return { t: 'buy', slot: paire, main: true };
  }

  // La casserole, avec ce qui reste après les politiques et les sorts : l'acheter d'abord coûtait 0,16 place
  // (styles comparés par bilan_styles.ts), et le bot en achetait onze par partie.
  if (view.casseroleOffer && view.casseroleCost !== null && view.budget >= view.casseroleCost && handCount(view) < view.handLimit) {
    if (casseroleTarget(view, CASSEROLE_BY_ID[view.casseroleOffer], bot)) return { t: 'buy_casserole' };
  }

  const rollsAllowed = bot.pure ? 10 : bot.level === 'difficile' ? 6 : 3;
  if (view.budget >= view.rollCost + view.buyCost && bot.rolls < rollsAllowed) {
    bot.rolls++;
    return { t: 'roll' };
  }

  const lastSpell = spellBuy(view, 0, bot);
  if (lastSpell) return lastSpell;

  const freeze = freezeMove(view, bot);
  if (freeze) return freeze;

  if (!bot.ordered) {
    const target = bot.level === 'difficile' ? bestOrdering(view, bot) : preferredOrder(view.board);
    const move = firstOrderingMove(view.board, target);
    if (move) return move;
    bot.ordered = true;
  }
  return null;
}
