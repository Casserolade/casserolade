import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { PlayerView } from '#src/engine/game.ts';
import type { VueSalon } from '#src/protocol/messages.ts';

/** Who sits at a seat, as the table names it: the hero, and in an online room, the player's pseudo or « Bot ». */
export interface SeatName {
  /** The hero's name; « … » before the hero is chosen. */
  hero: string;
  /** Online only: the pseudo of a human, null for a bot or a game in this page. */
  pseudo: string | null;
  /** Online only: a bot holds this seat (one from the start, or one that took a leaver's place). */
  bot: boolean;
}

/**
 * Every seat of the table, named. During an online game, the room tells the pseudos by the game's seats; once it is
 * over, its seats are those of the waiting room again (the ranking carries the pseudos then).
 */
export function seatNames(table: PlayerView['table'], room: Pick<VueSalon, 'joueurs' | 'etat'> | null): Map<number, SeatName> {
  const players = room?.etat === 'en_jeu' ? room.joueurs : [];
  return new Map(table.map((row) => {
    const player = players.find((entry) => entry.siege === row.seat);
    const hero = row.heroId ? (HERO_BY_ID[row.heroId]?.name ?? '…') : '…';
    return [row.seat, { hero, pseudo: player && !player.bot ? player.pseudo : null, bot: player?.bot ?? false }];
  }));
}

/** One line for a seat: « Léa · François Ruffin » online, the hero alone otherwise. */
export function seatLabel(name: SeatName | undefined): string {
  if (!name) return '…';
  return name.pseudo ? `${name.pseudo} · ${name.hero}` : name.hero;
}
