import { phraseFor } from '#src/data/phrases.ts';
import type { Moment } from '#src/data/phrases.ts';
import type { Minion } from '#src/engine/types.ts';

/** A quip is one short line over a medallion: a longer quote waits for the combat. */
const MAX_QUIP = 90;

export interface BoardQuip {
  uid: number;
  line: string;
}

/** A real line for this politician at this moment, short enough for a bubble; `turn` varies it. */
function quip(cardId: string, moment: Moment, turn: number): string | null {
  const lines = [0, 1, 2].map((offset) => phraseFor(cardId, moment, turn + offset)).filter((line): line is string => Boolean(line && line.length <= MAX_QUIP));
  return lines[0] ?? null;
}

/**
 * What the board says after a change: the politician just laid down makes its entrance, the one who
 * just got a casserole denies it. Only verified quotes, word for word; without one, nothing is said.
 */
export function boardQuip(before: Pick<Minion, 'uid' | 'casseroles'>[], after: Pick<Minion, 'uid' | 'cardId' | 'casseroles' | 'token'>[]): BoardQuip | null {
  const known = new Map(before.map((m) => [m.uid, m.casseroles.length]));
  for (const minion of after) {
    if (minion.token) continue;
    const had = known.get(minion.uid);
    const moment: Moment | null = had === undefined ? 'pose' : minion.casseroles.length > had ? 'casserole' : null;
    if (!moment) continue;
    const line = quip(minion.cardId, moment, minion.uid);
    if (line) return { uid: minion.uid, line };
  }
  return null;
}
