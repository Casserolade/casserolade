import type { Moment } from '#src/data/phrases.ts';

/** Where the celebrant's words are drawn from: its celebrations, and all its other real quotes. */
export const CELEBRATION_MOMENTS: Moment[] = ['celebration', 'heros', 'pose', 'casserole', 'mort'];
/** Where the one who answers for the loser draws its words: its last words, and its other real quotes. */
export const ANSWER_MOMENTS: Moment[] = ['mort', 'defaite', 'casserole', 'pose'];
