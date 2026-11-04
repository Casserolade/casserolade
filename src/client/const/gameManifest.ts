/** What assets/game/manifest.json describes (contract 1). Every part may be missing. */
export interface AtlasPiece {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CharacterArt {
  atlas: string;
  pieces: {
    tete: AtlasPiece;
    machoire: AtlasPiece & { pose: [number, number]; pivot: [number, number] };
  };
  ancres: {
    oeil_g: [number, number, number];
    oeil_d: [number, number, number];
    bouche: [number, number];
    menton: [number, number];
  };
}

export interface EffectArt {
  atlas?: string;
  image?: string;
  cols?: number;
  rows?: number;
  images?: number;
  cell?: [number, number];
  fps?: number;
  ancre?: [number, number];
  impact?: number;
  boucle?: boolean;
  tient?: boolean;
}

export interface GameManifest {
  camps: Record<string, { nom: string; couleur: string }>;
  personnages: Record<string, CharacterArt>;
  corps: Record<string, string>;
  yeux: Record<string, string>;
  effets: Record<string, EffectArt>;
  plateaux: Record<string, { decor: string; jingle?: string }>;
  sons: { citations?: Record<string, string>; bruitages?: Record<string, string> };
  carte: {
    cadres?: Record<string, string>;
    attaque?: string;
    pv?: string;
    bandeau?: string;
    fond_art?: string;
    console?: string;
    arche?: string;
    /** Small icons: one per keyword, one per kind of casserole. */
    [icon: `mot_cle_${string}` | `casserole_${string}` | `jeton_${string}`]: string | undefined;
  };
}

export const EMPTY_MANIFEST: GameManifest = {
  camps: {},
  personnages: {},
  corps: {},
  yeux: {},
  effets: {},
  plateaux: {},
  sons: {},
  carte: {},
};
