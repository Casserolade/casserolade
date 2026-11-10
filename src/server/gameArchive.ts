import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BotLevel } from '../bots/bots.ts';
import { dominantCamp } from '../engine/dominantCamp.ts';
import { VERSION } from '../protocol/version.ts';
import { parisDay } from './parisDay.ts';
import type { RoomRecord } from './replayRoom.ts';
import type { GameRoom } from './room.ts';

/** The archive's format: an analysis reads only what it knows. */
export const ARCHIVE_FORMAT = 1;

/** One seat at the end of an online game, enough to weigh heroes, camps and bots without replaying it. */
export interface ArchivedSeat {
  siege: number;
  /** Null for a human; a bot's level otherwise. */
  niveau: BotLevel | null;
  /** A human whose seat a bot played for a while, after a disconnection: the result says less about the player. */
  repris: boolean;
  heros: string;
  place: number;
  /** The polls at the end: zero or less for the eliminated. */
  sondages: number;
  echelon: number;
  /** The last board's main camp (tokens aside), and how many of its politicians are from it. */
  camp: string | null;
  campCount: number;
  /** The last board, left to right: an eliminated player keeps the one that lost. */
  plateau: { carte: string; atk: number; pv: number; dore: boolean }[];
  casseroles: number;
  scandales: number;
  triples: number;
  sorts: number;
  /** The seat's accepted actions, by type (buy, sell, roll, level…): how it played, not only where it finished. */
  actions: Record<string, number>;
}

/**
 * An online game played to its end, as the server keeps it for balancing: its summary, and what replays it exactly
 * (seed, seats, options, log) with the engine of its commit. No pseudo, no address, no player id: human seats are
 * « Joueur 2 », bots keep their name.
 */
export interface ArchivedGame extends RoomRecord {
  format: typeof ARCHIVE_FORMAT;
  /** The game's version as players see it (0.3e), and the deployed commit, to replay it on the same engine. */
  version: string;
  commit: string | null;
  debut: string;
  fin: string;
  dureeMs: number;
  publique: boolean;
  /** Recruitment had a timer. */
  minuteur: boolean;
  contexte: string;
  camps: string[];
  manches: number;
  joueurs: ArchivedSeat[];
}

/** An online game that just ended, summed up for the archive. */
export function archiveGame(room: GameRoom, facts: { publique: boolean; commit: string | null; now: number }): ArchivedGame {
  const record = room.record();
  const { game } = room;
  const actions = game.players.map(() => ({}) as Record<string, number>);
  for (const entry of record.log) {
    if (entry.kind === 'action') actions[entry.seat][entry.action.t] = (actions[entry.seat][entry.action.t] ?? 0) + 1;
  }
  return {
    format: ARCHIVE_FORMAT,
    version: VERSION,
    commit: facts.commit,
    debut: new Date(room.startedAt).toISOString(),
    fin: new Date(facts.now).toISOString(),
    dureeMs: Math.max(0, facts.now - room.startedAt),
    publique: facts.publique,
    minuteur: room.timed,
    contexte: game.ctx.id,
    camps: [...game.camps],
    manches: game.round,
    ...record,
    seats: record.seats.map((seat, index) => (seat.level ? seat : { ...seat, pseudo: `Joueur ${index + 1}` })),
    joueurs: game.players.map((p) => {
      const main = dominantCamp(p.board);
      return {
        siege: p.seat,
        niveau: record.seats[p.seat].level,
        repris: room.takenOver.has(p.seat),
        heros: p.hero.id,
        place: p.place,
        sondages: p.hp,
        echelon: p.tier,
        camp: main.camp,
        campCount: main.count,
        plateau: p.board.map((m) => ({ carte: m.cardId, atk: m.atk, pv: m.hp, dore: m.golden })),
        casseroles: p.stats.casseroles,
        scandales: p.stats.scandals,
        triples: p.stats.triples,
        sorts: p.stats.spells,
        actions: actions[p.seat],
      };
    }),
  };
}

/**
 * Adds a game to the archive: one JSON line per game, one file per day (Paris time), 2026-11-10.jsonl, on the
 * server's private volume. Never served; tools/parties.sh brings the files home, src/sim/bilan_salons.ts reads them.
 */
export function appendToArchive(dir: string, game: ArchivedGame): void {
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, `${parisDay(new Date(game.fin))}.jsonl`), `${JSON.stringify(game)}\n`);
}
