import type { Camp } from '#src/engine/types.ts';

/** The manifest calls the "civile" camp of the game data "societe_civile". */
export function campArtKey(camp: Camp): string {
  return camp === 'civile' ? 'societe_civile' : camp;
}
