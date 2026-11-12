import type { LiveSignal } from '../protocol/counterEvent.ts';
import { PLAYING_BEAT_MS, PRESENCE_MS } from '../protocol/liveCount.ts';

/** Never more marks than this in memory, whatever comes: far above a crowded evening. */
const MAX_MARKS = 50_000;

/** What a restart keeps: the times of the last hour, of the presences and of the games launched, nothing else. */
export interface SavedPresence {
  presences: number[];
  /** One mark per human player of a room, when its game starts. */
  lanceesEnLigne: number[];
  /** One mark per game started in a page: solo, career, tutorial. */
  lanceesLocales: number[];
}

/** Where a game was launched: in a room online, or in a page against bots. */
export type LaunchPlace = 'en_ligne' | 'locale';

/** The marks after `from`: the marks come in order, the old ones are at the start. */
function marksSince(marks: number[], from: number): number[] {
  const first = marks.findIndex((at) => at > from);
  if (first === 0) return marks;
  return first < 0 ? [] : marks.slice(first);
}

/**
 * The life on the game, from the counter's signals and the rooms, without any id. A game running in a page beats once
 * a minute, so the beats of the last minute count the games running there; a browser says it is there once an hour,
 * so the presences of the last hour count the players; each game launched leaves a mark, one per human player, so the
 * marks of the last hour count the games launched. Times only, in memory; the server keeps those of the last hour
 * over a restart.
 */
export class LivePresence {
  private beats: number[] = [];
  private presences: number[];
  private launches: Record<LaunchPlace, number[]>;

  /** The last hour kept over a restart: a deploy forgets neither who came nor what was played. */
  constructor(saved: Partial<SavedPresence> = {}) {
    this.presences = saved.presences ?? [];
    this.launches = { en_ligne: saved.lanceesEnLigne ?? [], locale: saved.lanceesLocales ?? [] };
  }

  saved(now = Date.now()): SavedPresence {
    return {
      presences: [...this.recentPresences(now)],
      lanceesEnLigne: [...this.recentLaunches('en_ligne', now)],
      lanceesLocales: [...this.recentLaunches('locale', now)],
    };
  }

  record(signal: LiveSignal, now = Date.now()): void {
    if (signal.type === 'en_jeu') this.beats = this.withMarks(marksSince(this.beats, now - PLAYING_BEAT_MS), now, 1);
    else this.presences = this.withMarks(this.recentPresences(now), now, 1);
  }

  /** A game launched: once for a game in a page, once per human player for a room. */
  launched(place: LaunchPlace, players: number, now = Date.now()): void {
    this.launches[place] = this.withMarks(this.recentLaunches(place, now), now, players);
  }

  /** The games running in a page right now. */
  localGames(now = Date.now()): number {
    this.beats = marksSince(this.beats, now - PLAYING_BEAT_MS);
    return this.beats.length;
  }

  /** The browsers that came on the game in the last hour. */
  players(now = Date.now()): number {
    return this.recentPresences(now).length;
  }

  /** The games launched in the last hour, there: one per human player. */
  launchedGames(place: LaunchPlace, now = Date.now()): number {
    return this.recentLaunches(place, now).length;
  }

  private recentPresences(now: number): number[] {
    this.presences = marksSince(this.presences, now - PRESENCE_MS);
    return this.presences;
  }

  private recentLaunches(place: LaunchPlace, now: number): number[] {
    this.launches[place] = marksSince(this.launches[place], now - PRESENCE_MS);
    return this.launches[place];
  }

  private withMarks(marks: number[], now: number, count: number): number[] {
    for (let i = 0; i < count && marks.length < MAX_MARKS; i++) marks.push(now);
    return marks;
  }
}
