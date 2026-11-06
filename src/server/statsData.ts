import { DEVICES, LOCAL_MODES, PAGE_KINDS } from '../protocol/counterEvent.ts';
import type { Device, LocalMode, PageKind } from '../protocol/counterEvent.ts';

/** Games of one kind: started, played to the end, and won (first place, the election's goal, every step seen). */
export interface GameCount {
  lancees: number;
  finies: number;
  gagnees: number;
}

/**
 * One day of the site, Paris time. Only totals: no address, no id. Visitors are counted by the page itself, once a
 * day per browser, so a restart of the server recounts nobody; robots that run the page are counted apart.
 */
export interface DayStats {
  jour: string;
  /** Browsers that opened a page of the site this day. */
  visiteurs: number;
  /** Among them, browsers that had never opened it. */
  nouveaux: number;
  /** The day's visitors by device. */
  appareils: Record<Device, number>;
  /** Where the day's visitors came from: a site's host name, or « direct ». */
  sources: Record<string, number>;
  /** Pages opened, each load counted. */
  pages: Record<PageKind, number>;
  /** The games played in the page, against bots. */
  local: Record<LocalMode, GameCount>;
  /** Robots (search engines, page checkers) that ran a page: counted, and nothing else. */
  robots: number;
  /** Online games, started on the server. */
  parties: number;
  partiesPubliques: number;
  /** Humans seated in these games. */
  joueurs: number;
  salonsCrees: number;
  picConnexions: number;
  incidents: number;
  /** The first measure, kept apart: it counted the server's own health check, and recounted after each restart. */
  ancienneMesure?: { visites: number; visiteurs: number };
}

export interface StatsIncident {
  at: string;
  kind: string;
  code: string;
  round: number;
  message: string;
}

/** The finished solo games of one hero: the sum of the places gives the average. */
export interface HeroResults {
  parties: number;
  places: number;
  victoires: number;
  top4: number;
}

/** Totals since the start, for what one day is too small to tell. */
export interface RunningTotals {
  /** Career elections, by chapter. */
  chapitres: Record<string, GameCount>;
  /** Solo games by bots' level, with the sum of the places of the finished ones. */
  niveaux: Record<string, GameCount & { places: number }>;
  /** Finished solo games, by version of the game, then by hero. */
  heros: Record<string, Record<string, HeroResults>>;
}

/** What the statistics file holds. Format 2 since the counter of 6 November 2026; format 1 had no number. */
export interface StatsData {
  days: DayStats[];
  incidents: StatsIncident[];
  cumul: RunningTotals;
}

export const STATS_FORMAT = 2;

function zeroes<K extends string, V>(keys: readonly K[], make: () => V): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, make()])) as Record<K, V>;
}

export function emptyGameCount(): GameCount {
  return { lancees: 0, finies: 0, gagnees: 0 };
}

export function emptyDay(jour: string): DayStats {
  return {
    jour,
    visiteurs: 0,
    nouveaux: 0,
    appareils: zeroes(DEVICES, () => 0),
    sources: {},
    pages: zeroes(PAGE_KINDS, () => 0),
    local: zeroes(LOCAL_MODES, emptyGameCount),
    robots: 0,
    parties: 0,
    partiesPubliques: 0,
    joueurs: 0,
    salonsCrees: 0,
    picConnexions: 0,
    incidents: 0,
  };
}

export function emptyRunningTotals(): RunningTotals {
  return { chapitres: {}, niveaux: {}, heros: {} };
}
