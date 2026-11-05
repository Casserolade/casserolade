import { assetUrl } from '#src/client/tools/assetUrl.ts';

/** A line of the game, with where it was said. `id` is the card, hero or host who says it. */
export interface LineSource { id: string; qui: string; texte: string; date: string; contexte: string; sources: string[] }
/** A casserole: the public fact it laughs at, dated. `personne` is the card it belongs to. */
export interface CasseroleSource { id: string; personne: string; qui: string; nom: string; citation: string; fait: string; statut: string }
/** A real voice: the words, and the recording they come from. */
export interface VoiceSource { nom: string; phrase: string; personne: string; casserole: string; auteur: string; source: string; date: string }
/** A photo: a face of `personne`, or the illustration of `casserole`. */
export interface PhotoSource { nom: string; personne: string; casserole: string; auteur: string; licence: string; source: string }

/** assets/game/sources.json, written by tools/sources/genere_sources.ts. */
export interface GameSources {
  genere: string;
  phrases: LineSource[];
  casseroles: CasseroleSource[];
  voix: VoiceSource[];
  photos: PhotoSource[];
  logos: { id: string; source?: string; licence?: string; auteur?: string }[];
  polices: { nom: string; licence: string }[];
}

/** Every source of the game, or null when the file cannot be read: the pages then show their cards without them. */
export async function loadSources(): Promise<GameSources | null> {
  try {
    const response = await fetch(assetUrl('sources.json'));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as GameSources;
  } catch (error) {
    console.error('Sources not loaded', error);
    return null;
  }
}
