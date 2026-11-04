/** The shop counter, in table units (--s): a medallion, a card and its margin, the gap, the room inside. */
const MEDALLION = 150;
const CARD = 140;
const CARD_MARGIN = 10;
const GAP = 30;
const ROOM = 1228;

/**
 * How much the shop's items shrink to stay on one line: 1 until the counter is full. At tier 6, six
 * politicians, a spell and a casserole ran off the counter and under the host's desk.
 */
export function shopFit(minions: number, cards: number): number {
  const items = minions + cards;
  if (items === 0) return 1;
  const natural = minions * MEDALLION + cards * (CARD + CARD_MARGIN) + (items - 1) * GAP;
  return Math.min(1, ROOM / natural);
}
