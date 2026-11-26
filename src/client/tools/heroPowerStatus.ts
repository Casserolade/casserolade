import { powerRefusal, powerTableOf, powerTableRefusal, powerTargets } from '#src/engine/heroPower.ts';
import type { PlayerView } from '#src/engine/game.ts';
import type { HeroPower } from '#src/engine/types.ts';

/** What the hero's activable power can do right now, as the engine would answer. */
export interface HeroPowerStatus {
  name: string;
  power: HeroPower;
  /** Why it cannot be used now (already used, too dear, nobody to aim at), in the player's words; null when it can. */
  refusal: string | null;
  /** The allies it may land on, when it needs one. */
  targets: number[];
}

const NOBODY = 'Aucun de vos politiques ne peut le recevoir.';

/**
 * The state of the hero's activable power for the screen: null for a passive power. A power that needs a target is
 * refused here only for what does not depend on the target, or when no ally at all could receive it.
 */
export function heroPowerStatus(view: PlayerView, name: string): HeroPowerStatus | null {
  const power = view.pouvoir;
  if (!power) return null;
  const table = powerTableOf(view);
  const hero = { id: view.heroId, power: name };
  const targets = power.target ? powerTargets(hero, power, table) : [];
  const refusal = power.target ? (powerTableRefusal(hero, power, table) ?? (targets.length === 0 ? NOBODY : null)) : powerRefusal(hero, power, null, table);
  return { name, power, refusal, targets };
}
