import type { DiscordCount, LiveCount } from '../protocol/liveCount.ts';
import type { LiveStats } from './siteStats.ts';

/**
 * What the home page shows, from the server's measures: the games in progress, one per player, online (in a room,
 * waiting or still in the running) and in the pages (solo, career, tutorial), and the players online, those of the
 * last hour, never fewer than those connected right now (a browser that is not counted still plays).
 */
export function buildLiveCount(live: LiveStats, onlineGames: number, discord: DiscordCount | null): LiveCount {
  return {
    parties: onlineGames + live.locales,
    enLigne: onlineGames,
    joueurs: Math.max(live.presents, live.connexions + live.locales),
    discord,
  };
}
