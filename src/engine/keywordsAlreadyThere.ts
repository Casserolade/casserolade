import type { Effect, Keyword } from './types.ts';

/**
 * A spell that only gives keywords to its target, all of which the target already has: cast, it would be lost. A spell
 * that does anything else (Éléments de langage also gives +0/+2, Temps de parole toggles) is never lost this way.
 */
export function keywordsAlreadyThere(effects: readonly Effect[], keywords: readonly Keyword[]): boolean {
  const gifts = effects.filter((e) => e.to === 'cible');
  if (gifts.length === 0 || !gifts.every((e) => e.do === 'mot_cle')) return false;
  return gifts.every((e) => e.do === 'mot_cle' && keywords.includes(e.keyword));
}
