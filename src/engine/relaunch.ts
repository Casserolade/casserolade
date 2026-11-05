import type { Effect, Trigger } from './types.ts';

/** Un effet qui détruit l'allié visé (Hidalgo, Primaire) : il demande toujours un choix du joueur. */
export function destroysAlly(eff: Effect): boolean {
  return eff.do === 'sacrifier' || eff.do === 'detruire';
}

/**
 * Les effets qu'une relance rejoue (Chirac, Jadot, Glucksmann, Seconde délibération, Tribune libre) : ceux de ce
 * déclencheur, sauf une Annonce ciblée qui détruit. Sans le choix du joueur, elle ne détruit personne.
 */
export function relaunchable(effects: readonly Effect[], trigger: Trigger): Effect[] {
  return effects.filter((e) => e.when === trigger && !(e.to === 'cible' && destroysAlly(e)));
}
