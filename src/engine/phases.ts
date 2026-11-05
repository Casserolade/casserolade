/**
 * La machine à états d'une partie : ses phases, et les seules transitions permises.
 *
 *   (création) ──► choix_heros ──► recrutement ──► combat ──► recrutement ──► …
 *                       └──────────────► (tous imposés)        └──► fini
 *
 *   choix_heros → recrutement   le dernier héros est choisi (chooseHero, chooseRemainingHeroes)
 *   recrutement → combat        fin du recrutement : Fin de tour, puis tous les combats (startCombats)
 *   combat      → recrutement   la manche suivante commence (finishRound)
 *   combat      → fini          il reste au plus un joueur en lice (finishRound)
 *
 * Dans chaque phase, les actions permises (applyAction refuse les autres, sans rien changer) :
 *   choix_heros : « hero » ; recrutement : toutes les autres, et seulement « discover » tant qu'un choix
 *   attend ; combat et fini : aucune.
 * Les états d'un joueur, d'un politique et d'une casserole sont vérifiés par invariants.ts.
 */
import type { Game, GamePhase } from './state.ts';

export const PHASE_TRANSITIONS: Readonly<Record<GamePhase, readonly GamePhase[]>> = {
  choix_heros: ['recrutement'],
  recrutement: ['combat'],
  combat: ['recrutement', 'fini'],
  fini: [],
};

/**
 * Passe à la phase suivante. Une transition qui n'est pas dans la table est un bug du moteur : elle
 * s'arrête net plutôt que de corrompre la partie, et le salon la signale avec son journal (room.ts).
 */
export function enterPhase(game: Game, next: GamePhase): void {
  if (!PHASE_TRANSITIONS[game.phase].includes(next)) {
    throw new Error(`Transition interdite : ${game.phase} → ${next} (manche ${game.round})`);
  }
  game.phase = next;
}
