/** Whether Helix's answer to GET /streams?user_login=<channel> says the channel is live: an empty list when it is not. */
export function readTwitchLive(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const streams = (data as { data?: unknown }).data;
  return Array.isArray(streams) && streams.some((stream) => Boolean(stream) && (stream as { type?: unknown }).type === 'live');
}
