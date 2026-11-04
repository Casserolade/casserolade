import type { CombatEvent } from '../engine/types.ts';

const DURATION_MS: Record<CombatEvent['e'], number> = {
  debut: 900,
  attaque: 450,
  degats: 300,
  immunite: 500,
  polemique: 600,
  resiste: 500,
  stats: 250,
  mot_cle: 250,
  effet: 500,
  mort: 500,
  retour: 500,
  penalite: 300,
  invocation: 400,
  exil: 500,
  fin: 1200,
  /** La bulle du Célébrant : la petite phrase doit se lire. */
  celebration: 2200,
  reponse: 1800,
};

/** How long an event plays at normal speed. Shared so that the server's patience matches the client. */
export function combatEventDuration(event: CombatEvent): number {
  return DURATION_MS[event.e];
}
