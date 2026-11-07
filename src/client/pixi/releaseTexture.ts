import type { Texture } from 'pixi.js';

/** Long enough for the renderer to have drawn a frame without it, and unbound it from its last shader. */
const AFTER_MS = 250;

/**
 * Destroys a texture made for one effect (a medallion's snapshot) once nothing draws it any more: destroyed at once, it
 * would still be bound to the shader of the pieces just removed.
 */
export function releaseTexture(texture: Texture): void {
  window.setTimeout(() => texture.destroy(true), AFTER_MS);
}
