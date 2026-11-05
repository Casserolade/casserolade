import { SPELL_BY_ID } from '#src/data/sorts.ts';
import { relaunchable } from '#src/engine/relaunch.ts';
import type { Effect, HandSpell, Minion } from '#src/engine/types.ts';

/** Its Annonce asks the player to point at an ally. */
export function annonceNeedsTarget(effects: Effect[]): boolean {
  return effects.some((effect) => effect.when === 'annonce' && effect.to === 'cible');
}

/**
 * It destroys the ally it lands on (Hidalgo, the Primaire): the player always points at it,
 * even when it is the only one. A bonus may go straight to a lone ally; a loss may not.
 */
export function destroysTarget(effects: Effect[]): boolean {
  return effects.some((effect) => effect.to === 'cible' && (effect.do === 'detruire' || effect.do === 'sacrifier'));
}

/** The effects a spell of the hand applies when cast: none for a casserole. */
export function heldSpellEffects(held: HandSpell): Effect[] {
  return held.spellId ? (SPELL_BY_ID[held.spellId]?.effects ?? []) : [];
}

/** A card of the hand that is not a minion: does it go onto a minion of the board? */
export function spellNeedsTarget(held: HandSpell): boolean {
  if (held.casseroleId) return true;
  return Boolean(held.spellId && SPELL_BY_ID[held.spellId]?.target);
}

/**
 * The minions of the board that this spell or casserole may land on, as the engine checks them. A relaunch (Seconde
 * délibération, Tribune libre) only lands on a minion that has something to relaunch.
 */
export function spellTargets(held: HandSpell, board: Minion[]): number[] {
  if (held.casseroleId) return board.filter((m) => !m.token).map((m) => m.uid);
  const spell = held.spellId ? SPELL_BY_ID[held.spellId] : undefined;
  if (!spell?.target) return [];
  const maxTier = spell.maxTargetTier;
  const relaunch = spell.effects.find((effect) => effect.do === 'declencher');
  return board
    .filter((m) => maxTier === undefined || (!m.golden && !m.token && !m.simple && m.tier <= maxTier))
    .filter((m) => relaunch?.do !== 'declencher' || relaunchable(m.effects, relaunch.trigger).length > 0)
    .map((m) => m.uid);
}

/**
 * The allies an Annonce may point at: anyone but the minion itself.
 * Making a minion golden only works on a plain one of a low enough tier: the others are left out.
 */
export function allyTargets(board: Minion[], self?: number, effects: Effect[] = []): number[] {
  const gilding = effects.find((effect) => effect.to === 'cible' && effect.do === 'dorer');
  const maxTier = gilding?.do === 'dorer' ? gilding.maxTier : null;
  return board
    .filter((m) => m.uid !== self && (maxTier === null || (!m.golden && !m.token && m.tier <= maxTier)))
    .map((m) => m.uid);
}
