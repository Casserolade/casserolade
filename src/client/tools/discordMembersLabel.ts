import type { DiscordCount } from '#src/protocol/liveCount.ts';

/** Below this, the members of the Discord are not shown: a handful would rather put people off. */
const MIN_MEMBERS_SHOWN = 15;

/** « 42 membres, dont 9 connectés », once the Discord server has enough members to say it. */
export function discordMembersLabel(discord: DiscordCount | null): string | null {
  if (!discord || discord.membres < MIN_MEMBERS_SHOWN) return null;
  const connected = discord.connectes > 0 ? `, dont ${discord.connectes} ${discord.connectes > 1 ? 'connectés' : 'connecté'}` : '';
  return `${discord.membres} membres${connected}`;
}
