import { END_OF_TURN_NOTES } from '#src/client/const/endOfTurnNotes.ts';
import type { EndOfTurnNote } from '#src/engine/types.ts';

/**
 * The words next to the politician whose end-of-turn effect plays: what it touched besides the board,
 * that it had nothing to do (Macron without a golden), or that the hero's power did it.
 */
export function endOfTurnNoteLabel(notes: EndOfTurnNote[], { idle, fromHero }: { idle: boolean; fromHero: boolean }): string | null {
  if (idle) return 'Rien à faire';
  const words = notes.map((note) => END_OF_TURN_NOTES[note]);
  if (fromHero) words.unshift('Pouvoir du héros');
  return words.length > 0 ? words.join(' · ') : null;
}
