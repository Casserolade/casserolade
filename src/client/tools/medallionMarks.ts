import type { Effect, Trigger } from '#src/engine/types.ts';

export interface MedallionMarks {
  /** A skull: something happens at its death. */
  heritage: boolean;
  /** A lightning bolt: it reacts to something during the game. */
  triggered: boolean;
  /** How many allies must die before its Revanche. */
  revanche: number | null;
  /** Confetti: it gains something when it celebrates a victory. */
  celebration: boolean;
  /** A speech bubble: it answers after a defeat. */
  reponse: boolean;
}

/** Already spent, always on, or shown elsewhere. */
const NOT_A_TRIGGER: Trigger[] = ['annonce', 'heritage', 'revanche', 'celebration', 'droit_de_reponse', 'aura'];

/** The small icons under a medallion: what its card hides, without reading it. */
export function medallionMarks(effects: Effect[]): MedallionMarks {
  const revanches = effects.filter((effect) => effect.when === 'revanche');
  return {
    heritage: effects.some((effect) => effect.when === 'heritage'),
    triggered: effects.some((effect) => !NOT_A_TRIGGER.includes(effect.when)),
    revanche: revanches.length ? Math.min(...revanches.map((effect) => effect.n ?? 1)) : null,
    celebration: effects.some((effect) => effect.when === 'celebration'),
    reponse: effects.some((effect) => effect.when === 'droit_de_reponse'),
  };
}
