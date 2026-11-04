import type { EndOfTurnNote } from '#src/engine/types.ts';

/** What an end-of-turn effect touched besides the board, said in two words next to it. */
export const END_OF_TURN_NOTES: Record<EndOfTurnNote, string> = {
  main: 'Main renforcée',
  sorts: 'Sort en main',
  tracts: 'Tracts améliorés',
  boutique: 'Boutique améliorée',
  budget: 'Budget',
  plateau: 'Plateau',
};
