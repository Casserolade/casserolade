/** The host speaks after a combat now and then, at random: about one combat in four. */
export const HOST_CHANCE = 0.25;

export type AfterCombatSpeaker = 'rival' | 'host' | null;

export interface AfterCombatVoices {
  /** A medallion said its line during the combat: the one who celebrates, or the one who answers. */
  minionSpoke: boolean;
  /** What the rival hero would say, if anything. */
  rivalLine: string | null;
  /** What the host would say, if anything. */
  hostLine: string | null;
  /** A number in [0, 1): the host's dice. */
  roll: number;
}

/**
 * Who speaks once a combat is over: one voice at a time, never two bubbles together. The medallion
 * that celebrates has already spoken: then the hero keeps quiet. The hero speaks only when no
 * medallion did. The host speaks only now and then, at random, and then alone.
 */
export function afterCombatSpeaker({ minionSpoke, rivalLine, hostLine, roll }: AfterCombatVoices): AfterCombatSpeaker {
  if (hostLine && roll < HOST_CHANCE) return 'host';
  if (!minionSpoke && rivalLine) return 'rival';
  return null;
}
