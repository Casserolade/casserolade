const BASE_SIZE = 46;
const CHARACTERS_AT_BASE_SIZE = 15;

/** The size of a card's name, in card units: long names shrink so they stay on the ribbon. */
export function fittedNameSize(name: string): number {
  return Math.round(BASE_SIZE * Math.min(1, CHARACTERS_AT_BASE_SIZE / name.length));
}
