import type { LiveSignal } from '../protocol/counterEvent.ts';
import { PLAYING_BEAT_MS, PRESENCE_MS } from '../protocol/liveCount.ts';

/** Never more marks than this in memory, whatever comes: far above a crowded evening. */
const MAX_MARKS = 50_000;

/** The marks after `from`: the marks come in order, the old ones are at the start. */
function marksSince(marks: number[], from: number): number[] {
  const first = marks.findIndex((at) => at > from);
  if (first === 0) return marks;
  return first < 0 ? [] : marks.slice(first);
}

/**
 * The games played in the pages and the players of the last hour, from the counter's signals, without any id: a
 * running game beats once a minute, so the beats of the last minute count the games; a browser says it is there once
 * an hour, so the presences of the last hour count the players. Times only, in memory; the presences are kept over a
 * restart by the server.
 */
export class LivePresence {
  private beats: number[] = [];
  private presences: number[];

  /** The presences of the last hour kept over a restart: a deploy does not forget who came. */
  constructor(presences: number[] = []) {
    this.presences = presences;
  }

  /** What a restart keeps: the times of the last hour's presences, nothing else. */
  savedPresences(now = Date.now()): number[] {
    this.presences = marksSince(this.presences, now - PRESENCE_MS);
    return [...this.presences];
  }

  record(signal: LiveSignal, now = Date.now()): void {
    if (signal.type === 'en_jeu') this.beats = this.withMark(marksSince(this.beats, now - PLAYING_BEAT_MS), now);
    else this.presences = this.withMark(marksSince(this.presences, now - PRESENCE_MS), now);
  }

  /** The games running in a page right now. */
  localGames(now = Date.now()): number {
    this.beats = marksSince(this.beats, now - PLAYING_BEAT_MS);
    return this.beats.length;
  }

  /** The browsers that came on the game in the last hour. */
  players(now = Date.now()): number {
    this.presences = marksSince(this.presences, now - PRESENCE_MS);
    return this.presences.length;
  }

  private withMark(marks: number[], now: number): number[] {
    if (marks.length < MAX_MARKS) marks.push(now);
    return marks;
  }
}
