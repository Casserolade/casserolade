import { keywordsAlreadyThere } from './keywordsAlreadyThere.ts';
import { relaunchable } from './relaunch.ts';
import type { Minion, Spell } from './types.ts';

/** What a cast depends on, beyond its target: the engine, the bots and the screen read it from the same table. */
export interface SpellTable {
  board: readonly Minion[];
  shopSize: number;
  boardLimit: number;
  /** The minions already relaunched this round (rule R4). */
  relaunched: readonly number[];
}

/**
 * Why this spell, cast on this target (or on none), would be lost, in the words the player reads; null when it does
 * something. A lost spell is refused and stays in the hand (7 November 2026: a Seconde délibération on De Gaulle,
 * already relaunched by Chirac, was spent for nothing).
 */
export function lostSpellReason(spell: Spell, target: Minion | null, table: SpellTable): string | null {
  if (spell.effects.some((e) => e.do === 'debaucher') && table.shopSize === 0) return 'La boutique est vide : personne à débaucher.';
  for (const eff of spell.effects) {
    if (eff.do !== 'declencher') continue;
    if (!target) {
      const open = table.board.some((m) => !table.relaunched.includes(m.uid) && relaunchable(m.effects, eff.trigger).length > 0);
      if (!open) return 'Aucun de vos politiques n\'a d\'effet à relancer cette manche.';
      continue;
    }
    const replayed = relaunchable(target.effects, eff.trigger);
    if (replayed.length === 0) return 'Ce politique n\'a rien à relancer.';
    if (table.relaunched.includes(target.uid)) return 'Déjà relancé cette manche : un politique ne se relance qu\'une fois par manche.';
    if (replayed.every((e) => e.do === 'invoquer' || e.do === 'chaise_vide') && table.board.length >= table.boardLimit) {
      return 'Plateau complet : ce qu\'il invoque n\'aurait pas de place.';
    }
  }
  if (target && keywordsAlreadyThere(spell.effects, target.keywords)) return 'Ce politique l\'a déjà : le sort serait perdu.';
  return null;
}
