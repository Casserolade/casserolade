import type { DiscordCount, LiveCount } from '#src/protocol/liveCount.ts';

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function readDiscord(value: unknown): DiscordCount | null {
  if (!value || typeof value !== 'object') return null;
  const { membres, connectes } = value as Record<string, unknown>;
  return isCount(membres) && isCount(connectes) ? { membres, connectes } : null;
}

/** The server's answer to GET /en-direct, checked: null when it is not what the home page expects. */
export function readLiveCount(data: unknown): LiveCount | null {
  if (!data || typeof data !== 'object') return null;
  const { parties, enLigne, joueurs, discord } = data as Record<string, unknown>;
  if (!isCount(parties) || !isCount(enLigne) || !isCount(joueurs)) return null;
  return { parties, enLigne, joueurs, discord: readDiscord(discord) };
}
