/** What the home screen suggests in the empty field: a player who types nothing plays under it. */
export const DEFAULT_PSEUDO = 'Sans étiquette';
const MAX_PSEUDO_LENGTH = 24;

/** The pseudo sent to the server: never empty, which the protocol refuses. */
export function pseudoOrDefault(typed: string): string {
  return typed.trim().slice(0, MAX_PSEUDO_LENGTH).trim() || DEFAULT_PSEUDO;
}
