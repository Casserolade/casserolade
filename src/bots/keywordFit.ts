import type { Keyword, Minion } from '../engine/types.ts';

/** Au-delà, un politique tue ou tient de toute façon : la valeur d'un mot-clé ne grandit plus avec ses stats. */
const BIG = 40;

function attacksForGrowth(host: Minion): boolean {
  return host.effects.some((e) => e.when === 'meeting');
}

/**
 * Ce qu'un mot-clé apporte à ce politique, pour un bot qui choisit où le poser (Ralliement, sort) : rien s'il l'a
 * déjà, et plus ou moins selon ce qu'il est. Même échelle que les stats.
 * - La Polémique détruit ce qu'elle blesse : perdue sur un géant, qui aurait tué de toute façon. Elle va sur une
 *   petite attaque, de préférence un Porte-parole (l'ennemi doit le frapper) ou une Immunité (il survit au coup).
 * - L'Immunité protège le plus gros ; le Cumul des mandats double la plus grosse attaque, et les « Quand il attaque » ;
 *   le Retour rejoue un Héritage ou une attaque qui fait grandir ; Porte-parole va aux plus gros PV.
 */
export function keywordFit(keyword: Keyword, host: Minion): number {
  if (host.keywords.includes(keyword)) return 0;
  const atk = Math.min(host.atk, BIG);
  const hp = Math.min(host.hp, BIG);
  switch (keyword) {
    case 'polemique':
      return 20 + (BIG - atk) / 2 + (host.keywords.includes('porte_parole') ? 15 : 0) + (host.keywords.includes('immunite') ? 8 : 0);
    case 'immunite':
      return 10 + (atk + hp) / 2;
    case 'cumul':
    case 'balai':
      return 10 + atk + (attacksForGrowth(host) ? 15 : 0);
    case 'retour':
      return 10 + (attacksForGrowth(host) ? 15 : 0) + (host.effects.some((e) => e.when === 'heritage') ? 10 : 0) + atk / 8;
    case 'porte_parole':
      return 5 + hp;
    default:
      return 0;
  }
}
