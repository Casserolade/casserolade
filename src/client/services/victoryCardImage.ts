import { VICTORY_CARD } from '#src/client/const/victoryCard.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { drawVictoryCard } from '#src/client/tools/drawVictoryCard.ts';
import type { VictoryCardModel } from '#src/client/tools/victoryCardModel.ts';
import type { Camp } from '#src/engine/types.ts';

const LOGO = 'logo/casserolade.webp';
/** The fonts the card writes with: asked for before drawing, or the canvas falls back on the system's. */
const FONTS = ['400 40px Bangers', '700 24px "Alegreya Sans"', 'italic 700 24px "Alegreya Sans"'];

/** A picture of the game, loaded; null when it does not come: the card is drawn without it. */
function loadImage(path: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      console.error('The victory card misses a picture', path);
      resolve(null);
    };
    image.src = assetUrl(path);
  });
}

async function loadFonts(): Promise<void> {
  try {
    await Promise.all(FONTS.map((font) => document.fonts.load(font)));
  } catch (error) {
    console.error('The victory card could not load its fonts', error);
  }
}

/** A colour of the theme (tokens.css), so that the card and the game never drift apart. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Draws the victory card on this canvas, sized for it: loads its pictures and its fonts first. A picture that does
 * not come leaves its place empty; the card is drawn anyway.
 */
export async function renderVictoryCard(canvas: HTMLCanvasElement, card: VictoryCardModel): Promise<void> {
  const paths = [...new Set([LOGO, card.backdrop, card.hero?.atlas, ...card.board.map((m) => m.art?.atlas)].filter((path): path is string => Boolean(path)))];
  const [images] = await Promise.all([Promise.all(paths.map(loadImage)), loadFonts()]);
  const loaded = new Map(paths.map((path, index) => [path, images[index]]));
  canvas.width = VICTORY_CARD.width;
  canvas.height = VICTORY_CARD.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  drawVictoryCard(ctx, card, {
    image: (path) => (path ? (loaded.get(path) ?? null) : null),
    campColor: (camp: Camp) => token(`--camp-${camp}`),
    title: token('--color-title'),
    ink: token('--color-ink'),
    polls: token('--color-polls-icon'),
  });
}
