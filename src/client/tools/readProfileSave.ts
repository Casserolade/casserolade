import { PLAYER_SAVE_KEY, PROFILE_SAVE_KEYS } from '#src/client/const/profileSaveKeys.ts';
import { isPlayerId } from '#src/protocol/parseClientMessage.ts';

/** No value of a profile is anywhere near this long: a longer one is not ours. */
const MAX_VALUE_LENGTH = 200_000;

/**
 * The entries of a profile save, from the text of its file: only the profile's own keys, each a text. Null when the
 * file is not a save of the game, or carries no player key.
 */
export function readProfileSave(text: string): Record<string, string> | null {
  let save: unknown;
  try {
    save = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof save !== 'object' || save === null) return null;
  const { game, entries } = save as { game?: unknown; entries?: unknown };
  if (game !== 'casserolade' || typeof entries !== 'object' || entries === null) return null;
  const kept: Record<string, string> = {};
  for (const key of PROFILE_SAVE_KEYS) {
    const value = (entries as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.length <= MAX_VALUE_LENGTH) kept[key] = value;
  }
  return isPlayerId(kept[PLAYER_SAVE_KEY]) ? kept : null;
}
