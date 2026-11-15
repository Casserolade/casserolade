import { fillTickerLine } from '#src/client/tools/fillTickerLine.ts';
import { shuffled } from '#src/client/tools/shuffled.ts';

/**
 * What a channel's ticker scrolls on one visit of its set: `count` of its lines, drawn and ordered by `roll` (a number
 * in [0, 1) per call), each with its slots filled. Another visit draws other lines, other towns, another order.
 */
export function tickerVisit(lines: readonly string[], words: Record<string, readonly string[]>, count: number, roll: () => number): string[] {
  const drawn = shuffled(lines, lines.map(() => roll())).slice(0, count);
  return drawn.map((line) => fillTickerLine(line, words, roll));
}
