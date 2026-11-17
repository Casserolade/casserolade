import { PROFILE_SAVE_KEYS } from '#src/client/const/profileSaveKeys.ts';

/** A player's profile, as a file: what the browser kept under each of the profile's keys. */
export interface ProfileSave {
  game: 'casserolade';
  format: 1;
  entries: Record<string, string>;
}

/** The profile save of a browser, from what it keeps (`read`: the value under a key, null when there is none). */
export function buildProfileSave(read: (key: string) => string | null): ProfileSave {
  const entries: Record<string, string> = {};
  for (const key of PROFILE_SAVE_KEYS) {
    const value = read(key);
    if (value !== null) entries[key] = value;
  }
  return { game: 'casserolade', format: 1, entries };
}
