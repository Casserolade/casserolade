import { Texture } from 'pixi.js';
import { MEDALLION_LAYOUT } from '#src/client/const/medallionLayout.ts';

/**
 * The canvas the combat medallion is drawn on, once per look, from the same values as MedallionToken.vue (5 November
 * 2026: the combat drew a flat copy of its own, and the two drifted apart). A texture covers the medallion and a
 * margin for its glows: place it at (-MARGIN, -MARGIN), scaled by 1 / RESOLUTION.
 * Canvas shadows ignore the context's scale: their blur and offset are in device pixels, hence × MEDALLION_RESOLUTION.
 */
export const MEDALLION_MARGIN = 34;
export const MEDALLION_RESOLUTION = 2;
/** A CSS radial-gradient reaches 100 % at the box's farthest corner: past the ellipse, at √2 of its radius. */
export const FARTHEST_CORNER = Math.SQRT2;

const { width: W, height: H } = MEDALLION_LAYOUT;
const MEDALLION_BOX = { width: W + 2 * MEDALLION_MARGIN, height: H + 2 * MEDALLION_MARGIN, originX: MEDALLION_MARGIN, originY: MEDALLION_MARGIN };

const cache = new Map<string, Texture>();

/**
 * A texture drawn once and kept: `draw` works in the medallion's units, from its top left corner. `box` is the canvas
 * in those units and where the medallion's corner sits in it; by default, the medallion and its margin.
 */
export function cachedTexture(key: string, draw: (ctx: CanvasRenderingContext2D) => void, box = MEDALLION_BOX): Texture {
  const known = cache.get(key);
  if (known) return known;
  const canvas = document.createElement('canvas');
  canvas.width = box.width * MEDALLION_RESOLUTION;
  canvas.height = box.height * MEDALLION_RESOLUTION;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(MEDALLION_RESOLUTION, MEDALLION_RESOLUTION);
  ctx.translate(box.originX, box.originY);
  draw(ctx);
  const texture = Texture.from(canvas);
  cache.set(key, texture);
  return texture;
}

/** The medallion's ellipse, this far inside its box (negative: outside). */
export function ellipsePath(ctx: CanvasRenderingContext2D, inset: number): void {
  ctx.beginPath();
  ctx.ellipse(W / 2, H / 2, W / 2 - inset, H / 2 - inset, 0, 0, Math.PI * 2);
}
