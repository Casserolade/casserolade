import { PRESENCE_MS } from '../protocol/liveCount.ts';
import type { SavedPresence } from './livePresence.ts';

/** Times only, those of the last hour, in order: anything else is dropped. */
function recentMarks(value: unknown, now: number): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((at): at is number => Number.isFinite(at) && at > now - PRESENCE_MS && at <= now).sort((a, b) => a - b);
}

/**
 * The last hour kept over a restart: the presences and the games launched. A plain list is the older file, which
 * kept only the presences.
 */
export function readSavedPresence(text: string, now: number): SavedPresence {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (Array.isArray(data)) return { presences: recentMarks(data, now), lanceesEnLigne: [], lanceesLocales: [] };
  const saved = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    presences: recentMarks(saved.presences, now),
    lanceesEnLigne: recentMarks(saved.lanceesEnLigne, now),
    lanceesLocales: recentMarks(saved.lanceesLocales, now),
  };
}
