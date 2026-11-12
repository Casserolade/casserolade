/**
 * What the home page shows of the life on the server (GET /en-direct): the games in progress, online and in the pages,
 * the players of the last hour, the community's Discord, and whether the game's Twitch channel is live. Totals only,
 * like the counter: no id, no address.
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
  /** The games in progress, one per player: online, in a room, and in a page against bots (solo, career, tutorial). */
  parties: number;
  /** Of which online. */
  enLigne: number;
  /** The players online: the browsers that came on the game in the last hour. */
  joueurs: number;
  /** The members of the community's Discord server; null until Discord answered. */
  discord: DiscordCount | null;
  /** The game's Twitch channel is live right now, as Twitch says: the home page shows its link only then. */
  twitch: boolean;
}
