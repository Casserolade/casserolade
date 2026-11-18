import type { SeatName } from '#src/client/tools/seatNames.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { PlayerView } from '#src/engine/game.ts';
import type { Fight } from '#src/engine/state.ts';

/** What the table knows of one of its players, as its sheet shows it: on hover on a computer, at a touch on a phone. */
export interface OpponentAbout {
  /** The hero's name; « Vous » for the reader in a game of this page. */
  name: string;
  /** Who plays this hero, online: « Vous », a pseudo or « Bot ». */
  player: string | null;
  power: { name: string; desc: string } | null;
  tier: number;
  hp: number;
  startHp: number;
  triples: number;
  alive: boolean;
  /** Its board the last time this reader faced it, with the round of that combat; null when never met. */
  seen: PlayerView['seen'][number] | null;
  /** Its last combats, the most recent first. */
  fights: Fight[];
  isOwn: boolean;
  /** Met at the coming combat: this seat, or its ghost. */
  next: boolean;
}

/** The table as one reader sees it: its own seat, the names, the boards it met, and who comes next. */
export interface ReaderTable {
  seat: number;
  startHp: number;
  names: Map<number, SeatName>;
  seen: PlayerView['seen'];
  nextSeat: number | null;
}

/** Everything the sheet of a player of the table says, from its public row and what this reader met. */
export function opponentAbout(row: PlayerView['table'][number], { seat, startHp, names, seen, nextSeat }: ReaderTable): OpponentAbout {
  const seatName = names.get(row.seat);
  const hero = row.heroId ? HERO_BY_ID[row.heroId] : null;
  const isOwn = row.seat === seat;
  const player = isOwn ? (seatName?.pseudo ? 'Vous' : null) : (seatName?.pseudo ?? (seatName?.bot ? 'Bot' : null));
  return {
    name: isOwn && !player ? 'Vous' : (seatName?.hero ?? hero?.name ?? '…'),
    player,
    power: hero ? { name: hero.power, desc: hero.desc } : null,
    tier: row.tier,
    hp: row.hp,
    startHp,
    triples: row.triples,
    alive: row.alive,
    seen: seen.find((entry) => entry.seat === row.seat) ?? null,
    fights: row.fights,
    isOwn,
    next: row.seat === nextSeat,
  };
}
