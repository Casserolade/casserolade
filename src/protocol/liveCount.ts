/**
 * What the home page shows of the life on the server (GET /en-direct): the games in progress, online and in the pages,
 * the players of the last hour, and the community's Discord. Totals only, like the counter: no id, no address.
 */
export const LIVE_COUNT_PATH = '/en-direct';
/** A game in a page (solo, career, tutorial) says it is still running this often, while its page is in view. */
export const PLAYING_BEAT_MS = 60_000;
/** A browser on the game says it is there at most this often: the players of the last hour are counted on it. */
export const PRESENCE_MS = 3_600_000;

export interface DiscordCount {
  membres: number;
  /** Members connected to Discord right now. */
  connectes: number;
}

export interface LiveCount {
  /** Every table: the online rooms, playing or waiting for their players, and the games in a page against bots. */
  parties: number;
  /** Of which online rooms. */
  enLigne: number;
  /** The players online: the browsers that came on the game in the last hour. */
  joueurs: number;
  /** The members of the community's Discord server; null until Discord answered. */
  discord: DiscordCount | null;
}
