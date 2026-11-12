import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CountedEvent, GameEndEvent, GameStartEvent, PageEvent } from '../protocol/counterEvent.ts';
import { parisDay, parisHour } from './parisDay.ts';
import { readStatsData } from './readStatsData.ts';
import { emptyDay, emptyGameCount, STATS_FORMAT } from './statsData.ts';
import type { DayStats, HeroResults, OnlineResults, RunningTotals, StatsIncident } from './statsData.ts';
import type { ArchivedGame } from './gameArchive.ts';
import { sumDays } from './sumDays.ts';
import type { DayTotals } from './sumDays.ts';

export type { DayStats, StatsIncident } from './statsData.ts';

export interface LiveStats {
  connexions: number;
  adresses: number;
  salons: number;
  enJeu: number;
  enFile: number;
  /** Games played in a page against bots, running right now (livePresence.ts). */
  locales: number;
  /** Browsers that came on the game in the last hour. */
  presents: number;
}

export interface StatsSnapshot {
  generatedAt: string;
  startedAt: string;
  version: string | null;
  memoryMb: number;
  live: LiveStats;
  days: DayStats[];
  /** The whole history, summed. */
  totaux: DayTotals;
  cumul: RunningTotals;
  incidents: StatsIncident[];
}

/** Two years of days, the last twenty incidents. */
const KEEP_DAYS = 731;
const KEEP_INCIDENTS = 20;
/** Past this many sources in a day, the others share one line: a stream of made-up names cannot fill the file. */
const MAX_SOURCES = 40;
const OTHER_SOURCES = 'autres';
const DIRECT = 'direct';
const TOP_PLACES = 4;
/** A camp counts from this many politicians of it on the last board, as in the simulations. */
const CAMP_FROM = 3;
/** Written to disk at most once a minute. */
const FLUSH_MS = 60_000;

export interface SiteStatsOptions {
  /** The JSON file of the days, on the private volume. Without it, everything is forgotten on restart. */
  file: string | null;
  now?: () => Date;
}

/**
 * The site's attendance, day by day (Paris time), and the games played. Only totals: visits come counted by the
 * page itself (POST /compteur), without any id, and no address is ever kept.
 */
export class SiteStats {
  private readonly options: SiteStatsOptions;
  private readonly now: () => Date;
  private days: DayStats[] = [];
  private incidents: StatsIncident[] = [];
  private cumul: RunningTotals;
  private dirty = false;
  private lastFlush = 0;
  readonly startedAt: Date;

  constructor(options: SiteStatsOptions) {
    this.options = options;
    this.now = options.now ?? (() => new Date());
    this.startedAt = this.now();
    const saved = readStatsData(options.file && existsSync(options.file) ? readFileSync(options.file, 'utf8') : '{}');
    this.days = saved.days.slice(-KEEP_DAYS);
    this.incidents = saved.incidents;
    this.cumul = saved.cumul;
  }

  /** An event of a page: a page opened, a game in the page started or finished. */
  record(event: CountedEvent): void {
    if (event.type === 'page') this.page(event);
    else if (event.type === 'partie') this.gameStarted(event);
    else this.gameEnded(event);
    this.dirty = true;
  }

  /** A robot that ran a page: counted, nothing more. */
  robot(): void {
    this.today().robots++;
    this.dirty = true;
  }

  partie(publique: boolean, humains: number): void {
    const day = this.today();
    day.parties++;
    if (publique) day.partiesPubliques++;
    day.joueurs += humains;
    day.heures.parties[this.hour()]++;
    this.dirty = true;
  }

  /** An online game played to the end: the day's count, and its seats in the results of its version. */
  partieFinie(game: ArchivedGame): void {
    const day = this.today();
    day.partiesFinies++;
    day.manchesFinies += game.manches;
    day.dureeFiniesMs += game.dureeMs;
    const results = (this.cumul.enLigne[game.version] ??= { heros: {}, camps: {}, sieges: {} } satisfies OnlineResults);
    for (const seat of game.joueurs) {
      addPlace(results.sieges, seat.niveau ?? 'humain', seat.place);
      if (seat.niveau || seat.repris) continue;
      addPlace(results.heros, seat.heros, seat.place);
      if (seat.camp && seat.campCount >= CAMP_FROM) addPlace(results.camps, seat.camp, seat.place);
    }
    this.dirty = true;
  }

  partieAbandonnee(): void {
    this.today().partiesAbandonnees++;
    this.dirty = true;
  }

  reprise(): void {
    this.today().reprises++;
    this.dirty = true;
  }

  salonCree(): void {
    this.today().salonsCrees++;
    this.dirty = true;
  }

  connexions(count: number): void {
    const day = this.today();
    if (count <= day.picConnexions) return;
    day.picConnexions = count;
    this.dirty = true;
  }

  incident(kind: string, code: string, round: number, message: string): void {
    this.today().incidents++;
    this.incidents = [{ at: this.now().toISOString(), kind, code, round, message }, ...this.incidents].slice(0, KEEP_INCIDENTS);
    this.dirty = true;
  }

  snapshot(live: LiveStats, version: string | null): StatsSnapshot {
    this.today();
    return {
      generatedAt: this.now().toISOString(),
      startedAt: this.startedAt.toISOString(),
      version,
      memoryMb: Math.round(process.memoryUsage().rss / 1_048_576),
      live,
      days: structuredClone(this.days),
      totaux: sumDays(this.days),
      cumul: structuredClone(this.cumul),
      incidents: this.incidents.map((incident) => ({ ...incident })),
    };
  }

  /** Writes the file if it changed: on stopping, and at most once a minute otherwise. */
  flush(force = true): void {
    const at = this.now().getTime();
    if (!this.dirty || !this.options.file || (!force && at - this.lastFlush < FLUSH_MS)) return;
    try {
      mkdirSync(dirname(this.options.file), { recursive: true });
      writeFileSync(this.options.file, JSON.stringify({ format: STATS_FORMAT, days: this.days, incidents: this.incidents, cumul: this.cumul }));
      this.dirty = false;
      this.lastFlush = at;
    } catch {
      // The disk refuses: the counts stay in memory, the next flush tries again.
    }
  }

  private page(event: PageEvent): void {
    const day = this.today();
    day.pages[event.page]++;
    if (!event.premier) return;
    day.visiteurs++;
    day.heures.visiteurs[this.hour()]++;
    if (event.nouveau) day.nouveaux++;
    day.appareils[event.appareil]++;
    const source = event.source || DIRECT;
    const known = Object.hasOwn(day.sources, source) || Object.keys(day.sources).length < MAX_SOURCES;
    const key = known ? source : OTHER_SOURCES;
    day.sources[key] = (day.sources[key] ?? 0) + 1;
  }

  private gameStarted(event: GameStartEvent): void {
    const day = this.today();
    day.local[event.mode].lancees++;
    day.heures.parties[this.hour()]++;
    if (event.mode === 'solo') this.levelCount(event.niveau).lancees++;
    if (event.mode === 'carriere') this.chapterCount(event.chapitre).lancees++;
  }

  private gameEnded(event: GameEndEvent): void {
    const count = this.today().local[event.mode];
    count.finies++;
    if (event.gagnee) count.gagnees++;
    if (event.mode === 'carriere') {
      const chapter = this.chapterCount(event.chapitre);
      chapter.finies++;
      if (event.gagnee) chapter.gagnees++;
    }
    if (event.mode !== 'solo') return;
    const level = this.levelCount(event.niveau);
    level.finies++;
    level.places += event.place;
    if (event.gagnee) level.gagnees++;
    addPlace((this.cumul.heros[event.version] ??= {}), event.heros, event.place);
  }

  private hour(): number {
    return parisHour(this.now());
  }

  private levelCount(level: string): RunningTotals['niveaux'][string] {
    return (this.cumul.niveaux[level] ??= { ...emptyGameCount(), places: 0 });
  }

  private chapterCount(chapter: string): RunningTotals['chapitres'][string] {
    return (this.cumul.chapitres[chapter] ??= emptyGameCount());
  }

  private today(): DayStats {
    const jour = parisDay(this.now());
    const last = this.days.at(-1);
    if (last?.jour === jour) return last;
    const day = emptyDay(jour);
    this.days = [...this.days, day].slice(-KEEP_DAYS);
    return day;
  }
}

/** One more finished game for a hero, a camp or a kind of seat, at this place. */
function addPlace(table: Record<string, HeroResults>, key: string, place: number): void {
  const results = (table[key] ??= { parties: 0, places: 0, victoires: 0, top4: 0 });
  results.parties++;
  results.places += place;
  if (place === 1) results.victoires++;
  if (place <= TOP_PLACES) results.top4++;
}
