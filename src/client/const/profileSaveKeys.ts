/** The key of a profile save that holds the player's key: without it, a file is not a save. */
export const PLAYER_SAVE_KEY = 'casserolade.joueur';

/**
 * What a browser keeps that makes a player's profile, and that a save carries to another browser: the key the server
 * rates the player by, the pseudo, the achievements and the title shown, the last rating seen, the career.
 * The settings (sound, effects, speed) stay with the device.
 */
export const PROFILE_SAVE_KEYS: readonly string[] = [
  PLAYER_SAVE_KEY,
  'casserolade.pseudo',
  'casserolade.progres',
  'casserolade.titre',
  'casserolade.cote',
  'plateau.campagne',
];
