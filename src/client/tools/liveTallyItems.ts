import { LIVE_TALLY_LABELS } from '#src/client/const/liveTallyLabels.ts';
import type { LiveCount } from '#src/protocol/liveCount.ts';

export interface LiveTallyItem {
  value: number;
  label: string;
}

/**
 * What the home page's « en direct » shows, once the server answered: the games in progress, one per player (online,
 * solo, career, tutorial), and the players online (those of the last hour), never fewer than one: whoever reads it is
 * online, even before the server counted them.
 */
export function liveTallyItems(count: LiveCount | null): LiveTallyItem[] {
  if (!count) return [];
  const items = [
    { value: count.parties, words: LIVE_TALLY_LABELS.games },
    { value: Math.max(count.joueurs, 1), words: LIVE_TALLY_LABELS.players },
  ];
  return items.map(({ value, words }) => ({ value, label: value > 1 ? words.many : words.one }));
}
