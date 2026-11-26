import { lostSpellReason } from './lostSpellReason.ts';
import type { SpellTable } from './lostSpellReason.ts';
import type { PlayerView } from './game.ts';
import type { Counter, Hero, HeroMods, HeroPower, Minion, Spell } from './types.ts';

/**
 * Les pouvoirs de héros du 26 novembre 2026 : le cran d'un pouvoir passif au bout de quelques casseroles posées (le
 * palier), et le pouvoir activable, un sort qui reste sur le portrait. Le moteur, les bots et l'écran lisent ces
 * règles ici, pour ne jamais se contredire.
 */

/** La clé que prend, parmi les effets « une fois par manche », la première casserole posée de la manche (Macron la double). */
export const FIRST_CASSEROLE = 'heros:premiere_casserole';

/** Le prix d'une casserole avec une remise : jamais sous 1, sauf pour celle qui est gratuite (« 1,75 % »). */
export function discountedCasseroleCost(cost: number, discount: number): number {
  return cost === 0 ? 0 : Math.max(1, cost - discount);
}

/** Son palier est-il atteint ? Le compteur des casseroles posées dans la partie le dit. */
export function palierReached(hero: Pick<Hero, 'palier'>, counters: Pick<Record<Counter, number>, 'casseroles'>): boolean {
  return hero.palier !== undefined && counters.casseroles >= hero.palier.casseroles;
}

/** Les règles de son pouvoir à cet instant : celles du héros, plus celles de son palier une fois atteint. */
export function heroMods(p: { hero: Pick<Hero, 'mods' | 'palier'>; counters: Pick<Record<Counter, number>, 'casseroles'> }): HeroMods {
  const { hero } = p;
  return hero.palier && palierReached(hero, p.counters) ? { ...hero.mods, ...hero.palier.mods } : hero.mods;
}

/** Son pouvoir activable vu comme un sort : la même validation que les sorts de la main, les mêmes effets. */
export function powerSpell(hero: Pick<Hero, 'id' | 'power'>, power: HeroPower): Spell {
  return { id: `pouvoir:${hero.id}`, name: hero.power, tier: 0, cost: power.cost, target: power.target, effects: power.effects, token: true, maxTargetTier: power.maxTargetTier };
}

/** Ce dont dépend l'usage d'un pouvoir, au-delà de sa cible : la table des sorts, le budget, et ce qui a déjà servi. */
export interface PowerTable extends SpellTable {
  budget: number;
  used: boolean;
  handFull: boolean;
  /** Les compteurs de la partie : Balkany encaisse ses casseroles posées. */
  counters: Record<Counter, number>;
}

/** Peut-il viser ce politique ? Hollande ne dore qu'un politique ordinaire d'échelon 4 ou moins. */
function fitsTier(power: HeroPower, m: Minion): boolean {
  return power.maxTargetTier === undefined || (!m.golden && !m.token && !m.simple && m.tier <= power.maxTargetTier);
}

/** La table d'un pouvoir telle que la vue d'un joueur la donne : l'écran et les bots la lisent ici. */
export function powerTableOf(view: Pick<PlayerView, 'board' | 'shop' | 'boardLimit' | 'relaunched' | 'budget' | 'powerUsed' | 'hand' | 'spells' | 'handLimit' | 'counters'>): PowerTable {
  return {
    board: view.board,
    shopSize: view.shop.length,
    boardLimit: view.boardLimit,
    relaunched: view.relaunched,
    budget: view.budget,
    used: view.powerUsed,
    // Une pile de Tracts compte pour une carte, comme au moteur.
    handFull: view.hand.length + view.spells.length >= view.handLimit,
    counters: view.counters,
  };
}

/** Ce qui le refuse avant même de choisir une cible : déjà servi, trop cher, main pleine pour une découverte, plateau vide. */
export function powerBaseRefusal(power: HeroPower, table: PowerTable): string | null {
  if (table.used) return power.frequency === 'partie' ? 'Ce pouvoir ne sert qu\'une fois par partie.' : 'Déjà servi cette manche.';
  if (table.budget < power.cost) return 'Budget insuffisant.';
  if (power.effects.some((e) => e.do === 'decouvrir') && table.handFull) return 'Main pleine.';
  if (power.target && table.board.length === 0) return 'Il faut un politique sur le plateau.';
  // Un camp différent par politique de parti : sans aucun, la veste de Polony ne donnerait rien.
  if (power.effects.some((e) => e.do === 'buff_par_camp') && !table.board.some((m) => m.camp !== 'civile')) return 'Aucun parti sur votre plateau : rien à donner.';
  // Encaisser un compteur à zéro ne rapporterait rien : refusé, il attend.
  const counted = power.effects.find((e) => e.do === 'budget_compteur');
  if (counted?.do === 'budget_compteur' && table.counters[counted.compteur] === 0) return 'Rien à encaisser pour l\'instant.';
  return null;
}

/**
 * Ce qui le refuse quelle que soit la cible : la règle de base, puis ce qu'un sort sans cible trouverait à redire
 * (une boutique vide pour la taxe de Glucksmann). Null : seule la cible peut encore le refuser.
 */
export function powerTableRefusal(hero: Pick<Hero, 'id' | 'power'>, power: HeroPower, table: PowerTable): string | null {
  return powerBaseRefusal(power, table) ?? lostSpellReason(powerSpell(hero, power), null, table);
}

/**
 * Pourquoi ce pouvoir, sur cette cible (ou sans), est refusé, dans les mots du joueur ; null s'il sert. Comme un sort,
 * un pouvoir qui ne ferait rien est refusé et ne compte pas comme servi.
 */
export function powerRefusal(hero: Pick<Hero, 'id' | 'power'>, power: HeroPower, target: Minion | null, table: PowerTable): string | null {
  const base = powerBaseRefusal(power, table);
  if (base) return base;
  if (power.target) {
    if (!target) return 'Choisissez un politique.';
    if (!fitsTier(power, target)) return `Il faut un politique non doré d'échelon ${power.maxTargetTier} ou moins.`;
  }
  return lostSpellReason(powerSpell(hero, power), target, table);
}

/** Les politiques du plateau sur lesquels ce pouvoir servirait. */
export function powerTargets(hero: Pick<Hero, 'id' | 'power'>, power: HeroPower, table: PowerTable): number[] {
  if (!power.target) return [];
  return table.board.filter((m) => powerRefusal(hero, power, m, table) === null).map((m) => m.uid);
}
