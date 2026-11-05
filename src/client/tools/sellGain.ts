import type { HeroMods, Minion, Params } from '#src/engine/types.ts';

/**
 * What sending this minion back brings: the sale price, plus the budget of its own Vente effects,
 * which only play from the board. `later` comes at the next round.
 */
export function sellGain(params: Params, mods: HeroMods, minion: Minion, fromBoard: boolean): { now: number; later: number } {
  const gain = { now: params.sellValue + (mods.sellBonus ?? 0), later: 0 };
  if (!fromBoard) return gain;
  for (const effect of minion.effects) {
    if (effect.when !== 'vente' || effect.do !== 'budget') continue;
    // The view tells the power of each effect: a golden one plays doubled.
    const power = effect.power ?? (minion.golden ? 2 : 1);
    if (effect.plus_tard) gain.later += effect.value * power;
    else gain.now += effect.value * power;
  }
  return gain;
}
