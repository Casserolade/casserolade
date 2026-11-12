import type { DiscordCount, LiveCount } from '../protocol/liveCount.ts';
import type { LiveStats } from './siteStats.ts';

/**
 * What the home page shows, from the server's measures: every table, online rooms (playing or waiting for their
 * players) and games in the pages (solo, career, tutorial), and the players online, those of the last hour, never
 * fewer than those connected right now (a browser that is not counted still plays).
 */
export function buildLiveCount(live: LiveStats, onlineTables: number, discord: DiscordCount | null): LiveCount {
  return {
    parties: onlineTables + live.locales,
    enLigne: onlineTables,
    joueurs: Math.max(live.presents, live.connexions + live.locales),
    discord,
  };
}
