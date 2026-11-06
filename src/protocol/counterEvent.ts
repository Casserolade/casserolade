import type { BotLevel } from '../bots/bots.ts';

/**
 * What a page of the site tells the server's counter: a page opened, a game played in the page started or finished.
 * Names and numbers only, no id and no address: the server adds them to the day's totals and keeps nothing else.
 */
export const COUNTER_PATH = '/compteur';
export const MAX_COUNTER_BYTES = 512;
/** A source's host name: letters, digits and hyphens, in at least two labels. */
export const HOST_NAME = /^(?=.{3,80}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export const PAGE_KINDS = ['jeu', 'jeu_telephone', 'bestiaire', 'a_propos'] as const;
export type PageKind = (typeof PAGE_KINDS)[number];

export const DEVICES = ['telephone', 'tablette', 'ordinateur'] as const;
export type Device = (typeof DEVICES)[number];

/** The games played in the page, against bots: without the counter, the server never hears of them. */
export const LOCAL_MODES = ['solo', 'carriere', 'tutoriel'] as const;
export type LocalMode = (typeof LOCAL_MODES)[number];

export const BOT_LEVELS: readonly BotLevel[] = ['debutant', 'facile', 'moyen', 'difficile'];

export interface PageEvent {
  type: 'page';
  page: PageKind;
  appareil: Device;
  /** This browser never opened the site before. */
  nouveau: boolean;
  /** This browser's first page of the day, Paris time: the day's visitors are counted on it. */
  premier: boolean;
  /** The site the visit came from, by its host name; empty when it came straight. */
  source: string;
}

/** Solo games name their bots' level, career games their election; the tutorial has neither. */
export type GameSettings = { mode: 'solo'; niveau: BotLevel } | { mode: 'carriere'; chapitre: string } | { mode: 'tutoriel' };

export type GameStartEvent = { type: 'partie' } & GameSettings;

export interface GameResult {
  /** The human's final place, 1 to 8. */
  place: number;
  manches: number;
  heros: string;
  /** First in solo, the election's goal met in the career, every step seen in the tutorial. */
  gagnee: boolean;
  /** The version of the game, as players see it (0.2c): the heroes' results are kept version by version. */
  version: string;
}

export type GameEndEvent = { type: 'fin' } & GameSettings & GameResult;

export type CounterEvent = PageEvent | GameStartEvent | GameEndEvent;
