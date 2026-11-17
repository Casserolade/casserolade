/**
 * The public rooms, as the home page lists them (GET /salons): rooms their host opened to anyone, under a name. What
 * is said of each is what its own players see: its name, its host's pseudo, how many sit there. No id, no address.
 */
export const PUBLIC_ROOMS_PATH = '/salons';
/** The longest name of a public room, in characters. */
export const NOM_SALON_LONGUEUR = 32;
/** A public room counts as new this long after it was created. */
export const SALON_NOUVEAU_MS = 2 * 60_000;
/** The home page lists this many public rooms at most. */
export const SALONS_AFFICHES = 30;

export interface SalonPublic {
  /** What `rejoindre` takes: a public room hides nothing. */
  code: string;
  nom: string;
  /** The host's pseudo. */
  hote: string;
  /** The humans in the room, out of `places` seats. */
  joueurs: number;
  places: number;
  /** Its game is on, at this round (0: the heroes are being chosen); null between two games, when one may walk in. */
  manche: number | null;
  /** Opened a moment ago: the list says so, for whoever looks for a table that is filling up. */
  nouveau?: true;
}
