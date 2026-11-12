import type { DiscordCount, LiveCount } from '../protocol/liveCount.ts';
import type { LiveStats } from './siteStats.ts';

/**
 * What the home page shows, from the server's measures: the games launched in the last hour, one per player, online
 * (each human of a room) and in the pages (solo, career, tutorial), never fewer than those running right now; and the
 * players online, those of the last hour, never fewer than those connected right now (a browser that is not counted
 * still plays). Then what is said outside: the Discord's members, and whether the Twitch channel is live.
 */
export function buildLiveCount(live: LiveStats, onlineGames: number, discord: DiscordCount | null, twitch: boolean): LiveCount {
  return {
    parties: Math.max(live.lanceesEnLigne + live.lanceesLocales, onlineGames + live.locales),
    enLigne: Math.max(live.lanceesEnLigne, onlineGames),
    joueurs: Math.max(live.presents, live.connexions + live.locales),
    discord,
    twitch,
  };
}
