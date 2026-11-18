import type { CombatUnit } from '#src/engine/types.ts';

/**
 * How a politician leaves the stage (7 November 2026: varied deaths, in light and in 3D, never an object falling on
 * it). Thrown out like a pinball (`eject`), broken to pieces (`shatter`), blown up (`explode`), burnt by a Polémique
 * (`burn`), a golden one bursting into coins (`gold`), one that celebrates going off the air (`tv-off`), a token popping (`pop`),
 * or going out in light when no blow killed it (`light`).
 */
export type DeathKind = 'eject' | 'shatter' | 'explode' | 'burn' | 'gold' | 'tv-off' | 'pop' | 'light';

/** The blow that killed: its damage, and the health it found. */
export interface KillingBlow {
  value: number;
  before: number;
}

/**
 * A critical blow blows the politician up: more than this many points past the health it had left (15 November 2026:
 * the explosion, loud and brutal, came far too often; it is kept for the blows that deserve it).
 */
const CRITICAL_EXCESS = 40;
/** Past this excess, or from this blow, the medallion breaks to pieces instead of flying off whole. */
const SHATTERING_EXCESS = 3;
const SHATTERING_BLOW = 8;

/** The death that fits: the Polémique first, then gold, then the blow's excess, then who the politician is. */
export function deathKind(unit: Pick<CombatUnit, 'golden' | 'effects' | 'token'> | undefined, blow: KillingBlow | undefined, poisoned: boolean): DeathKind {
  if (poisoned) return 'burn';
  if (unit?.golden) return 'gold';
  if (!blow) return 'light';
  const excess = blow.value - Math.max(0, blow.before);
  if (excess > CRITICAL_EXCESS) return 'explode';
  if (unit?.effects.some((effect) => effect.when === 'celebration')) return 'tv-off';
  if (unit?.token) return 'pop';
  if (excess >= SHATTERING_EXCESS || blow.value >= SHATTERING_BLOW) return 'shatter';
  return 'eject';
}
