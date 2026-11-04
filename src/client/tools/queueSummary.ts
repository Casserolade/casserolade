import type { VueFile } from '#src/protocol/messages.ts';

export const TABLE_SEATS = 8;

export interface QueueSummary {
  /** Players at the table who voted « Lancer avec des bots ». */
  yes: number;
  /** Yes votes that start the game now. */
  needed: number;
  /** Seats a bot would take if the vote passed. */
  empty: number;
}

/** What the vote stands at, for the queue screen. */
export function queueSummary(file: VueFile, seats = TABLE_SEATS): QueueSummary {
  return {
    yes: file.groupe.filter((seat) => seat.vote).length,
    needed: file.majorite,
    empty: Math.max(0, seats - file.groupe.length),
  };
}

/** The time waited goes on between two views of the queue: the server sends one every few seconds. */
export function waitedMs(file: VueFile, seenAt: number, now: number): number {
  return file.attente_ms + Math.max(0, now - seenAt);
}

/** « 0:42 », « 12:05 ». */
export function formatWait(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
