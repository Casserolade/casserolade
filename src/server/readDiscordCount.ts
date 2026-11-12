import type { DiscordCount } from '../protocol/liveCount.ts';

/** The counts of a Discord invitation (GET /invites/<code>?with_counts=true), or null when they are missing. */
export function readDiscordCount(data: unknown): DiscordCount | null {
  if (!data || typeof data !== 'object') return null;
  const { approximate_member_count: membres, approximate_presence_count: connectes } = data as Record<string, unknown>;
  if (!Number.isInteger(membres) || !Number.isInteger(connectes)) return null;
  return { membres: membres as number, connectes: connectes as number };
}
