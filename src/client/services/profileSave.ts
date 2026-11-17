import { PROFILE_SAVE_KEYS } from '#src/client/const/profileSaveKeys.ts';
import { downloadFile } from '#src/client/services/downloadFile.ts';
import { browserStorage, playerId, read } from '#src/client/services/localProfile.ts';
import { buildProfileSave } from '#src/client/tools/buildProfileSave.ts';
import { readProfileSave } from '#src/client/tools/readProfileSave.ts';

const FILE_NAME = 'casserolade-sauvegarde.json';

/**
 * The player's profile, saved as a file: the key the server rates the player by, and what the browser keeps
 * (pseudo, achievements, career). The rank itself is not in it: the server holds it, and finds it by the key.
 */
export function downloadProfileSave(): void {
  // A browser that never played online has no key yet: the save gives it one, to keep.
  playerId();
  const storage = browserStorage();
  const save = buildProfileSave((key) => read(storage, key));
  downloadFile(new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' }), FILE_NAME);
}

/** The entries of a save file the player chose; null when it is not a save of the game. */
export async function openProfileSave(file: Blob): Promise<Record<string, string> | null> {
  try {
    return readProfileSave(await file.text());
  } catch (error) {
    console.error('The save could not be read', error);
    return null;
  }
}

/**
 * Puts a save in the place of this browser's profile: what the save does not carry is forgotten, so that nothing of
 * the profile before remains. True when it is done; the page must then be loaded again.
 */
export function restoreProfileSave(entries: Record<string, string>): boolean {
  const storage = window.localStorage;
  try {
    for (const key of PROFILE_SAVE_KEYS) {
      if (key in entries) storage.setItem(key, entries[key]);
      else storage.removeItem(key);
    }
    return true;
  } catch (error) {
    console.error('The save could not be restored', error);
    return false;
  }
}
