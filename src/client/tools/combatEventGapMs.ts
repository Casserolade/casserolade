import type { CombatEvent } from '#src/engine/types.ts';
import { combatEventDuration } from '#src/protocol/combatDuration.ts';

/** What lands at the contact of an attack: a blow, a shield that breaks, a Polémique. */
const BLOWS = new Set<CombatEvent['e']>(['degats', 'immunite', 'polemique', 'resiste']);
/** The two blows of one exchange land together, a hair apart: « ba-dam ». */
const EXCHANGE_GAP_MS = 80;
/** Politicians who fall together go out in a quick wave, not one after the other. */
const DEATH_WAVE_GAP_MS = 140;
/** A killing blow sends its victim off at once, as in Battlegrounds. */
const BLOW_TO_DEATH_GAP_MS = 200;

/**
 * How long the stage waits after `event` before playing `next`, at normal speed: never longer than the shared
 * duration the server counts on (combatDuration.ts), shorter when both belong to one moment.
 */
export function combatEventGapMs(event: CombatEvent, next: CombatEvent | undefined): number {
  const full = combatEventDuration(event);
  if (!next) return full;
  if (BLOWS.has(event.e) && BLOWS.has(next.e)) return Math.min(full, EXCHANGE_GAP_MS);
  if (event.e === 'mort' && next.e === 'mort') return Math.min(full, DEATH_WAVE_GAP_MS);
  if (BLOWS.has(event.e) && next.e === 'mort') return Math.min(full, BLOW_TO_DEATH_GAP_MS);
  return full;
}
