/** The rules box of a card, in card units (see CardFace.vue). */
const BOX_WIDTH = 396;
/** The box is 176 high, but its last units sit behind the stat medals: the text keeps clear of them. */
const BOX_HEIGHT = 160;
const LINE_HEIGHT = 1.1;
const GAP = 6;
/** The average width of a character of Alegreya Sans, as a share of the font size, word wrapping included. */
const CHARACTER_WIDTH = 0.5;
/** Down to 16: a golden politician with four keywords and three casseroles still fits, and nothing is cut. */
const SIZES = [42, 38, 34, 31, 28, 26, 24, 22, 20, 18, 16];

/** How many rows these lines take at this size, each line starting a new row. */
function rowsAt(lines: string[], size: number): number {
  const perRow = Math.max(1, Math.floor(BOX_WIDTH / (size * CHARACTER_WIDTH)));
  return lines.reduce((rows, line) => rows + Math.max(1, Math.ceil(line.replaceAll('**', '').length / perRow)), 0);
}

/**
 * The size of a card's rules, in card units: the largest that lets every line fit in the box.
 * Each line starts a new row, so many short lines shrink the text as much as one long one.
 */
export function fittedRulesSize(lines: string[]): number {
  const fits = (size: number) => rowsAt(lines, size) * size * LINE_HEIGHT + GAP * Math.max(0, lines.length - 1) <= BOX_HEIGHT;
  return SIZES.find(fits) ?? SIZES[SIZES.length - 1];
}
