import type { CombatEvent } from '../engine/types.ts';

/**
 * How long each event holds the stage before the next one, as nervous as Battlegrounds (7 November 2026): an attack
 * lasts until its lunge lands, so that the blow that follows lands at the contact; a death plays on under what comes
 * next. The client plays the two blows of one exchange almost together (combatEventGapMs), never slower than this.
 */
const DURATION_MS: Record<CombatEvent['e'], number> = {
  debut: 650,
  attaque: 250,
  degats: 360,
  immunite: 380,
  polemique: 450,
  resiste: 400,
  stats: 220,
  mot_cle: 220,
  effet: 420,
  mort: 420,
  /** La réincarnation descend dans sa lumière bleue : elle doit se voir. */
  retour: 700,
  penalite: 250,
  invocation: 350,
  exil: 400,
  fin: 800,
  /** La bulle du Célébrant : la petite phrase doit se lire. */
  celebration: 2200,
  reponse: 1800,
};

/** How long an event plays at normal speed. Shared so that the server's patience matches the client. */
export function combatEventDuration(event: CombatEvent): number {
  return DURATION_MS[event.e];
}
