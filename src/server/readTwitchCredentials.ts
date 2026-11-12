/** The access of a Twitch application, from the developers' console: enough to ask Twitch whether a channel is live. */
export interface TwitchCredentials {
  clientId: string;
  clientSecret: string;
}

/** The credentials kept on the private volume, `{"clientId": "…", "clientSecret": "…"}`, or null when they are not. */
export function readTwitchCredentials(text: string): TwitchCredentials | null {
  try {
    const { clientId, clientSecret } = JSON.parse(text) as Record<string, unknown>;
    if (typeof clientId !== 'string' || typeof clientSecret !== 'string') return null;
    if (!clientId.trim() || !clientSecret.trim()) return null;
    return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
  } catch {
    return null;
  }
}
