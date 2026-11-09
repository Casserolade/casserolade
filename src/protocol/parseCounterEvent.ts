import { HEROES } from '../data/heroes.ts';
import { CHAPITRES_COMPTES } from '../histoire/carrieres.ts';
import { BOT_LEVELS, DEVICES, HOST_NAME, MAX_COUNTER_BYTES, PAGE_KINDS } from './counterEvent.ts';
import type { CounterEvent, GameResult, GameSettings } from './counterEvent.ts';

/** The generic elections and every career's chapters (`durif.bugarach`). */
const CHAPTER_IDS: ReadonlySet<string> = new Set(CHAPITRES_COMPTES.map((chapter) => chapter.id));
/** The heroes a human can play: bosses only sit at the bots' seats. */
const HERO_IDS: ReadonlySet<string> = new Set(HEROES.map((hero) => hero.id));
/** A version as players see it: 0.2c. */
const GAME_VERSION = /^\d{1,2}\.\d{1,2}[a-z]?$/;
const MAX_PLACE = 8;
const MAX_ROUNDS = 60;

function isOneOf<T>(list: readonly T[], value: unknown): value is T {
  return list.includes(value as T);
}

function isWholeNumber(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function parseSettings(raw: Record<string, unknown>): GameSettings | null {
  if (raw.mode === 'solo') return isOneOf(BOT_LEVELS, raw.niveau) ? { mode: 'solo', niveau: raw.niveau } : null;
  if (raw.mode === 'carriere') return typeof raw.chapitre === 'string' && CHAPTER_IDS.has(raw.chapitre) ? { mode: 'carriere', chapitre: raw.chapitre } : null;
  return raw.mode === 'tutoriel' ? { mode: 'tutoriel' } : null;
}

function parseResult(raw: Record<string, unknown>): GameResult | null {
  if (!isWholeNumber(raw.place, 1, MAX_PLACE) || !isWholeNumber(raw.manches, 1, MAX_ROUNDS)) return null;
  if (typeof raw.heros !== 'string' || !HERO_IDS.has(raw.heros)) return null;
  if (typeof raw.gagnee !== 'boolean' || typeof raw.version !== 'string' || !GAME_VERSION.test(raw.version)) return null;
  return { place: raw.place, manches: raw.manches, heros: raw.heros, gagnee: raw.gagnee, version: raw.version };
}

function parsePage(raw: Record<string, unknown>): CounterEvent | null {
  if (!isOneOf(PAGE_KINDS, raw.page) || !isOneOf(DEVICES, raw.appareil)) return null;
  if (typeof raw.nouveau !== 'boolean' || typeof raw.premier !== 'boolean') return null;
  if (typeof raw.source !== 'string' || (raw.source !== '' && !HOST_NAME.test(raw.source))) return null;
  return { type: 'page', page: raw.page, appareil: raw.appareil, nouveau: raw.nouveau, premier: raw.premier, source: raw.source };
}

/**
 * The counter's input, checked field by field: anything unknown, missing or out of bounds and the whole event is
 * refused. What it lets through can only add one to a known total.
 */
export function parseCounterEvent(text: string): CounterEvent | null {
  if (text.length > MAX_COUNTER_BYTES) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const fields = raw as Record<string, unknown>;
  if (fields.type === 'page') return parsePage(fields);
  if (fields.type !== 'partie' && fields.type !== 'fin') return null;
  const settings = parseSettings(fields);
  if (!settings) return null;
  if (fields.type === 'partie') return { type: 'partie', ...settings };
  const result = parseResult(fields);
  return result ? { type: 'fin', ...settings, ...result } : null;
}
