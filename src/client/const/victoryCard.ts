/** Where the game lives, as a shared image and a post write it. */
export const SITE_URL = 'https://casserolade.fr';
export const SITE_NAME = 'casserolade.fr';

/**
 * The victory card, the picture a winner shares: its size (the wide format posts and chats show whole), and where
 * each thing sits, in its own pixels.
 */
export const VICTORY_CARD = {
  width: 1200,
  height: 630,
  /** The winner's hero, in a ring, at the top left. */
  hero: { x: 132, y: 124, radius: 84 },
  /** The words beside it: the headline, who won with whom, the round and the polls. */
  words: { x: 244, headline: 112, byline: 162, facts: 198 },
  logo: { right: 36, top: 24, height: 132 },
  /** The board, one medallion per politician, centred: each oval, and the gap from one to the next. */
  board: { y: 388, ovalWidth: 132, ovalHeight: 158, step: 160, ring: 7, name: 496 },
  /** The attack and the polls of each politician, at the foot of its oval. */
  stat: { radius: 27, dx: 46, dy: 62 },
  footer: { y: 596, margin: 40 },
} as const;
