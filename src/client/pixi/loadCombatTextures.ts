import { Assets, Rectangle, Texture } from 'pixi.js';
import type { CharacterArt, GameManifest } from '#src/client/const/gameManifest.ts';
import { sliceSheet } from '#src/client/pixi/sheetEffect.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';

export interface FaceTextures {
  head: Texture;
  jaw: Texture;
}

export interface CharacterTextures extends FaceTextures {
  /** Its other faces, by name: `rire`, `aie`. A face whose image is missing is left out. */
  faces: Record<string, FaceTextures>;
}

export interface CombatTextures {
  frames: Record<string, Texture>;
  art: Texture | null;
  ribbon: Texture | null;
  attack: Texture | null;
  health: Texture | null;
  bodies: Record<string, Texture>;
  eyes: Record<string, Texture>;
  star: Texture | null;
  plaster: Texture | null;
  effects: Record<string, Texture[]>;
  characters: Record<string, CharacterTextures>;
  /** The casseroles hanging under a medallion, by kind: affaire, ridicule. */
  pans: Record<string, Texture>;
  /** The microphone on the Porte-parole's lectern. */
  mic: Texture | null;
}

/** One texture, or nothing: a missing asset must never stop a combat (contract 1). */
async function loadTexture(path: string | undefined): Promise<Texture | null> {
  if (!path) return null;
  try {
    return await Assets.load<Texture>(assetUrl(path));
  } catch (error) {
    console.error('Asset failed to load', path, error);
    return null;
  }
}

async function loadTextureMap(paths: Record<string, string>): Promise<Record<string, Texture>> {
  const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await loadTexture(path)] as const));
  return Object.fromEntries(entries.filter((entry): entry is [string, Texture] => entry[1] !== null));
}

function cutPiece(sheet: Texture, { x, y, w, h }: { x: number; y: number; w: number; h: number }): Texture {
  return new Texture({ source: sheet.source, frame: new Rectangle(x, y, w, h) });
}

async function loadFace(art: Omit<CharacterArt, 'visages'>): Promise<FaceTextures | null> {
  const sheet = await loadTexture(art.atlas);
  return sheet && { head: cutPiece(sheet, art.pieces.tete), jaw: cutPiece(sheet, art.pieces.machoire) };
}

async function loadFaces(art: CharacterArt): Promise<Record<string, FaceTextures>> {
  const entries = await Promise.all(Object.entries(art.visages ?? {}).map(async ([name, face]) => [name, await loadFace(face)] as const));
  return Object.fromEntries(entries.filter((entry): entry is [string, FaceTextures] => entry[1] !== null));
}

async function loadCharacters(manifest: GameManifest, ids: string[]): Promise<Record<string, CharacterTextures>> {
  const known = [...new Set(ids)].filter((id) => manifest.personnages[id]);
  const entries = await Promise.all(known.map(async (id) => {
    const art = manifest.personnages[id];
    const [face, faces] = await Promise.all([loadFace(art), loadFaces(art)]);
    return [id, face && { ...face, faces }] as const;
  }));
  return Object.fromEntries(entries.filter((entry): entry is [string, CharacterTextures] => entry[1] !== null));
}

/**
 * Sheets the manifest still lists but the combat never plays: the prison of the old rules (the
 * graphics demo still uses it), the golden shine, drawn in CSS on the cards, and the objects that
 * fell on politicians (anvil, piano…), retired on 3 November 2026: politicians go out in light.
 */
const UNPLAYED_EFFECTS = new Set(['prison', 'dore', 'masse_100t', 'mort_casserole', 'mort_coffre_fort', 'mort_enclume', 'mort_piano']);
const UNUSED_BODIES = new Set(['prison']);

async function loadEffects(manifest: GameManifest): Promise<Record<string, Texture[]>> {
  const sheets = Object.entries(manifest.effets).filter(([name, art]) => art.atlas && !UNPLAYED_EFFECTS.has(name));
  const entries = await Promise.all(sheets.map(async ([key, art]) => {
    const sheet = await loadTexture(art.atlas);
    return [key, sheet ? sliceSheet(sheet, art) : null] as const;
  }));
  return Object.fromEntries(entries.filter((entry): entry is [string, Texture[]] => entry[1] !== null));
}

/** Everything a combat draws, as described by manifest.json. Characters are the only part that depends on the combat. */
export async function loadCombatTextures(manifest: GameManifest, characterIds: string[]): Promise<CombatTextures> {
  const { cadres = {}, fond_art: artBackground, bandeau, attaque, pv } = manifest.carte;
  const panPaths = Object.fromEntries((['affaire', 'ridicule'] as const).flatMap((kind) => {
    const path = manifest.carte[`casserole_${kind}`];
    return path ? [[kind, path]] : [];
  }));
  const [frames, art, ribbon, attack, health, bodies, eyes, star, plaster, effects, characters, pans, mic] = await Promise.all([
    loadTextureMap(cadres),
    loadTexture(artBackground),
    loadTexture(bandeau),
    loadTexture(attaque),
    loadTexture(pv),
    loadTextureMap(Object.fromEntries(Object.entries(manifest.corps).filter(([camp]) => !UNUSED_BODIES.has(camp)))),
    loadTextureMap(manifest.yeux),
    loadTexture(manifest.effets.etoile?.image),
    loadTexture(manifest.effets.pansement?.image),
    loadEffects(manifest),
    loadCharacters(manifest, characterIds),
    loadTextureMap(panPaths),
    loadTexture(manifest.carte.mot_cle_porte_parole),
  ]);
  return { frames, art, ribbon, attack, health, bodies, eyes, star, plaster, effects, characters, pans, mic };
}
