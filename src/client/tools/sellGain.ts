import type { HeroMods, Minion, Params } from '#src/engine/types.ts';

/**
 * What sending this minion back from the board brings (the hand sends nothing back): the sale price, plus the budget of
 * its own Vente effects. `later` comes at the next round.
 */
export function sellGain(params: Params, mods: HeroMods, minion: Minion): { now: number; later: number } {
  const gain = { now: params.sellValue + (mods.sellBonus ?? 0), later: 0 };
  for (const effect of minion.effects) {
    if (effect.when !== 'vente' || effect.do !== 'budget') continue;
    // The view tells the power of each effect: a golden one plays doubled.
    const power = effect.power ?? (minion.golden ? 2 : 1);
    if (effect.plus_tard) gain.later += effect.value * power;
    else gain.now += effect.value * power;
  }
  return gain;
}
