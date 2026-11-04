import { Assets, Rectangle, Texture } from 'pixi';
import { sliceSheet } from '/tools/graphisme/demo/rig/effect_player.js';

const ASSETS_ROOT = '/assets/game/';
const SHEET_EFFECTS = ['masse_100t', 'oiseaux', 'immunite', 'prison', 'polemique', 'retour', 'dore'];

function assetUrl(relativePath) {
  return ASSETS_ROOT + relativePath;
}

function cutPiece(sheet, { x, y, w, h }) {
  return new Texture({ source: sheet.source, frame: new Rectangle(x, y, w, h) });
}

async function loadTextureMap(paths) {
  const entries = await Promise.all(Object.entries(paths).map(
    async ([key, path]) => [key, await Assets.load(assetUrl(path))]));
  return Object.fromEntries(entries);
}

async function loadEffectFrames(effectIds, effects) {
  const entries = await Promise.all(effectIds.map(async (id) => {
    const sheet = await Assets.load(assetUrl(effects[id].atlas));
    return [id, sliceSheet(sheet, effects[id])];
  }));
  return Object.fromEntries(entries);
}

async function loadCharacter(description) {
  const sheet = await Assets.load(assetUrl(description.atlas));
  return { head: cutPiece(sheet, description.pieces.tete), jaw: cutPiece(sheet, description.pieces.machoire) };
}

/** Loads everything the demo draws, as described by manifest.json (contract 1). */
export async function loadGameAssets(characterIds) {
  const manifest = await (await fetch(assetUrl('manifest.json'))).json();
  const { cadres, attaque, pv, bandeau, fond_art: artBackground } = manifest.carte;
  const characterEntries = await Promise.all(characterIds.map(
    async (id) => [id, await loadCharacter(manifest.personnages[id])]));
  return {
    manifest,
    characters: Object.fromEntries(characterEntries),
    bodies: await loadTextureMap(manifest.corps),
    eyes: await loadTextureMap(manifest.yeux),
    frames: await loadTextureMap(cadres),
    parts: await loadTextureMap({ attaque, pv, bandeau, fond_art: artBackground }),
    star: await Assets.load(assetUrl(manifest.effets.etoile.image)),
    set: await Assets.load(assetUrl(manifest.plateaux.tf1_second_tour.decor)),
    plaster: await Assets.load(assetUrl(manifest.effets.pansement.image)),
    effectFrames: await loadEffectFrames(SHEET_EFFECTS, manifest.effets),
    soundUrl: (kind, id) => assetUrl(manifest.sons[kind][id]),
  };
}
