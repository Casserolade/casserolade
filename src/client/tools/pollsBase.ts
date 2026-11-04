import { HEROES } from '#src/data/heroes.ts';
import { PARAMS } from '#src/data/params.ts';

/**
 * The polls every hero shares, whatever their electoral base. It is the start of the hero
 * with the lowest bonus, scaled like the bonuses when a story chapter starts lower.
 */
export function pollsBase(startHp: number): number {
  const lowestBonus = Math.min(...HEROES.map((hero) => hero.hpBonus));
  return startHp + Math.round((lowestBonus * startHp) / PARAMS.startHp);
}
