export interface VisitMemory {
  /** The day this browser was first counted, if it ever was. */
  firstVisit: string | null;
  /** The last day it was counted. */
  lastDay: string | null;
  /** It holds traces of the game from before the counter: it came already. */
  cameBefore: boolean;
}

/** What a page tells the counter about its visitor: never seen before, and first page of the day. */
export function visitFlags(memory: VisitMemory, today: string): { nouveau: boolean; premier: boolean } {
  return { nouveau: memory.firstVisit === null && !memory.cameBefore, premier: memory.lastDay !== today };
}
