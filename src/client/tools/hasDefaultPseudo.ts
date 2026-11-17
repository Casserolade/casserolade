import { DEFAULT_PSEUDO } from '#src/client/tools/pseudoOrDefault.ts';

/**
 * This pseudo is the one given to whoever chose none, alone or numbered when several share a room (« Sans étiquette »,
 * « Sans étiquette 2 »): its player is asked to choose one.
 */
export function hasDefaultPseudo(pseudo: string): boolean {
  if (pseudo === DEFAULT_PSEUDO) return true;
  return pseudo.startsWith(`${DEFAULT_PSEUDO} `) && /^\d+$/.test(pseudo.slice(DEFAULT_PSEUDO.length + 1));
}
