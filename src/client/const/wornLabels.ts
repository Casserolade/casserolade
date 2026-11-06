import type { WornCasserole } from '#src/client/tools/wornCasserole.ts';

/** Where a casserole stands, in a word, on the list of the phone's card. */
export const WORN_LABELS: Record<WornCasserole['state'], string> = {
  dormant: 'Pas oubliée',
  scandal: 'En scandale',
  forgotten: 'Oubliée',
};
