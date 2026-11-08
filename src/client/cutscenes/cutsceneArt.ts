import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';

/** The drawn sets and props of the cutscenes (src/client/cutscenes/art), as served URLs. */
const DECOR_FILES = import.meta.glob('./art/decors/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const PROP_FILES = import.meta.glob('./art/accessoires/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

export interface DecorArt {
  /** Behind the puppets: a drawn set, or one of the game's TV sets. Null: nothing drawn yet. */
  back: string | null;
  /** In front of them, when the set has one (the front panel of the castelet). */
  front: string | null;
}

/** A set of the cutscenes: drawn for them, or a TV set of the game, whose picture is in the manifest. */
export function decorArt(manifest: GameManifest, decor: string): DecorArt {
  const drawn = DECOR_FILES[`./art/decors/${decor}.svg`];
  const front = DECOR_FILES[`./art/decors/${decor}-avant.svg`] ?? null;
  if (drawn) return { back: drawn, front };
  const studio = manifest.plateaux[decor]?.decor;
  return { back: studio ? assetUrl(studio) : null, front };
}

/** The picture of a prop, or null when it is not drawn yet. */
export function propArt(type: string): string | null {
  return PROP_FILES[`./art/accessoires/${type}.svg`] ?? null;
}
