import { PRESENCE_MS } from '../protocol/liveCount.ts';

/** The presences kept over a restart: times only, those of the last hour, in order. Anything else is dropped. */
export function readPresenceMarks(text: string, now: number): number[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.filter((at): at is number => Number.isFinite(at) && at > now - PRESENCE_MS && at <= now).sort((a, b) => a - b);
}
